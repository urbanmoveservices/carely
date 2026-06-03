import { BRAND } from "@/lib/brand";

export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";
  const result = await Notification.requestPermission();
  return result as NotificationPermissionState;
}

/** Future push copy — no medical details on lock screens */
export const GENERIC_REMINDER_NOTIFICATION_TITLE = BRAND.name;
export const GENERIC_REMINDER_NOTIFICATION_BODY =
  "A health reminder is due. Open the app to view details.";
