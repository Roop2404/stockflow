import "server-only";
import type { NextResponse } from "next/server";
import { runtimeEnvironment, sessionCookieConfiguration } from "@/lib/server/runtime-config";

export type TokenBundle = {
  access_token: string;
  access_expires_in: number;
  refresh_token: string;
  family_expires_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    organization: { id: string; name: string };
  };
};

const environment = runtimeEnvironment();
const cookieConfiguration = sessionCookieConfiguration(environment);

export const accessCookieName = cookieConfiguration.accessName;
export const refreshCookieName = cookieConfiguration.refreshName;

const cookieBase = {
  httpOnly: cookieConfiguration.httpOnly,
  secure: cookieConfiguration.secure,
  sameSite: cookieConfiguration.sameSite,
  path: cookieConfiguration.path,
};

export function setSessionCookies(response: NextResponse, bundle: TokenBundle): void {
  const familyExpiry = Date.parse(bundle.family_expires_at);
  const remaining = Math.max(0, Math.floor((familyExpiry - Date.now()) / 1000));
  response.cookies.set(accessCookieName, bundle.access_token, {
    ...cookieBase,
    maxAge: Math.max(0, bundle.access_expires_in),
  });
  response.cookies.set(refreshCookieName, bundle.refresh_token, {
    ...cookieBase,
    maxAge: remaining,
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(accessCookieName, "", { ...cookieBase, maxAge: 0 });
  response.cookies.set(refreshCookieName, "", { ...cookieBase, maxAge: 0 });
}
