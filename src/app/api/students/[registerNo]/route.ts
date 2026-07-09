import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/students/[registerNo]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ registerNo: string }> }
) {
  try {
    const { registerNo } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    const sessionRegNo = (session.user as any).registerNo;

    // Students can only access their own profiles; Admins can access any
    if (userRole !== "ADMIN" && sessionRegNo.toLowerCase() !== registerNo.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: "Forbidden access." },
        { status: 403 }
      );
    }

    const student = await (prisma.user as any).findFirst({
      where: {
        registerNo: {
          equals: registerNo,
        },
      },
      select: {
        id: true,
        registerNo: true,
        name: true,
        batch: true,
        createdAt: true,
        semesters: {
          include: {
            subjects: true,
          },
          orderBy: {
            semesterNumber: "asc",
          },
        },
        internships: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error("Fetch student detail error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred fetching student details." },
      { status: 500 }
    );
  }
}

// DELETE /api/students/[registerNo]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ registerNo: string }> }
) {
  try {
    const { registerNo } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const student = await prisma.user.findFirst({
      where: {
        registerNo: {
          equals: registerNo,
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student record not found." },
        { status: 404 }
      );
    }

    // Cascade delete is configured in Prisma schema, so deleting the user deletes all their reports/grades
    await prisma.user.delete({
      where: { id: student.id },
    });

    return NextResponse.json({
      success: true,
      message: "Student record and all associated academic data deleted successfully.",
    });
  } catch (error) {
    console.error("Delete student error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred deleting student record." },
      { status: 500 }
    );
  }
}

// PUT /api/students/[registerNo] (for admin verification)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ registerNo: string }> }
) {
  try {
    const { registerNo } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { semesterNumber, isVerified } = body;

    if (semesterNumber === undefined || isVerified === undefined) {
      return NextResponse.json(
        { success: false, message: "semesterNumber and isVerified are required." },
        { status: 400 }
      );
    }

    const student = await prisma.user.findFirst({
      where: { registerNo },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student record not found." },
        { status: 404 }
      );
    }

    const report = await prisma.semesterReport.findFirst({
      where: {
        userId: student.id,
        semesterNumber: parseInt(semesterNumber),
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, message: "Semester report not found." },
        { status: 404 }
      );
    }

    await prisma.semesterReport.update({
      where: { id: report.id },
      data: { isVerified: !!isVerified },
    });

    return NextResponse.json({
      success: true,
      message: `Semester ${semesterNumber} marks report verification status updated to ${isVerified}.`,
    });
  } catch (error) {
    console.error("Verify semester marks error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred verifying marks." },
      { status: 500 }
    );
  }
}
