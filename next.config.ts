import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  env: {
    LOGIN_FRONT_URL: process.env.LOGIN_FRONT_URL,
    EMAIL_FRONT_URL: process.env.EMAIL_FRONT_URL,
    PROJECT_FRONT_URL: process.env.PROJECT_FRONT_URL,
    CALENDAR_FRONT_URL: process.env.CALENDAR_FRONT_URL,
    FILES_FRONT_URL: process.env.FILES_FRONT_URL,
    MESSAGE_FRONT_URL: process.env.MESSAGE_FRONT_URL,
    ELEARNING_FRONT_URL: process.env.ELEARNING_FRONT_URL,
    ADMINISTRATION_FRONT_URL: process.env.ADMINISTRATION_FRONT_URL,
  },
};

export default nextConfig;
