"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

type Props = { action: string; onVerify: (token: string) => void; onExpire?: () => void; resetKey?: number };
export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
export const turnstileCanSubmitWithoutToken = !turnstileSiteKey && process.env.NODE_ENV !== "production";

export function TurnstileWidget({ action, onVerify, onExpire, resetKey = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
  }, [onExpire, onVerify]);

  useEffect(() => {
    if (!scriptReady || !turnstileSiteKey || !containerRef.current || !window.turnstile) return;
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: turnstileSiteKey,
      action,
      theme: "light",
      size: "flexible",
      callback: (token: string) => onVerifyRef.current(token),
      "expired-callback": () => onExpireRef.current?.(),
      "error-callback": () => onExpireRef.current?.(),
    });
    return () => window.turnstile?.remove(widgetId);
  }, [action, resetKey, scriptReady]);

  if (!turnstileSiteKey) return <div className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${turnstileCanSubmitWithoutToken ? "border-blue-200 bg-blue-50 text-blue-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}><ShieldCheck className="mt-0.5 size-4 shrink-0" /><span>{turnstileCanSubmitWithoutToken ? "Turnstile dilewati hanya pada mode development." : "Proteksi Turnstile belum dikonfigurasi. Pengiriman formulir dinonaktifkan."}</span></div>;

  return <div className="min-h-[70px]"><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setScriptReady(true)} /><div ref={containerRef} role="group" aria-label="Verifikasi keamanan Cloudflare Turnstile" /></div>;
}
