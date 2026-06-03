import type { ChatThreadListItem } from "@/types";

export type ThreadDateGroup = "today" | "yesterday" | "week" | "older";

const GROUP_LABELS: Record<ThreadDateGroup, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "Previous 7 days",
  older: "Older",
};

export function groupThreadsByDate(
  threads: ChatThreadListItem[]
): Array<{ group: ThreadDateGroup; label: string; threads: ChatThreadListItem[] }> {
  const buckets: Record<ThreadDateGroup, ChatThreadListItem[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  for (const t of threads) {
    const d = new Date(t.updatedAt);
    if (d >= startOfToday) buckets.today.push(t);
    else if (d >= startOfYesterday) buckets.yesterday.push(t);
    else if (d >= startOfWeek) buckets.week.push(t);
    else buckets.older.push(t);
  }

  return (["today", "yesterday", "week", "older"] as ThreadDateGroup[])
    .filter((g) => buckets[g].length > 0)
    .map((g) => ({ group: g, label: GROUP_LABELS[g], threads: buckets[g] }));
}
