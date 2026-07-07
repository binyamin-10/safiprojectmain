import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    // Retrieve all students
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
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
        },
      },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("Fetch students error:", error);
    return NextResponse.json(
      { success: false, message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
