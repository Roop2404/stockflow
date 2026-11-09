export async function register() {
  // Build-time prerendering may use development origins. Validate when the
  // server process starts, before it accepts requests.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { validateServerConfiguration } = await import("@/lib/server/runtime-config");
  validateServerConfiguration();
}
