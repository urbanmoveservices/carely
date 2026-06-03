export type ChatSuggestionMode = "general" | "report" | "family";

export function getChatSuggestions(
  mode: ChatSuggestionMode,
  t: (key: string) => string
): string[] {
  if (mode === "report") {
    return [
      t("chat.suggestReport1"),
      t("chat.suggestReport2"),
      t("chat.suggestReport3"),
      t("chat.suggestReport4"),
      t("chat.suggestReport5"),
    ];
  }
  if (mode === "family") {
    return [
      t("chat.suggestFamily1"),
      t("chat.suggestFamily2"),
      t("chat.suggestFamily3"),
      t("chat.suggestFamily4"),
      t("chat.suggestFamily5"),
    ];
  }
  return [
    t("chat.suggestGeneral1"),
    t("chat.suggestGeneral2"),
    t("chat.suggestGeneral3"),
    t("chat.suggestGeneral4"),
    t("chat.suggestGeneral5"),
  ];
}
