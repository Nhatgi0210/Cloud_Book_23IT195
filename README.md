# Quản lý Sách — 23IT195

Họ tên: Đinh Phúc Tuấn Nhật. MSSV: 23IT195.

Ứng dụng dùng Node.js/Express, MongoDB Atlas và Handlebars.
Database: `DB_23IT195`. Mã sách bắt đầu bằng `195`. VAT: `10%`.

Hai MongoClient độc lập: Read đọc sách/session; Write thêm sách và ghi/cập nhật/xóa session.
Session được lưu ở Atlas, cookie chứa ID phiên. Giữ cùng secret khi chạy nhiều instance.

## Chạy local

Yêu cầu Node.js từ 22 trở lên, database/collections/indexes và hai user Atlas đã được cấu hình.

```powershell
npm.cmd ci
Copy-Item .env.example .env
# Sửa .env: điền URI Atlas và SESSION_SECRET ngẫu nhiên.
npm.cmd test
npm.cmd start
```

Biến môi trường: NODE_ENV, PORT, STUDENT_NAME, STUDENT_ID, SESSION_SECRET,
MONGO_READ_URI, MONGO_WRITE_URI. Không commit .env.

Mở http://localhost:3000/books. Kiểm tra http://localhost:3000/healthz.
Thêm 195-B001, giá 100000: giá sau VAT phải là 110000.
Thử mã sai/trùng, thử quyền trái phép của từng user, restart và chuyển instance.

## Triển khai và bằng chứng

Bổ sung URL HTTPS của ứng dụng, cấu hình triển khai và các ảnh kiểm tra.
Repository GitHub đặt Private và cấp quyền cho giảng viên.