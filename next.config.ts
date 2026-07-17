import type { NextConfig } from "next";

const devFrontUrl = (subdomain: string) => `https://${subdomain}.dev.mairie360-eip.fr/`;

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  devIndicators: false,
  env: {
    LOGIN_FRONT_URL: process.env.LOGIN_FRONT_URL ?? devFrontUrl("login"),
    EMAIL_FRONT_URL: process.env.EMAIL_FRONT_URL ?? devFrontUrl("email"),
    PROJECT_FRONT_URL: process.env.PROJECT_FRONT_URL ?? devFrontUrl("project"),
    CALENDAR_FRONT_URL: process.env.CALENDAR_FRONT_URL ?? devFrontUrl("calendar"),
    FILES_FRONT_URL: process.env.FILES_FRONT_URL ?? devFrontUrl("files"),
    MESSAGE_FRONT_URL: process.env.MESSAGE_FRONT_URL ?? devFrontUrl("message"),
    ELEARNING_FRONT_URL: process.env.ELEARNING_FRONT_URL ?? devFrontUrl("elearning"),
    ADMINISTRATION_FRONT_URL: process.env.ADMINISTRATION_FRONT_URL ?? devFrontUrl("admin"),
  },
};

export default nextConfig;
