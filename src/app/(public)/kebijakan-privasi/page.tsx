import type { Metadata } from "next";

import { PageHero } from "@/components/sections/page-hero";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi GMAHK Jemaat Naripan.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privasi"
        title="Kebijakan Privasi"
        description="Komitmen kami dalam menjaga data pribadi jemaat dan pengunjung."
      />
      <article className="section-pad bg-white">
        <div className="container-site max-w-3xl space-y-8 text-muted">
          <section>
            <h2 className="font-serif text-3xl text-primary">
              Data yang kami kumpulkan
            </h2>
            <p className="mt-3 leading-8">
              Data hanya dikumpulkan ketika Anda mengisi formulir permohonan
              doa, kunjungan, pendaftaran kegiatan, atau kontak. Kami menerapkan
              prinsip minimalisasi data dan hanya meminta informasi yang
              diperlukan untuk menindaklanjuti permintaan Anda.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-primary">
              Permohonan doa
            </h2>
            <p className="mt-3 leading-8">
              Pemohon dapat memilih apakah permohonan boleh dibagikan kepada tim
              doa dan pastoral, atau dibatasi hanya untuk pendeta serta tim
              pastoral yang berwenang. Pilihan tersebut diterapkan melalui akses
              berbasis peran pada sistem admin.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-primary">
              Penggunaan dan akses
            </h2>
            <p className="mt-3 leading-8">
              Data digunakan untuk pelayanan, komunikasi, penyambutan,
              pendaftaran kegiatan, dan tindak lanjut yang Anda minta. Akses
              dibatasi berdasarkan tugas dan peran admin. Catatan internal tidak
              ditampilkan kepada publik.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-primary">
              Penyimpanan dan penghapusan
            </h2>
            <p className="mt-3 leading-8">
              Data disimpan secara aman dan dapat diarsipkan, dihapus, atau
              dianonimkan sesuai kebijakan retensi serta permintaan yang sah.
              Audit sistem untuk formulir privat hanya menyimpan metadata
              perubahan dan tidak menggandakan isi pesan sensitif.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-primary">Kontak</h2>
            <p className="mt-3 leading-8">
              Gunakan halaman kontak untuk pertanyaan atau permintaan terkait
              data pribadi. Kebijakan ini perlu ditinjau kembali sebelum website
              dipublikasikan untuk penggunaan produksi.
            </p>
          </section>
        </div>
      </article>
    </>
  );
}
