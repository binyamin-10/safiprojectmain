import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const GRADE_POINTS: Record<string, number> = {
  O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, P: 4, F: 0,
};

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admins only" },
        { status: 401 }
      );
    }

    const { updates, subjectUpdates } = await req.json();

    if ((!updates || !Array.isArray(updates)) && (!subjectUpdates || !Array.isArray(subjectUpdates))) {
      return NextResponse.json(
        { success: false, message: "Invalid payload: updates or subjectUpdates array required" },
        { status: 400 }
      );
    }

    // 1. Update APC values using batched promises
    if (updates && Array.isArray(updates)) {
      await Promise.all(
        updates.map((update: any) =>
          prisma.semesterReport.update({
            where: { id: update.reportId },
            data: { apc: update.apc || null } as any,
          })
        )
      );
    }

    // 2. Update specific subject grades sequentially
    if (subjectUpdates && Array.isArray(subjectUpdates)) {
      const affectedReportIds = new Set<string>();

      for (const subUpdate of subjectUpdates) {
        const { id: subjectGradeId, grade } = subUpdate;
        if (!subjectGradeId || !grade) continue;

        const oldSubject = await prisma.subjectGrade.findUnique({
          where: { id: subjectGradeId },
        });

        if (!oldSubject) continue;

        const gradePoint = GRADE_POINTS[grade.toUpperCase().trim()] ?? 0;
        const creditPoint = oldSubject.credits * gradePoint;
        const status = grade.toUpperCase().trim() === "F" ? "Fail" : "Pass";

        await prisma.subjectGrade.update({
          where: { id: subjectGradeId },
          data: {
            grade: grade.toUpperCase().trim(),
            gradePoint,
            creditPoint,
            status,
          },
        });

        affectedReportIds.add(oldSubject.semesterReportId);
      }

      // 3. Recalculate SGPA, Status, Overall Grade for each affected Semester Report
      for (const reportId of affectedReportIds) {
        const allSubjects = await prisma.subjectGrade.findMany({
          where: { semesterReportId: reportId },
        });

        if (allSubjects.length === 0) continue;

        let totalCreditPoints = 0;
        let totalCredits = 0;
        let hasFailedSubject = false;

        for (const sub of allSubjects) {
          totalCreditPoints += sub.creditPoint;
          totalCredits += sub.credits;
          if (sub.grade === "F") {
            hasFailedSubject = true;
          }
        }

        const sgpa = totalCredits > 0 ? parseFloat((totalCreditPoints / totalCredits).toFixed(3)) : 0;
        const reportStatus = hasFailedSubject ? "Fail" : "Pass";

        let overallGrade = "F";
        if (!hasFailedSubject) {
          if      (sgpa >= 9.5) overallGrade = "O";
          else if (sgpa >= 8.5) overallGrade = "A+";
          else if (sgpa >= 7.5) overallGrade = "A";
          else if (sgpa >= 6.5) overallGrade = "B+";
          else if (sgpa >= 5.5) overallGrade = "B";
          else if (sgpa >= 4.5) overallGrade = "C";
          else if (sgpa >= 4.0) overallGrade = "P";
          else                  overallGrade = "F";
        }

        const updatedReport = await prisma.semesterReport.update({
          where: { id: reportId },
          data: { sgpa, status: reportStatus, overallGrade },
        });

        // 4. Recalculate CGPA across all student semesters
        const studentReports = await prisma.semesterReport.findMany({
          where: { userId: updatedReport.userId },
        });

        let totalSgpaSum = 0;
        studentReports.forEach((r) => { totalSgpaSum += r.sgpa; });
        const updatedCgpa = parseFloat((totalSgpaSum / studentReports.length).toFixed(3));

        await prisma.semesterReport.updateMany({
          where: { userId: updatedReport.userId },
          data: { cgpa: updatedCgpa },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "APC and Subject Grades updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating APCs and grades:", error);
    return NextResponse.json(
      { success: false, message: `Failed to update APC and Grade records: ${error.message || error}` },
      { status: 500 }
    );
  }
}
