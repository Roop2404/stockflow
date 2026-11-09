import "server-only";
import { NextResponse } from "next/server";

export async function callBackend(path: string, init: RequestInit = {}): Promise<Response> {
  const baseUrl = process.env.API_INTERNAL_URL?.replace(/\/+$/, "");
  const sharedSecret = process.env.BFF_SHARED_SECRET;
  if (!baseUrl || !sharedSecret) {
    throw new Error("The server-side backend connection is not configured");
  }
  const headers = new Headers(init.headers);
  headers.set("X-StockFlow-BFF-Secret", sharedSecret);
  return fetch(new URL(path, `${baseUrl}/`), {
    ...init,
    headers,
    cache: "no-store",
    redirect: "manual",
  });
}

export async function safeBackendError(response: Response): Promise<NextResponse> {
  let detail = "The request could not be completed";
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") detail = body.detail;
    else if (Array.isArray(body?.detail)) detail = "The submitted information is invalid";
  } catch {
    // Do not expose backend response text or internal exception details.
  }
  return NextResponse.json({ detail }, { status: response.status });
}
