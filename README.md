# Phân công đoàn khám & chấm công bác sỹ

This is a web app. It runs entirely in the browser. **Data is stored in a single `.json` file on the user's computer.** Nothing is sent to any server.

The code is on GitHub. Each user opens the app at its GitHub Pages address, then picks the data file to use.

## Cấu trúc
| Tệp | Nội dung |
|---|---|
| `index.html` | Giao diện |
| `js/logic.js` | Xử lý dữ liệu: bác sỹ, đoàn khám, phân công, báo cáo, xuất Excel |
| `js/store.js` | Đọc và ghi file dữ liệu `.json` |
| `ban-google-sheet/` | Bản cũ chạy trên Google Sheets (chỉ để tham khảo) |

The real data file (`DuLieu/…json`) and the Excel files are **not uploaded to GitHub**. `.gitignore` excludes them.

## Đưa lên GitHub và mở bằng đường link (làm 1 lần)
1. Vào https://github.com/new, đặt tên repository là `bskhambenh` và chọn **Public**.
   - GitHub Pages miễn phí yêu cầu repository là Public.
   - Repository chỉ chứa mã nguồn, không chứa dữ liệu.
2. Bấm **Create repository**, rồi đẩy mã lên:
   ```bash
   git remote add origin https://github.com/abcdch1/bskhambenh.git
   git push -u origin main
   ```
3. Trên trang repository, vào **Settings › Pages**:
   - *Source*: **Deploy from a branch**
   - *Branch*: **main**, thư mục **/ (root)**
   - Bấm **Save**.
4. Sau khoảng 1–2 phút, phần mềm có địa chỉ: **https://abcdch1.github.io/bskhambenh/**

## Sử dụng
- Mở bằng **Google Chrome** hoặc **Microsoft Edge** trên máy tính. Hai trình duyệt này cho phép phần mềm lưu thẳng vào file.
- Màn hình đầu tiên hỏi nơi lưu dữ liệu. Có 3 lựa chọn:
  - **Mở file dữ liệu có sẵn**: chọn file `.json`. Ví dụ `DuLieuPhanCong.json` đã có sẵn 40 bác sỹ.
  - **Tạo file dữ liệu mới**: chọn thư mục và tên file để bắt đầu từ đầu.
  - **Mở lại file lần trước**: dùng từ lần thứ hai trở đi. Nếu trình duyệt hỏi, bấm *Cho phép*.
- Mọi thay đổi được tự động lưu vào file. Góc trên bên phải hiện tên file và giờ lưu gần nhất.
- **Bảng phân công** và **Báo cáo công** có nút **⬇ Xuất Excel** để tải file `.xlsx`.
- Trên Safari, Firefox hoặc điện thoại, phần mềm không ghi thẳng vào file được. Sau khi sửa, cần bấm **⬇ Tải file dữ liệu** để lưu về máy.

## Nhiều người cùng dùng
1. Đặt file `.json` trong một thư mục đồng bộ dùng chung, ví dụ **Google Drive cho máy tính** hoặc **OneDrive**.
2. Mỗi người mở cùng file đó từ máy của mình.

Phần mềm có cơ chế tránh mất dữ liệu:
- **Trước mỗi lần lưu**, và mỗi khi quay lại cửa sổ phần mềm, nó kiểm tra file. Nếu file vừa được người khác sửa, nó tải dữ liệu mới nhất rồi mới ghi thay đổi của mình.
- Phần kiểm tra trùng lịch bác sỹ chạy trên dữ liệu mới nhất đó.

Lưu ý: Drive và OneDrive cần vài giây đến vài chục giây để đồng bộ. **Tránh hai người cùng sửa trong cùng một lúc.** Nên tải **bản sao lưu** định kỳ ở mục *Cài đặt › File dữ liệu*.

## Cập nhật phần mềm
Sửa mã, rồi chạy:
```bash
git add -A
git commit -m "Mô tả thay đổi"
git push
```
GitHub Pages tự cập nhật sau 1–2 phút. Dữ liệu trong file `.json` không bị ảnh hưởng.
