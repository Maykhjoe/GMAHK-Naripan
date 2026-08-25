"use client";

import { useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";

type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  length?: number;
  autoFocus?: boolean;
  label?: string;
};

function digitsOnly(value: string, length: number) {
  return value.replace(/\D/g, "").slice(0, length);
}

export function OtpCodeInput({
  value,
  onChange,
  disabled = false,
  length = 6,
  autoFocus = false,
  label = "Kode verifikasi",
}: OtpCodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const normalized = digitsOnly(value, length).padEnd(length, " ");

  function setDigit(index: number, digit: string) {
    const current = digitsOnly(value, length).split("");
    while (current.length < length) current.push("");
    current[index] = digitsOnly(digit, 1);
    onChange(current.join("").slice(0, length));
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      const current = digitsOnly(value, length).split("");
      if (current[index]) {
        current[index] = "";
        onChange(current.join(""));
        return;
      }
      if (index > 0) {
        current[index - 1] = "";
        onChange(current.join(""));
        refs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = digitsOnly(event.clipboardData.getData("text"), length);
    if (!pasted) return;
    onChange(pasted);
    const nextIndex = Math.min(pasted.length, length) - 1;
    refs.current[nextIndex]?.focus();
  }

  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      <div className="flex justify-center gap-2 sm:gap-3">
        {Array.from({ length }).map((_, index) => {
          const digit = normalized[index] === " " ? "" : normalized[index];
          return (
            <input
              key={index}
              ref={(element) => {
                refs.current[index] = element;
              }}
              value={digit}
              aria-label={`${label} digit ${index + 1}`}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              autoFocus={autoFocus && index === 0}
              onPaste={handlePaste}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onChange={(event) => {
                const next = digitsOnly(event.target.value, 1);
                setDigit(index, next);
                if (next && index < length - 1) {
                  refs.current[index + 1]?.focus();
                }
              }}
              className="size-11 rounded-xl border border-primary/15 bg-white text-center text-xl font-semibold text-primary outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10 disabled:cursor-not-allowed disabled:opacity-60 sm:size-12"
            />
          );
        })}
      </div>
    </fieldset>
  );
}
