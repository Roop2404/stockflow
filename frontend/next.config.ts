import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";

import { validateServerConfiguration } from "./src/lib/runtime-validation";

const nextConfig: NextConfig = {};

export default function configureNext(phase: string): NextConfig {
  if (phase !== PHASE_PRODUCTION_BUILD) {
    const nodeEnvironment = phase === PHASE_DEVELOPMENT_SERVER ? "development" : "production";
    if (process.env.NODE_ENV && process.env.NODE_ENV !== nodeEnvironment) {
      throw new Error(`StockFlow server phase requires NODE_ENV=${nodeEnvironment}`);
    }
    validateServerConfiguration({ ...process.env, NODE_ENV: nodeEnvironment });
  }
  return nextConfig;
}
