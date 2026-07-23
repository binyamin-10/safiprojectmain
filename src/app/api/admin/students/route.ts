import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * PATCH /api/admin/students
 * Allows Faculty / Admin to correct a student's Register No, Name, Batch, or Password (DOB).
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { studentId, registerNo, name, batch, password, dob } = body;

    if (!studentId || !registerNo || !name) {
      return NextResponse.json(
        { success: false, message: "Student ID, Register Number, and Name are required." },
        { status: 400 }
      );
    }

    const regNoTrimmed = registerNo.trim();

    // Check if new registerNo is already taken by another student
    const existingUser = await prisma.user.findFirst({
      where: {
        registerNo: regNoTrimmed,
        NOT: { id: studentId },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: `Register number '${regNoTrimmed}' is already assigned to another student.` },
        { status: 400 }
      );
    }

    const updateData: any = {
      registerNo: regNoTrimmed,
      name: name.trim(),
      batch: batch ? batch.trim() : null,
      dob: dob ? dob.trim() : null,
    };

    const newAuthPass = dob || password;
    if (newAuthPass && newAuthPass.trim()) {
      updateData.password = bcrypt.hashSync(newAuthPass.trim(), 10);
    }

    const updatedStudent = await prisma.user.update({
      where: { id: studentId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Student profile updated successfully.",
      student: updatedStudent,
    });
  } catch (error: any) {
    console.error("Update student profile error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred while updating the student profile." },
      { status: 500 }
    );
  }
}
