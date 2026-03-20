import { SSBClient } from "ssb-motor/client";

// Single SSB client instance using Vite proxy
export const ssbClient = new SSBClient({
  baseUrl: "/api/ssb",
  verbose: true,
  rateLimitMs: 1100,
  timeout: 20000,
});
