import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function NotFound(){return <main className="grid min-h-screen place-items-center bg-primary p-6 text-center text-white"><div><p className="font-serif text-8xl text-gold">404</p><h1 className="mt-4 font-serif text-4xl">Halaman tidak ditemukan</h1><p className="mt-4 text-white/60">Tautan mungkin telah berubah atau konten belum dipublikasikan.</p><Button asChild className="mt-8"><Link href="/"><Home className="size-4"/>Kembali ke Beranda</Link></Button></div></main>;}
