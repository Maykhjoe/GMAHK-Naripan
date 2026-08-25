import Image from "next/image";

export function AuthBrand() {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src="/images/logo-adventist-green.svg"
        alt="Logo Gereja Masehi Advent Hari Ketujuh"
        width={82}
        height={82}
        priority
        className="h-auto w-[82px]"
      />
      <div className="mt-4">
        <p className="text-base font-bold tracking-[0.08em] text-primary">
          GMAHK NARIPAN
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.25em] text-muted">
          Bersama Dalam Kristus
        </p>
      </div>
    </div>
  );
}
