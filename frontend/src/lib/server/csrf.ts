import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getFrontendOrigin, runtimeEnvironment, sessionCookieConfiguration, validateServerConfiguration } from "@/lib/server/runtime-config";

const environment = runtimeEnvironment();
const cookieConfiguration = sessionCookieConfiguration(environment);
export const csrfCookieName = cookieConfiguration.csrfName;

function origin(): string {
  validateServerConfiguration();
  return getFrontendOrigin();
}

function signature(nonce: string): string {
  validateServerConfiguration();
  const secret = process.env.CSRF_SECRET!;
  return createHmac("sha256", secret)
    .update(`${origin()}\n${nonce}`)
    .digest("base64url");
}

export function makeCsrfToken(): string {
  const nonce = randomBytes(32).toString("base64url");
  return `${nonce}.${signature(nonce)}`;
}

export function isValidCsrfToken(token: string | undefined): token is string {
  if (!token) return false;
  const [nonce, supplied, extra] = token.split(".");
  if (!nonce || !supplied || extra !== undefined) return false;
  try {
    const expected = Buffer.from(signature(nonce), "base64url");
    const actual = Buffer.from(supplied, "base64url");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function validateCsrfRequest(request: NextRequest): NextResponse | null {
  if (request.headers.get("origin") !== origin()) {
    return NextResponse.json({ detail: "Request origin rejected" }, { status: 403 });
  }
  const cookieToken = request.cookies.get(csrfCookieName)?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (
    !cookieToken ||
    !headerToken ||
    cookieToken !== headerToken ||
    !isValidCsrfToken(cookieToken)
  ) {
    return NextResponse.json({ detail: "CSRF validation failed" }, { status: 403 });
  }
  return null;
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: cookieConfiguration.secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24,
  };
}
