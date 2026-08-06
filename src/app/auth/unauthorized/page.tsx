import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Akses Ditolak" };
export default function UnauthorizedPage() { return <main className="grid min-h-screen place-items-center bg-cream px-5"><div className="max-w-md text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-700"><ShieldX className="size-7" /></span><p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-secondary">Akses Ditolak</p><h1 className="mt-3 font-serif text-4xl text-primary">Akun belum memiliki role admin.</h1><p className="mt-4 text-sm leading-7 text-muted">Hubungi Super Admin untuk mendapatkan akses sesuai tanggung jawab pelayanan Anda.</p><Button asChild className="mt-8"><Link href="/">Kembali ke Website</Link></Button></div></main>; }
