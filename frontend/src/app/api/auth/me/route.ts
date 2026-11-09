import { NextRequest, NextResponse } from "next/server";

import { callBackend } from "@/lib/server/backend";
import { accessCookieName } from "@/lib/server/session-cookies";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(accessCookieName)?.value;
  if (accessToken) {
    const meResponse = await callBackend("/api/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (meResponse.ok) return NextResponse.json({ user: await meResponse.json() });
    if (meResponse.status !== 401) {
      return NextResponse.json({ detail: "Authentication service unavailable" }, { status: 503 });
    }
  }

  return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
}
