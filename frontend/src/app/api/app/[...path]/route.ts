import { NextRequest, NextResponse } from "next/server";

import { callBackend, safeBackendError } from "@/lib/server/backend";
import { validateCsrfRequest } from "@/lib/server/csrf";
import { accessCookieName } from "@/lib/server/session-cookies";

type RouteContext = { params: Promise<{ path: string[] }> };

function allowedPath(parts: string[], method: string): string | null {
  const path = parts.join("/");
  if (path === "products" && ["GET", "POST"].includes(method)) return path;
  if (/^products\/[0-9a-f-]{36}$/.test(path) && ["GET", "PATCH", "DELETE"].includes(method)) return path;
  if (/^products\/[0-9a-f-]{36}\/quantity$/.test(path) && method === "PATCH") return path;
  if (path === "dashboard/summary" && method === "GET") return path;
  if (path === "organization/settings" && ["GET", "PUT"].includes(method)) return path;
  return null;
}

async function proxy(request: NextRequest, context: RouteContext) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;
  }

  const { path: parts } = await context.params;
  const path = allowedPath(parts, request.method);
  if (!path) return NextResponse.json({ detail: "Not found" }, { status: 404 });

  const accessToken = request.cookies.get(accessCookieName)?.value;
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${accessToken ?? ""}`);
  if (request.headers.has("content-type")) headers.set("Content-Type", request.headers.get("content-type")!);
  const upstream = await callBackend(`/api/${path}${request.nextUrl.search}`, {
    method: request.method,
    headers,
    ...(request.method === "GET" || request.method === "DELETE" ? {} : { body: await request.text() }),
  });
  if (!upstream.ok) return safeBackendError(upstream);
  if (upstream.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await upstream.json(), { status: upstream.status });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
