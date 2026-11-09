import { NextRequest, NextResponse } from "next/server";

import { callBackend, safeBackendError } from "@/lib/server/backend";
import { validateCsrfRequest } from "@/lib/server/csrf";
import {
  clearSessionCookies,
  refreshCookieName,
  setSessionCookies,
  type TokenBundle,
} from "@/lib/server/session-cookies";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrfRequest(request);
  if (csrfError) return csrfError;

  const refreshToken = request.cookies.get(refreshCookieName)?.value;
  if (!refreshToken) {
    const response = NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  const upstream = await callBackend("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!upstream.ok) {
    const response = (await safeBackendError(upstream)) as NextResponse;
    if (upstream.status === 401) clearSessionCookies(response);
    return response;
  }

  const bundle = (await upstream.json()) as TokenBundle;
  const response = NextResponse.json({ user: bundle.user });
  setSessionCookies(response, bundle);
  return response;
}
