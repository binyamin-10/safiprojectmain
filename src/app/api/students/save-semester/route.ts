import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { registerNo, semester, subjects, sgpa, overallGrade, status, fileName, fileUrl } = body;

    if (!semester || !subjects || !sgpa) {
      return NextResponse.json(
        { success: false, message: "Missing required details to save." },
        { status: 400 }
      );
    }

    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      return NextResponse.json(
        { success: false, message: "Invalid semester number." },
        { status: 400 }
      );
    }

    // Determine target student registerNo
    const userRole = (session.user as any).role;
    const targetRegNo = userRole === "ADMIN" ? registerNo : (session.user as any).registerNo;

    if (!targetRegNo) {
      return NextResponse.json(
        { success: false, message: "Register number is required." },
        { status: 400 }
      );
    }

    // Find student in DB
    const student = await prisma.user.findUnique({
      where: { registerNo: targetRegNo },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student profile not found." },
        { status: 404 }
      );
    }

    // Verify or Save logic
    // We execute inside a transaction to ensure data integrity
    const savedReport = await prisma.$transaction(async (tx: any) => {
      // 1. Delete existing semester report and related subject grades if they exist
      const existingReport = await tx.semesterReport.findFirst({
        where: {
          userId: student.id,
          semesterNumber: semesterNum,
        },
      });

      if (existingReport) {
        if (existingReport.fileUrl && existingReport.fileUrl.includes('.vercel-storage.com')) {
          try {
            const { del } = await import('@vercel/blob');
            await del(existingReport.fileUrl);
          } catch (e) {
            console.error("Failed to delete old blob:", e);
          }
        }
        await tx.subjectGrade.deleteMany({
          where: { semesterReportId: existingReport.id },
        });
        await tx.semesterReport.delete({
          where: { id: existingReport.id },
        });
      }

      // 2. Create new semester report
      // CGPA will be updated next. For now, set to SGPA.
      const report = await tx.semesterReport.create({
        data: {
          semesterNumber: semesterNum,
          sgpa: parseFloat(sgpa),
          cgpa: parseFloat(sgpa),
          overallGrade: overallGrade || "B+",
          status: status || "Pass",
          fileName: fileName || null,
          fileUrl: fileUrl || null,
          isVerified: userRole === "ADMIN", // If admin saves/edits, it is verified automatically.
          userId: student.id,
        },
      });

      // 3. Create the subject grade records
      const subjectData = subjects.map((sub: any) => ({
        subjectCode: sub.code || sub.subjectCode || "",
        subjectName: sub.name || sub.subjectName || "",
        grade: sub.grade || "F",
        gradePoint: parseFloat(sub.gradePoint || 0),
        credits: parseFloat(sub.credits || 0),
        creditPoint: parseFloat(sub.creditPoint || 0),
        status: sub.status || "Pass",
        semesterReportId: report.id,
      }));

      await tx.subjectGrade.createMany({
        data: subjectData,
      });

      // 4. Retrieve all semester reports for this student to re-calculate running CGPA
      const allReports = await tx.semesterReport.findMany({
        where: { userId: student.id },
      });

      // Simple average of SGPAs as per Calicut University legacy code
      let totalSgpaSum = 0;
      allReports.forEach((r: any) => {
        totalSgpaSum += r.sgpa;
      });
      const updatedCgpa = parseFloat((totalSgpaSum / allReports.length).toFixed(3));

      // Update CGPA in the database for ALL semesters to keep it consistent
      // (or just update the current one, but keeping all updated is cleaner)
      await tx.semesterReport.update({
        where: { id: report.id },
        data: { cgpa: updatedCgpa },
      });

      return report;
    });

    return NextResponse.json({
      success: true,
      message: `Semester ${semesterNum} report details successfully saved!`,
      reportId: savedReport.id,
    });
  } catch (error: any) {
    console.error("Save semester marks error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "An error occurred while saving marks." },
      { status: 500 }
    );
  }
}
