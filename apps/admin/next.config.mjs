import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build a standalone Node server bundle (apps/admin/.next/standalone) so
  // the Docker runtime stage can ship a minimal image — only the deps that
  // the admin actually uses.
  output: "standalone",
  // Tell Next that the monorepo root is two levels up — needed so the file
  // tracer walks the workspace's hoisted node_modules when building inside Docker.
  experimental: {
    outputFileTracingRoot: path.resolve(__dirname, "../../"),
  },
};
export default nextConfig;
