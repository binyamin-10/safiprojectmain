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

    let targetUrl = url;

    // Fix double-URL encoding issue (%2520 -> %20)
    while (targetUrl.includes("%25")) {
      try {
        targetUrl = decodeURIComponent(targetUrl);
      } catch (e) {
        break;
      }
    }

    // Fetch the blob using the server-side read/write token
    let blobResponse = await fetch(targetUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    // Fallback: If 404, try decodeURI or re-encode URI in case spaces or special characters mismatched
    if (!blobResponse.ok && blobResponse.status === 404) {
      try {
        const decoded = decodeURI(targetUrl);
        if (decoded !== targetUrl) {
          const res2 = await fetch(decoded, {
            headers: {
              Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
            },
          });
          if (res2.ok) {
            blobResponse = res2;
          }
        }
      } catch (e) {}
    }

    if (!blobResponse.ok && blobResponse.status === 404) {
      try {
        const reEncoded = encodeURI(decodeURI(targetUrl));
        if (reEncoded !== targetUrl) {
          const res3 = await fetch(reEncoded, {
            headers: {
              Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
            },
          });
          if (res3.ok) {
            blobResponse = res3;
          }
        }
      } catch (e) {}
    }

    if (!blobResponse.ok) {
      if (blobResponse.status === 404) {
        return new NextResponse(
          `<html><body style="font-family: sans-serif; padding: 2rem; text-align: center; color: #1e293b;">
            <h2 style="color: #e11d48;">File Not Found (404)</h2>
            <p>The requested document could not be found in cloud storage.</p>
            <p style="color: #64748b; font-size: 0.9rem; max-width: 500px; margin: 1rem auto; line-height: 1.5;">
              This happens when the file was rejected/deleted by an admin or replaced during a re-upload.<br><br>
              <strong>How to fix:</strong> Ask the student to re-upload their marksheet PDF in their Student Portal (Semesters tab).
            </p>
          </body></html>`,
          {
            status: 404,
            headers: { "Content-Type": "text/html" },
          }
        );
      }
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
