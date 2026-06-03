export {
  absoluteUrl,
  getAppUrl,
  getBaseUrlFromRequest,
  isAppUrlConfigured,
} from "./app-url";

import { getAppUrl } from "./app-url";

/** @deprecated Use getAppUrl() from @/lib/app-url */
export function getDefaultBaseUrl(): string {
  return getAppUrl();
}
