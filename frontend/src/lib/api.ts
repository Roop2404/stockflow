import "server-only";

import { callBackend } from "@/lib/server/backend";

export async function getApiHealth(): Promise<{ status: string }> {
  const response = await callBackend("/api/health");
  if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
  return response.json() as Promise<{ status: string }>;
}
