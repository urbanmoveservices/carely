"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
};

const LENGTH = 6;

export function OtpCodeInput({
  value,
  onChange,
  disabled = false,
  autoFocus = true,
  id = "otp-code",
}: Props) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length: LENGTH }, (_, i) => value[i] || "")
  );

  useEffect(() => {
    setDigits(Array.from({ length: LENGTH }, (_, i) => value[i] || ""));
  }, [value]);

  const emit = useCallback(
    (next: string[]) => {
      const code = next.join("").slice(0, LENGTH);
      onChange(code);
    },
    [onChange]
  );

  const focusIndex = (index: number) => {
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select();
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    emit(next);
    if (digit && index < LENGTH - 1) {
      focusIndex(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusIndex(index - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    const next = Array.from({ length: LENGTH }, (_, i) => pasted[i] || "");
    setDigits(next);
    emit(next);
    focusIndex(Math.min(pasted.length, LENGTH - 1));
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          id={index === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          className="h-12 w-10 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-gray-100"
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
        />
      ))}
    </div>
  );
}
