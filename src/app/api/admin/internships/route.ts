import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

// GET /api/admin/internships - Retrieve all internships for auditing (includes student user details)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const internships = await (prisma as any).internship.findMany({
      include: {
        user: {
          select: {
            name: true,
            registerNo: true,
            batch: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, internships });
  } catch (error: any) {
    console.error("Fetch all internships error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred fetching internships." },
      { status: 500 }
    );
  }
}

// PUT /api/admin/internships - Toggle verification status of an internship
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, isVerified } = body;

    if (!id || isVerified === undefined) {
      return NextResponse.json(
        { success: false, message: "Internship ID and isVerified status are required." },
        { status: 400 }
      );
    }

    const internship = await (prisma as any).internship.update({
      where: { id },
      data: { isVerified },
    });

    return NextResponse.json({
      success: true,
      message: `Internship verification status updated successfully.`,
      internship,
    });
  } catch (error: any) {
    console.error("Update internship verification error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update internship verification status." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/internships - Delete an internship record
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Internship ID is required." },
        { status: 400 }
      );
    }

    // Find the internship first to check for certificate file url
    const internship = await (prisma as any).internship.findUnique({
      where: { id },
    });

    if (!internship) {
      return NextResponse.json(
        { success: false, message: "Internship record not found." },
        { status: 404 }
      );
    }

    // Delete the certificate from Vercel Blob if exists
    if (internship.fileUrl && internship.fileUrl.includes('.vercel-storage.com')) {
      try {
        await del(internship.fileUrl);
      } catch (e) {
        console.error("Failed to delete certificate blob from Vercel storage:", e);
      }
    }

    await (prisma as any).internship.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Internship record and certificate file deleted successfully.",
    });
  } catch (error: any) {
    console.error("Delete internship error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred while deleting the internship." },
      { status: 500 }
    );
  }
}
