import { NextRequest, NextResponse } from "next/server";

import { callBackend } from "@/lib/server/backend";
import { validateCsrfRequest } from "@/lib/server/csrf";
import {
  clearSessionCookies,
  refreshCookieName,
} from "@/lib/server/session-cookies";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrfRequest(request);
  if (csrfError) return csrfError;

  const refreshToken = request.cookies.get(refreshCookieName)?.value;
  if (refreshToken) {
    try {
      const upstream = await callBackend("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!upstream.ok) {
        return NextResponse.json({ detail: "Unable to end the session" }, { status: 503 });
      }
    } catch {
      return NextResponse.json({ detail: "Authentication service unavailable" }, { status: 503 });
    }
  }
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response);
  return response;
}
