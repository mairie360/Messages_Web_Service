import { parseFrontUrl } from "@/lib/front-url";
import { frontUrl } from "@/lib/front-urls";
import type { FrontUrlKey } from "@/lib/front-urls";
import { settingsProfileUrl } from "@/lib/settings-profile";

const configuredUrl = (key: FrontUrlKey) => parseFrontUrl(frontUrl(key))?.href;

/** Runtime destinations for active modules only; archived fronts are omitted. */
export function getActiveFrontHrefs() {
  const settings = settingsProfileUrl(frontUrl("SETTINGS_FRONT_URL"));
  return {
    dashboard: configuredUrl("DASHBOARD_FRONT_URL"),
    projects: configuredUrl("PROJECT_FRONT_URL"),
    messages: configuredUrl("MESSAGE_FRONT_URL"),
    training: configuredUrl("ELEARNING_FRONT_URL"),
    calendar: configuredUrl("CALENDAR_FRONT_URL"),
    admin: configuredUrl("ADMINISTRATION_FRONT_URL"),
    settings,
    profile: settings,
  };
}

export function getAppRoute(page: string) {
  const routes: Record<string, string | undefined> = getActiveFrontHrefs();
  return routes[page];
}
