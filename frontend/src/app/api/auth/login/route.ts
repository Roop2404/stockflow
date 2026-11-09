import { NextRequest, NextResponse } from "next/server";

import { callBackend, safeBackendError } from "@/lib/server/backend";
import { validateCsrfRequest } from "@/lib/server/csrf";
import { setSessionCookies, type TokenBundle } from "@/lib/server/session-cookies";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrfRequest(request);
  if (csrfError) return csrfError;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const upstream = await callBackend("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!upstream.ok) return safeBackendError(upstream);

  const bundle = (await upstream.json()) as TokenBundle;
  const response = NextResponse.json({ user: bundle.user });
  setSessionCookies(response, bundle);
  return response;
}
