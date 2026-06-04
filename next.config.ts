import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  // Allow other devices on the LAN (e.g. a phone) to use the dev server.
  allowedDevOrigins: ["172.30.1.69"],
};

export default nextConfig;
