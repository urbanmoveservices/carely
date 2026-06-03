import type { ChatSource } from "@/components/chat/ChatSourceBadges";

export function hrefForChatSource(source: ChatSource): string | null {
  switch (source.type) {
    case "report":
      return `/reports/${source.id}`;
    case "document":
      return `/reports/${source.id}`;
    case "family":
      return `/family/${source.id}`;
    case "risk":
      return "/health-risks";
    case "reminder":
      return "/reminders";
    default:
      return null;
  }
}
