# Sao Mai — Hệ thiết kế giao diện khách (5★)

Tham chiếu trực tiếp từ các website khách sạn/resort đang được đánh giá cao nhất
(Atlantis The Royal — World’s Best Hotel Website 2025, Hotel d’Angleterre, Conrad,
Aman, Rosewood, Six Senses, Bulgari, One&Only) và các nghiên cứu UX du lịch
(Baymard, ScreenPilot, Mediaboom, HotelTechReport).

## 6 nguyên tắc được áp dụng

1. **Ảnh kể chuyện, chữ nhường chỗ** — hero full-bleed, Ken Burns 26s, chữ ngắn.
2. **Đặt phòng luôn trong tầm tay** — thanh tìm phòng đè lên hero và tự dính lên đỉnh khi cuộn.
3. **Phòng là nhân vật chính** — thẻ phòng ảnh 4:3, giá/đêm + tổng tiền theo số đêm, trạng thái còn/hết phòng.
4. **Bảng màu trung tính ấm + ánh kim** — onyx / ivory / sand / champagne, không gradient loang.
5. **Khoảng trắng rộng, viền mảnh** — section 64–120px, bóng đổ rất nhẹ, bán kính 2–4px.
6. **Chuyển động chậm, có chủ đích** — fade-up khi cuộn, zoom ảnh 1.2s, tôn trọng `prefers-reduced-motion`.

## Token (src/styles/luxury.css)

| Nhóm | Biến | Giá trị |
| --- | --- | --- |
| Nền tối | `--lux-onyx` | `#0F0D0B` |
| Chữ chính | `--lux-ink` | `#1C1917` |
| Chữ phụ | `--lux-stone` | `#6E675E` (5.4:1 trên ivory) |
| Nền trang | `--lux-ivory` | `#FCFAF7` |
| Nền khối | `--lux-sand` | `#F4EFE7` |
| Nhấn trên nền tối | `--lux-champagne` | `#C2A265` (8.1:1 trên onyx) |
| Nhấn trên nền sáng | `--lux-gold-deep` | `#8A6D33` (4.7:1 — đạt AA) |
| Tiêu đề | `--lux-font-display` | Cormorant Garamond → Georgia |
| Nội dung | `--lux-font-sans` | Inter → system sans |

## Cấu trúc trang chủ

Hero → Thanh đặt phòng → Phòng & Suite → Tiện nghi đặc trưng → Trải nghiệm ẩm thực
→ Dải số liệu tin cậy → Dịch vụ → Đánh giá → Ưu đãi đặt trực tiếp → Footer.

## Kiểm thử đã thực hiện

- Chụp màn hình 1440px và 390px từ `design/lux-preview.html` (dùng chính `src/styles/luxury.css`).
- Không tràn ngang, không chồng lấn, mọi nút bấm ≥ 40–48px.
- Đã sửa sau QA mobile: tên khách sạn không gãy dòng, khối giá xếp dọc, nút full-width.

## Lưu ý khi chạy

```bash
pnpm install
pnpm dev
```

Môi trường tạo bản nâng cấp này không có mạng nên chưa chạy được `pnpm install`,
`pnpm build` hay `pnpm typecheck`. Hãy chạy lại ở máy bạn để xác nhận.
