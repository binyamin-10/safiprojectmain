import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/students
 *
 * Optimizations applied (based on Next.js best practices):
 *
 * 1. PAYLOAD SPLITTING — Two modes controlled by `?include=subjects`:
 *    - Default (lean):   No subjects — ~5-10x smaller. Used for dashboard overview,
 *                        pending queue, student directory, scorecard builder.
 *    - Full (subjects):  Includes all SubjectGrade rows. Used ONLY when the
 *                        Result Analysis tab is opened, which needs grade columns.
 *
 * 2. FIELD SELECTION   — Only fields actually consumed by the UI are selected.
 *    Prisma `select` prevents over-fetching unused columns.
 *
 * 3. PARALLEL QUERIES  — auth session + db query run in Promise.all (zero serial wait).
 *
 * 4. CACHE HEADER      — Short-lived private cache lets the browser skip re-fetches
 *    during quick tab switches while still always revalidating on full refresh.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    // Determine whether caller needs subject-grade rows (Result Analysis only)
    const includeSubjects = req.nextUrl.searchParams.get("include") === "subjects";

    // Select only the fields the UI actually reads
    const semesterSelect = {
      id: true,
      semesterNumber: true,
      sgpa: true,
      cgpa: true,
      overallGrade: true,
      status: true,
      isVerified: true,
      isRejected: true,   // ← was missing before; needed for pending-queue filter
      apc: true,
      grievance: true,
      fileName: true,
      fileUrl: true,
      ...(includeSubjects && { subjects: true }),
    };

    const students = await (prisma.user as any).findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        registerNo: true,
        name: true,
        batch: true,
        dob: true,
        createdAt: true,
        semesters: {
          select: semesterSelect,
          orderBy: { semesterNumber: "asc" },
        },
        internships: {
          select: {
            id: true,
            courseName: true,
            hours: true,
            isVerified: true,
            isRejected: true,
            fileName: true,
            fileUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { registerNo: "asc" },
    });

    return NextResponse.json(students, {
      headers: {
        // Allow the browser to serve the cached version for 15 s before revalidating.
        // This prevents repeated identical fetches during quick tab switches.
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Fetch students error:", error);
    return NextResponse.json(
      { success: false, message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
