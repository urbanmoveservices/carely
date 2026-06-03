"use client";

import { Alert } from "@/components/ui/Alert";

export function ChatSafetyNotice({
  level,
}: {
  level: "normal" | "caution" | "urgent";
}) {
  if (level === "urgent") {
    return (
      <Alert variant="error" className="text-sm mb-3">
        Ye urgent ho sakta hai — turant emergency medical help ya doctor se contact karein.
      </Alert>
    );
  }
  if (level === "caution") {
    return (
      <p className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mb-2 border border-amber-100">
        Ye diagnosis ya dawai ki prescription nahi hai — sirf aapke saved data ki samjh.
        Important decisions ke liye doctor se consult karein.
      </p>
    );
  }
  return (
    <p className="text-[11px] text-gray-600 mb-2">
      Vaidya GPT aapke reports aur saved health data par based jawab deta hai.
      Ye final diagnosis nahi hai — doctor se confirm karna recommended hai.
    </p>
  );
}
