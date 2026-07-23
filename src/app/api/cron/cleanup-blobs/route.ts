import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { list, del } from "@vercel/blob";

// Automated Vercel Cron Job — Runs daily in background
// Safely deletes orphaned files older than 24 hours that are NOT referenced in DB
export async function GET(req: NextRequest) {
  try {
    // 1. Verify authorization header for Vercel Cron or Admin secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow internal dev run if CRON_SECRET is not set
      if (process.env.CRON_SECRET) {
        return NextResponse.json({ success: false, message: "Unauthorized cron request." }, { status: 401 });
      }
    }

    // 2. Fetch all active file URLs from database
    const [semesterUrls, internshipUrls] = await Promise.all([
      prisma.semesterReport.findMany({
        where: { fileUrl: { not: null } },
        select: { fileUrl: true },
      }),
      prisma.internship.findMany({
        where: { fileUrl: { not: null } },
        select: { fileUrl: true },
      }),
    ]);

    // Includes ALL semesters (PENDING, VERIFIED, REJECTED) and ALL internships (PENDING & VERIFIED)
    const activeUrls = new Set<string>();

    [...semesterUrls, ...internshipUrls].forEach((item) => {
      if (item.fileUrl) {
        activeUrls.add(item.fileUrl);
        try {
          activeUrls.add(decodeURI(item.fileUrl));
          activeUrls.add(encodeURI(decodeURI(item.fileUrl)));
          activeUrls.add(decodeURIComponent(item.fileUrl));
        } catch (e) {}
      }
    });

    // 3. List all files currently in Vercel Blob Cloud Storage
    const allBlobs: { url: string; uploadedAt: Date }[] = [];
    let cursor: string | undefined;

    do {
      const result = await list({ cursor, limit: 1000 });
      allBlobs.push(...result.blobs);
      cursor = result.cursor;
    } while (cursor);

    // 4. Filter orphaned files: Must be older than 24 hours AND not in DB
    const now = new Date().getTime();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    const safeOrphans = allBlobs.filter((blob) => {
      const isNotUsedInDb = !activeUrls.has(blob.url);
      const isOlderThan24h = now - new Date(blob.uploadedAt).getTime() > TWENTY_FOUR_HOURS;
      return isNotUsedInDb && isOlderThan24h;
    });

    // 5. Delete safe orphans in batches
    if (safeOrphans.length > 0) {
      await Promise.all(safeOrphans.map((b) => del(b.url)));
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalStorageBlobs: allBlobs.length,
      activeDbFiles: activeUrls.size,
      cleanedOrphansCount: safeOrphans.length,
      message: `Automated cleanup complete: Removed ${safeOrphans.length} unused files safely.`,
    });
  } catch (error: any) {
    console.error("Automated blob cleanup cron error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Cron job failed." },
      { status: 500 }
    );
  }
}
