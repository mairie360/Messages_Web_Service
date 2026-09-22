import { frontUrl } from "@/lib/front-urls";

// Other fronts are resolved on use: their URLs are only known at runtime.
const appRoutes: Partial<Record<string, string>> = {
  get dashboard() { return frontUrl("DASHBOARD_FRONT_URL"); },
  get projects() { return frontUrl("PROJECT_FRONT_URL"); },
  get messages() { return frontUrl("MESSAGE_FRONT_URL"); },
  get emails() { return frontUrl("EMAIL_FRONT_URL"); },
  get files() { return frontUrl("FILES_FRONT_URL"); },
  get training() { return frontUrl("ELEARNING_FRONT_URL"); },
  get calendar() { return frontUrl("CALENDAR_FRONT_URL"); },
  get admin() { return frontUrl("ADMINISTRATION_FRONT_URL"); },
  get settings() { return frontUrl("SETTINGS_FRONT_URL"); },
  profile: "/profile",
};

export function getAppRoute(page: string) {
  return appRoutes[page];
}
