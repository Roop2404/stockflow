export async function getCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to initialize request security");
  const body = (await response.json()) as { csrf_token: string };
  return body.csrf_token;
}

export async function csrfFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getCsrfToken();
  const headers = new Headers(init.headers);
  headers.set("X-CSRF-Token", token);
  return fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
}
