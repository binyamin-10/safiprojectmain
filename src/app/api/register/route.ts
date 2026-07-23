import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, registerNo, password, batch } = body;

    if (!name || !registerNo || !password) {
      return NextResponse.json(
        { success: false, message: "All fields are required." },
        { status: 400 }
      );
    }

    const regNoTrimmed = registerNo.trim();
    const nameTrimmed = name.trim();

    // Check if register number already exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: {
        registerNo: {
          equals: regNoTrimmed,
        },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Register Number is already registered." },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user
    await prisma.user.create({
      data: {
        registerNo: regNoTrimmed,
        name: nameTrimmed,
        password: hashedPassword,
        dob: password.trim(),
        role: "STUDENT",
        batch: batch ? batch.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Registration successful! You can now log in.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
