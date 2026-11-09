export type RuntimeEnvironment = "development" | "production";

export function runtimeEnvironment(value = process.env.NODE_ENV): RuntimeEnvironment {
  if (value === "development" || value === "production") return value;
  throw new Error("StockFlow supports only development and production server environments");
}

function validateSecret(name: string, value: string | undefined): string {
  const secret = value;
  if (!secret) throw new Error(`${name} is required`);
  if (secret !== secret.trim()) throw new Error(`${name} must not contain surrounding whitespace`);
  const normalized = secret.toLowerCase();
  const placeholders = ["replace-with", "placeholder", "example", "default", "changeme", "change-me", "your-secret", "dev-secret"];
  if (placeholders.some((marker) => normalized.includes(marker))) {
    throw new Error(`${name} must not be a placeholder or example value`);
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(secret)) {
    throw new Error(`${name} must be base64 encoding of at least 32 random bytes`);
  }
  const material = Buffer.from(secret, "base64");
  if (material.toString("base64") !== secret || material.length < 32) {
    throw new Error(`${name} must be base64 encoding of at least 32 random bytes`);
  }
  const counts = new Map<number, number>();
  for (const byte of material) counts.set(byte, (counts.get(byte) ?? 0) + 1);
  const entropy = [...counts.values()].reduce((sum, count) => {
    const probability = count / material.length;
    return sum - probability * Math.log2(probability);
  }, 0);
  if (counts.size < 16 || entropy < 3.5) {
    throw new Error(`${name} must contain sufficiently varied random material`);
  }
  return secret;
}

function isLoopbackHost(hostname: string): boolean {
  const unwrapped = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  const normalized = unwrapped.toLowerCase().replace(/\.$/, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  return /^127(?:\.\d{1,3}){1,3}$/.test(normalized) ||
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:1";
}

function validateOrigin(value: string | undefined, environment: RuntimeEnvironment): string {
  const origin = value || (environment === "development" ? "http://localhost:3000" : "");
  if (!origin) throw new Error("FRONTEND_ORIGIN is required in production");
  if (origin !== origin.trim()) throw new Error("FRONTEND_ORIGIN must not contain surrounding whitespace");
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error("FRONTEND_ORIGIN must be a valid origin URL");
  }
  if (
    parsed.origin !== origin ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("FRONTEND_ORIGIN must be an exact origin without credentials, path, query, or fragment");
  }
  if (environment === "production") {
    if (parsed.protocol !== "https:") throw new Error("Production FRONTEND_ORIGIN must use HTTPS");
    if (isLoopbackHost(parsed.hostname)) throw new Error("Production FRONTEND_ORIGIN must not use localhost or loopback");
  } else if (parsed.protocol !== "http:" || !isLoopbackHost(parsed.hostname)) {
    throw new Error("Development FRONTEND_ORIGIN must be an HTTP localhost or loopback origin");
  }
  return origin;
}

export function getFrontendOrigin(env: NodeJS.ProcessEnv = process.env): string {
  return validateOrigin(env.FRONTEND_ORIGIN, runtimeEnvironment(env.NODE_ENV));
}

export function sessionCookieConfiguration(environment = runtimeEnvironment()) {
  const production = environment === "production";
  return {
    accessName: production ? "__Host-stockflow_access" : "stockflow_dev_access",
    refreshName: production ? "__Host-stockflow_refresh" : "stockflow_dev_refresh",
    csrfName: production ? "__Host-stockflow_csrf" : "stockflow_dev_csrf",
    secure: production,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/" as const,
    domain: undefined,
  };
}

export function validateServerConfiguration(env: NodeJS.ProcessEnv = process.env): void {
  const environment = runtimeEnvironment(env.NODE_ENV);
  validateSecret("CSRF_SECRET", env.CSRF_SECRET);
  validateSecret("BFF_SHARED_SECRET", env.BFF_SHARED_SECRET);
  validateOrigin(env.FRONTEND_ORIGIN, environment);

  const cookies = sessionCookieConfiguration(environment);
  const validNames = environment === "production"
    ? cookies.accessName === "__Host-stockflow_access" && cookies.refreshName === "__Host-stockflow_refresh"
    : cookies.accessName === "stockflow_dev_access" && cookies.refreshName === "stockflow_dev_refresh";
  if (
    !validNames ||
    cookies.secure !== (environment === "production") ||
    !cookies.httpOnly ||
    cookies.sameSite !== "lax" ||
    cookies.path !== "/" ||
    cookies.domain !== undefined
  ) {
    throw new Error("StockFlow session cookie configuration is invalid for this environment");
  }
}
