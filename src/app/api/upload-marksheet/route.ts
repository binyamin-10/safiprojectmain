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

    // Upload to Vercel Blob
    const uniqueFilename = `marksheet-${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.name}`;
    const blob = await put(uniqueFilename, file, { access: 'private' });
    const fileUrl = blob.url;

    // Perform OCR processing
    const ocrResult = await processMarksheetOCR(buffer, semester);

    console.log("[ROUTE] ocrResult.subjects.length:", ocrResult.subjects.length);
    console.log("[ROUTE] ocrResult.rawText (first 600 chars):", ocrResult.rawText.substring(0, 600));
    console.log("[ROUTE] ocrResult.sgpa:", ocrResult.sgpa);

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
