"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareActions({ title, url, dark = false }: { title: string; url: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const message = encodeURIComponent(`${title}\n${url}`);
  async function copyLink() {
    try { await navigator.clipboard.writeText(url); }
    catch { const input = document.createElement("textarea"); input.value = url; input.style.position = "fixed"; input.style.opacity = "0"; document.body.appendChild(input); input.select(); document.execCommand("copy"); input.remove(); }
    setCopied(true); window.setTimeout(() => setCopied(false), 2000);
  }
  const variant = dark ? "outlineLight" : "secondary";
  return <div className="mt-3 grid gap-3"><Button asChild variant={variant} className="w-full"><a href={`https://wa.me/?text=${message}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" />Bagikan ke WhatsApp</a></Button><Button variant={variant} onClick={copyLink} className="w-full">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Tautan disalin" : "Salin tautan"}</Button><span className="sr-only" aria-live="polite">{copied ? "Tautan berhasil disalin" : ""}</span></div>;
}
