import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Tell Next that the monorepo root is two levels up — fixes file-trace
  // collection when building the standalone server inside Docker.
  experimental: {
    outputFileTracingRoot: path.resolve(__dirname, "../../"),
  },
};
export default nextConfig;
