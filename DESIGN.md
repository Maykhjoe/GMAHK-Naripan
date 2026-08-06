# GMAHK Naripan — Design System

## Brand tokens

| Token | Nilai | Penggunaan |
|---|---|---|
| Primary | `#26352B` | Navigasi, section gelap, tombol |
| Secondary | `#526B57` | Teks aksen, ikon, state hover |
| Gold | `#C8A96B` | CTA utama, garis, highlight terbatas |
| Cream | `#F7F4EC` | Latar hangat |
| Ink | `#18201B` | Teks utama |
| Muted | `#667069` | Teks sekunder |

## Typography

- Display/heading: Playfair Display, weight 600, letter spacing negatif.
- Body/UI: Inter, weight 400–700.
- Heading serif hanya untuk judul, kutipan ayat, dan elemen spiritual.

## Layout

- Container: maksimum 1248px (`container-site`).
- Section spacing: `clamp(4.5rem, 8vw, 7.5rem)`.
- Radius: 12px untuk input, 16px untuk card, 32px untuk feature block.
- Border: `1px` dengan opacity rendah; bayangan lembut berlapis.

## Motion

Durasi 0.4–0.8 detik dengan easing lembut. Variants tersedia: `fadeIn`, `fadeUp`, `fadeDown`, `slideInLeft`, `slideInRight`, `staggerContainer`, `staggerItem`, `scaleIn`, dan `pageTransition`. Semua animasi menghormati `prefers-reduced-motion`.

## Accessibility

- Touch target minimum 44px.
- Focus ring gold 2px.
- Teks utama memiliki kontras tinggi.
- Form memakai label eksplisit dan pesan error dengan `role=alert`.
- Navigasi dan modal dapat dioperasikan melalui keyboard.
