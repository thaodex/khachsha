# Sao Mai Hotel — Cinematic Hero v2

Hero mới đã tích hợp. Bắt đầu ở `main/docs/CINEMATIC-HERO-V2.md`. Báo cáo nền tảng v1 ở `main/docs/ENHANCEMENT-REPORT.md`: danh sách lỗi, thay đổi, kết quả kiểm thử và các giới hạn còn lại.

## Chạy mã nguồn
```sh
cd main
npm ci
npm run typecheck
npm test
npm run dev
```
Build phát hành: `npm run build`. Cần máy có mạng để cài dependency theo lockfile. Trong sandbox đã kiểm tra TypeScript và dùng bộ chạy test ngoại tuyến; build Vite chuẩn chưa kiểm chứng thành công.

## Xem nhanh không cần npm
```sh
python -m http.server 4173 --directory preview
```
Mở http://localhost:4173. Không mở index.html trực tiếp bằng file://. Preview này dùng bản CSS biên dịch gốc + lớp nâng cấp, chỉ để QA; không dùng nhận tiền thật. Toàn bộ dữ liệu demo nằm trong trình duyệt.

## Cấu hình
Tạo `.env` từ `main/.env.example` khi cần đổi cờ, rồi chạy/build lại:
- `VITE_CINEMATIC_HERO=false`: quay về hero v1 (không bỏ các vá lỗi booking).
- `VITE_ROOM_3D=false`: tắt 3D; ảnh cũ vẫn hoạt động.
- `VITE_DEMO_PAYMENTS=false`: mặc định, không mô phỏng thu tiền. Chỉ đặt true trên dữ liệu thử nghiệm.
Không đặt API secret vào VITE_*; .env gốc đã được loại khỏi gói bàn giao.

## Nội dung
- main/: mã nguồn giữ cấu trúc dự án cũ, không có node_modules/.git/secret.
- preview/: bản QA biên dịch ngoại tuyến, dùng thử ngay qua web server.
- qa/: logs và ảnh đã xem kiểm tra.
- rollback/: bản sao file gốc bị sửa (không có .env), danh sách file mới và script hoàn tác.

## Rollback
Sao lưu dữ liệu ứng dụng và mã nguồn hiện tại trước. Thử trước:
```sh
python rollback/restore.py main
```
Sau khi xem danh sách, áp dụng:
```sh
python rollback/restore.py main --apply
```
Script chỉ hoàn tác file vẫn đúng hash bản nâng cấp, từ chối ghi đè thay đổi phát sinh. Không đụng vào localStorage/database, không khôi phục secret. Có thể tắt riêng 3D bằng cờ trước khi rollback toàn bộ.

## Phần chưa hoàn thiện
3D dùng WebGL nhẹ, là mô phỏng nội thất minh họa; chưa có model GLB/HDRI, chưa đạt photorealistic hoặc bản đo phòng thực tế. Backend, thanh toán thật, auth an toàn và xác minh nội dung khách sạn vẫn là các điều kiện bắt buộc trước production. Không tuyên bố toàn hệ thống đã hết lỗi.

## Mới ở v2
Hero ảnh điện ảnh có chiều sâu 2.5D, gợn nước, Hoàng hôn/Về đêm, điểm khám phá Suite, chọn hạng và xem ảnh/3D trong dialog. Không phải model resort GLB. Mobile dùng ảnh mặc định; nút cho bật hiệu ứng khi muốn. Tất cả nâng cấp v1 vẫn có trong main/.
