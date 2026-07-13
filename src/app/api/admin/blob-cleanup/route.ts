import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { list, del } from "@vercel/blob";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // 1. List all blobs in Vercel Blob store
    const allBlobs: { url: string; pathname: string; size: number; uploadedAt: Date }[] = [];
    let cursor: string | undefined;

    do {
      const result = await list({ cursor, limit: 1000 });
      allBlobs.push(...result.blobs);
      cursor = result.cursor;
    } while (cursor);

    // 2. Get all fileUrls actually referenced in the DB
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

    const usedUrls = new Set<string>([
      ...semesterUrls.map((r) => r.fileUrl!),
      ...internshipUrls.map((i) => i.fileUrl!),
    ]);

    // 3. Find orphaned blobs (in Blob store but NOT in DB)
    const orphanedBlobs = allBlobs.filter((blob) => !usedUrls.has(blob.url));

    return NextResponse.json({
      success: true,
      totalBlobs: allBlobs.length,
      usedBlobs: usedUrls.size,
      orphanedCount: orphanedBlobs.length,
      orphaned: orphanedBlobs.map((b) => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      })),
    });
  } catch (error: any) {
    console.error("Blob audit error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to audit blobs" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { urls } = await req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ success: false, message: "No URLs provided" }, { status: 400 });
    }

    // Double-check none of the requested URLs are still referenced in DB before deleting
    const [semesterUrls, internshipUrls] = await Promise.all([
      prisma.semesterReport.findMany({
        where: { fileUrl: { in: urls } },
        select: { fileUrl: true },
      }),
      prisma.internship.findMany({
        where: { fileUrl: { in: urls } },
        select: { fileUrl: true },
      }),
    ]);

    const stillUsed = new Set<string>([
      ...semesterUrls.map((r) => r.fileUrl!),
      ...internshipUrls.map((i) => i.fileUrl!),
    ]);

    const safeToDelete = urls.filter((u: string) => !stillUsed.has(u));
    const skipped = urls.filter((u: string) => stillUsed.has(u));

    // Delete all safe orphans in parallel
    await Promise.all(safeToDelete.map((url: string) => del(url)));

    return NextResponse.json({
      success: true,
      deleted: safeToDelete.length,
      skipped: skipped.length,
      skippedUrls: skipped,
      message: `Deleted ${safeToDelete.length} orphaned file(s). Skipped ${skipped.length} file(s) still in use.`,
    });
  } catch (error: any) {
    console.error("Blob cleanup error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete blobs" },
      { status: 500 }
    );
  }
}
