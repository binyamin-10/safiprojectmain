import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { processMarksheetOCR } from "@/lib/ocr";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("marksheet") as File | null;
    const semesterStr = formData.get("semester") as string | null;
    const studentName = formData.get("studentName") as string | null;
    const registerNo = formData.get("registerNo") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file was uploaded." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { success: false, message: "Invalid file type. Only official PDF marksheets are accepted." },
        { status: 400 }
      );
    }

    if (!semesterStr) {
      return NextResponse.json(
        { success: false, message: "Semester number is required." },
        { status: 400 }
      );
    }

    const semester = parseInt(semesterStr);
    if (isNaN(semester) || semester < 1 || semester > 8) {
      return NextResponse.json(
        { success: false, message: "Invalid semester selected." },
        { status: 400 }
      );
    }

    // Convert file to buffer for OCR
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Perform OCR processing
    const ocrResult = await processMarksheetOCR(buffer, semester);

    // Validate that the document is from official SAFI Institute of Advanced Study
    const rawTextUpper = ocrResult.rawText.toUpperCase();
    const isSafi = rawTextUpper.includes("SAFI") || rawTextUpper.includes("SIAS") || rawTextUpper.includes("SAFI INSTITUTE OF ADVANCED STUDY");
    if (!isSafi) {
      return NextResponse.json(
        { success: false, message: "Only official marksheets from SAFI Institute of Advanced Study are accepted." },
        { status: 400 }
      );
    }

    // Sanitize filename to prevent space/encoding issues (%20 / %2520) in Vercel Blob storage
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFilename = `marksheet-${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizedOriginalName}`;
    const blob = await put(uniqueFilename, file, { access: 'private' });
    const fileUrl = blob.url;

    return NextResponse.json({
      success: true,
      message: "Marksheet scanned successfully.",
      ocrData: {
        ...ocrResult,
        studentName: studentName || ocrResult.studentName,
        registerNo: registerNo || ocrResult.registerNo,
        semester,
        fileName: file.name,
        fileUrl,
      },
    });
  } catch (error: any) {
    console.error("Marksheet upload and OCR error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "An error occurred during OCR scanning." },
      { status: 500 }
    );
  }
}
export const maxDuration = 60; // Next.js allows setting longer execution timeout on Vercel for OCR workers
