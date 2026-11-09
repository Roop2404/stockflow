import { NextRequest, NextResponse } from "next/server";

import {
  csrfCookieName,
  csrfCookieOptions,
  isValidCsrfToken,
  makeCsrfToken,
} from "@/lib/server/csrf";

export async function GET(request: NextRequest) {
  const existing = request.cookies.get(csrfCookieName)?.value;
  const token = isValidCsrfToken(existing) ? existing : makeCsrfToken();
  const response = NextResponse.json({ csrf_token: token });
  if (token !== existing) {
    response.cookies.set(csrfCookieName, token, csrfCookieOptions());
  }
  return response;
}
