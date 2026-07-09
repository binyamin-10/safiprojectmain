import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

// GET /api/internships - Fetch all internships of the current logged-in student
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    const internships = await (prisma as any).internship.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, internships });
  } catch (error: any) {
    console.error("Fetch internships error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch internships." },
      { status: 500 }
    );
  }
}

// POST /api/internships - Upload a new internship
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const courseName = formData.get("courseName") as string | null;
    const hoursStr = formData.get("hours") as string | null;
    const file = formData.get("certificate") as File | null;

    if (!courseName || !hoursStr || !file) {
      return NextResponse.json(
        { success: false, message: "Course name, hours, and certificate are required." },
        { status: 400 }
      );
    }

    const hours = parseInt(hoursStr);
    if (isNaN(hours) || hours <= 0) {
      return NextResponse.json(
        { success: false, message: "Hours must be a valid positive integer." },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;

    // Upload certificate to Vercel Blob
    const uniqueFilename = `internship-${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.name}`;
    const blob = await put(uniqueFilename, file, { access: 'private' });
    const fileUrl = blob.url;

    // Save record to DB
    const internship = await (prisma as any).internship.create({
      data: {
        courseName,
        hours,
        fileName: file.name,
        fileUrl,
        userId,
        isVerified: false, // Must be audited/verified by faculty
      },
    });

    return NextResponse.json({
      success: true,
      message: "Internship uploaded successfully! Pending faculty audit.",
      internship,
    });
  } catch (error: any) {
    console.error("Upload internship error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "An error occurred while uploading internship." },
      { status: 500 }
    );
  }
}
