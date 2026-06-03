export type ChatSourceInput = {
  type: string;
  id: string;
  title: string;
  date?: string;
  familyMemberId?: string;
};

export function hrefForSource(source: ChatSourceInput): string | undefined {
  switch (source.type) {
    case "report":
      return `/reports/${source.id}`;
    case "document":
      return `/documents/${source.id}`;
    case "family":
    case "familyMember":
      return `/family/${source.id}`;
    case "risk":
    case "healthRisk":
      return "/health-risks";
    case "reminder":
      return "/reminders";
    case "labTrend":
      return source.familyMemberId
        ? `/family/${source.familyMemberId}`
        : "/insights";
    case "appointment":
      return source.familyMemberId
        ? `/family/${source.familyMemberId}`
        : "/family";
    default:
      return undefined;
  }
}

export function enrichChatSources(
  sources: ChatSourceInput[]
): Array<ChatSourceInput & { href?: string }> {
  return sources.map((s) => {
    const href = hrefForSource(s);
    return href ? { ...s, href } : { ...s };
  });
}
