# Hướng dẫn cài đặt – Phần mềm phân công đoàn khám

Gồm 2 tệp: `Code.gs` (xử lý dữ liệu) và `Index.html` (giao diện). Cài 1 lần, mất khoảng 5 phút.

## 1. Tạo file Google Sheet
1. Mở https://sheets.new (đăng nhập Gmail), đặt tên ví dụ **"Phân công đoàn khám"**.
2. Menu **Tiện ích mở rộng › Apps Script**.

## 2. Dán mã nguồn
1. Trong Apps Script, mở tệp `Mã.gs` (hoặc `Code.gs`), **xoá hết** nội dung, dán toàn bộ nội dung tệp `Code.gs`.
2. Bấm dấu **+** cạnh "Tệp" › **HTML**, đặt tên đúng là **`Index`** (không gõ `.html`), xoá nội dung mẫu, dán toàn bộ tệp `Index.html`.
3. Bấm 💾 **Lưu**.

## 3. Khởi tạo dữ liệu
1. Ở thanh trên, chọn hàm **`khoiTao`** › bấm **Chạy**.
2. Lần đầu Google hỏi quyền: **Xem xét quyền › chọn tài khoản › Nâng cao › Đi tới … (không an toàn) › Cho phép**.
   (Cảnh báo này xuất hiện vì đây là script do mình tự viết, chưa được Google kiểm duyệt.)
3. Quay lại Google Sheet, **tải lại trang (F5)**. Trên thanh menu sẽ có **🩺 Phân công khám**.
4. (Tuỳ chọn) **🩺 Phân công khám › Tạo bác sỹ mẫu** để dùng thử với 30 bác sỹ giả. Khi dùng thật: mở trang `BacSy`, xoá các dòng mẫu (giữ dòng tiêu đề).

## 4. Sử dụng
- **🩺 Phân công khám › Mở phần mềm**: mở giao diện ngay trong Google Sheet.
- Chia sẻ file Sheet (quyền **Người chỉnh sửa**) cho 2–3 người cùng dùng. Mỗi người mở file là có menu. Lần đầu dùng, mỗi người phải cấp quyền như bước 3.2.

### (Tuỳ chọn) Mở bằng đường link riêng, chạy được trên điện thoại
Apps Script › **Triển khai › Tùy chọn triển khai mới › Loại: Ứng dụng web**
- *Thực thi với tư cách*: **Người dùng truy cập ứng dụng web**
- *Người có quyền truy cập*: **Bất kỳ ai có Tài khoản Google**

Bấm **Triển khai** rồi lưu lại đường link. Chỉ những người được chia sẻ file Sheet mới đọc/ghi được dữ liệu.
Khi sửa mã, vào **Quản lý việc triển khai › Sửa › Phiên bản: Phiên bản mới** để cập nhật link.

## 5. Các trang dữ liệu trong Sheet
| Trang | Nội dung |
|---|---|
| BacSy | Danh sách bác sỹ (chuyên khoa ghi bằng mã, cách nhau dấu phẩy) |
| ChuyenKhoa | Danh mục chuyên khoa |
| LichBan | Lịch bận của bác sỹ theo ngày + khung giờ |
| Doan / NhuCau / PhanCong | Đoàn khám, số bác sỹ cần, người được xếp |
| DonGia | Đơn giá theo khung giờ (có thể thêm theo chuyên khoa và ngày áp dụng) |
| CauHinh | Thiết lập khác |

Nên sửa dữ liệu qua phần mềm. Nếu sửa tay trong Sheet thì giữ nguyên thứ tự cột và **không xoá dòng tiêu đề**.
Các trang "Bảng PC …", "BC tổng hợp …", "BC chi tiết …" là bảng đã xuất, có thể tải về Excel (**Tệp › Tải xuống › .xlsx**) hoặc xoá đi khi không cần.

## 6. Quy tắc phần mềm đang áp dụng
- 3 khung: Sáng 7h30–11h30, Chiều 12h–16h, Tối 16h–20h. Một bác sỹ có thể đi cả 3 khung trong ngày (ở các đoàn khác nhau).
- **Không cho phép** 1 bác sỹ ở 2 đoàn khác nhau trong cùng 1 khung giờ (báo lỗi khi lưu).
- **Cho phép** 1 bác sỹ kiêm 2 chuyên khoa trong cùng đoàn, cùng buổi → chỉ tính **1 công**.
- Gợi ý: ưu tiên bác sỹ còn rảnh → nhiều sao hơn → số buổi đã khám nhiều hơn (trong 90 ngày, chỉnh ở Cài đặt). Bác sỹ có lịch bận vẫn chọn được nhưng có cảnh báo.
- Chọn bác sỹ cho 1 buổi sẽ tự điền vào các buổi khác cùng vị trí, nếu ô đó còn trống và bác sỹ rảnh.
- Báo cáo công: mặc định chỉ tính đoàn ở trạng thái **Hoàn thành**. Đơn giá lấy theo ngày khám, nên khi đổi giá (thêm dòng mới có "áp dụng từ ngày"), các buổi cũ vẫn giữ giá cũ.
