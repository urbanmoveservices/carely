/** Log chat errors without message bodies or health context (no PHI). */
export function logChatError(tag: string, err: unknown) {
  if (err instanceof Error) {
    const code = "code" in err ? String((err as Error & { code?: string }).code) : undefined;
    console.error(`[${tag}]`, code ? `${err.name}:${code}` : err.name, err.message.slice(0, 200));
    return;
  }
  console.error(`[${tag}]`, typeof err);
}

export function logChatAsk(
  err: unknown,
  meta: {
    source: string;
    mode?: string;
    reportId?: string;
    familyMemberId?: string;
    userId?: string;
    messageLength?: number;
  }
) {
  if (!(err instanceof Error)) {
    console.error(`[${meta.source}]`, typeof err);
    return;
  }
  const code = "code" in err ? String((err as Error & { code?: string }).code) : err.name;
  console.error(`[${meta.source}]`, {
    code,
    mode: meta.mode,
    reportId: meta.reportId ? "[set]" : undefined,
    familyMemberId: meta.familyMemberId ? "[set]" : undefined,
    userId: meta.userId,
    messageLength: meta.messageLength,
  });
}
