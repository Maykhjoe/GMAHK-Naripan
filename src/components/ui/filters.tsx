import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
export function SearchInput({placeholder="Cari…"}:{placeholder?:string}){return <label className="relative block"><Search className="absolute left-4 top-3.5 size-5 text-muted"/><Input className="pl-12" placeholder={placeholder} aria-label={placeholder}/></label>;}
export function FilterDropdown({label,options}:{label:string;options:string[]}){return <select aria-label={label} className="h-12 rounded-xl border border-primary/15 bg-white px-4 text-sm"><option>{label}</option>{options.map(o=><option key={o}>{o}</option>)}</select>;}
