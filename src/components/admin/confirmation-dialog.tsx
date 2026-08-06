"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmationDialog({ open, onOpenChange, onConfirm, busy = false, title, description }: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onConfirm?: () => void | Promise<void>;
  busy?: boolean;
  title: string;
  description: string;
}) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm" />
    <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="grid size-11 place-items-center rounded-full bg-red-50 text-red-700"><AlertTriangle className="size-5" /></div>
      <Dialog.Title className="mt-5 font-serif text-2xl font-semibold text-primary">{title}</Dialog.Title>
      <Dialog.Description className="mt-3 text-sm leading-6 text-muted">{description}</Dialog.Description>
      <div className="mt-7 flex justify-end gap-3"><Dialog.Close asChild><Button variant="secondary" disabled={busy}>Batal</Button></Dialog.Close><Button disabled={busy} className="bg-red-700 text-white hover:bg-red-800" onClick={onConfirm}>{busy && <Loader2 className="size-4 animate-spin" />}Ya, hapus</Button></div>
      <Dialog.Close className="absolute right-4 top-4 text-muted" aria-label="Tutup"><X className="size-5" /></Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
