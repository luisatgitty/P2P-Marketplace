import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = req.headers.get("user-agent") || "unknown";

  return NextResponse.json({ ipAddress, userAgent });
}
