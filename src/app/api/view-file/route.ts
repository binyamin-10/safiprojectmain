import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return new NextResponse("Missing url parameter", { status: 400 });
    }

    // Secure check: only allow URLs from the vercel-storage.com domain
    if (!url.includes("vercel-storage.com")) {
      return new NextResponse("Invalid URL domain", { status: 400 });
    }

    // Fetch the blob using the server-side read/write token
    const blobResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!blobResponse.ok) {
      return new NextResponse("Failed to retrieve file from storage", {
        status: blobResponse.status,
      });
    }

    // Stream the PDF/image inline to the browser
    return new NextResponse(blobResponse.body, {
      headers: {
        "Content-Type": blobResponse.headers.get("Content-Type") || "application/pdf",
        "Content-Disposition": "inline",
      },
    });
  } catch (error: any) {
    console.error("View file proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
