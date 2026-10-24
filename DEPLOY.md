# HƯỚNG DẪN TRIỂN KHAI AYK MAIN 8686 (DEPLOYMENT GUIDE)

Tài liệu hướng dẫn triển khai hệ thống học tập và cổng sinh viên **AYK MAIN 8686** (React 19 + Vite + Express + Firebase Realtime Database) lên **GitHub Pages** (Frontend) và **Google Cloud Run / Render** (Backend).

---

## 1. Triển Khai Frontend Lên GitHub Pages

### Bước 1: Kích hoạt GitHub Pages từ GitHub Actions
1. Vào repository trên GitHub: **Settings** &rarr; **Pages** (ở cột bên trái).
2. Tại mục **Build and deployment** &rarr; **Source**: Chọn **`GitHub Actions`** (thay vì *Deploy from a branch*).
3. Mỗi khi `git push` lên nhánh `main`, workflow `.github/workflows/pages.yml` sẽ tự động:
   - Cài đặt dependencies với Node.js 22.
   - Build client bằng lệnh `npm run build:pages`.
   - Tạo file `dist/404.html` và `.nojekyll` giúp routing SPA hoạt động không bị 404 khi F5.
   - Deploy trực tiếp lên `https://<username>.github.io/<repo-name>/`.

### Bước 2: Thiết lập Biến Môi Trường (Repository Variables)
Tại **Settings** &rarr; **Secrets and variables** &rarr; **Actions** &rarr; tab **Variables**:
- `VITE_API_BASE`: URL máy chủ backend (Ví dụ: `https://ayk-backend-xyz.a.run.app` hoặc `https://ayk-main.onrender.com`).
  - Khi cấu hình biến này, toàn bộ client trên GitHub Pages sẽ gọi API tới backend qua helper `apiUrl()`.

---

## 2. Triển Khai Backend Lên Google Cloud Run / Render

Backend là dịch vụ Node.js/Express chạy trên port `3000`, sử dụng **Firebase Admin SDK** để quản lý số dư ảo `wallets/{uid}/pp`, xử lý logic game, nhiệm vụ và chống gian lận.

### Các Secrets cần thiết trên GitHub (Settings &rarr; Secrets &rarr; Actions):
| Secret Name | Mô tả |
|-------------|-------|
| `FIREBASE_SERVICE_ACCOUNT` | Toàn bộ chuỗi JSON của Firebase Service Account Key (Bắt buộc). |
| `FIREBASE_DATABASE_URL` | URL của Firebase Realtime Database (`https://appsinhvien-24482-default-rtdb.asia-southeast1.firebasedatabase.app`). |
| `GEMINI_API_KEY` | API Key cho tính năng Gia Sư AI và Chat AI. |
| `GCP_SA_KEY` | *(Tuỳ chọn khi dùng Cloud Run)* Service account GCP có quyền deploy Cloud Run & Artifact Registry. |
| `GCP_PROJECT_ID` | *(Tuỳ chọn)* Project ID Google Cloud. |

### Cách Deploy Thủ Công / Docker:
```bash
# Build Docker image
docker build -t ayk-main-8686 .

# Chạy thử nghiệm local
docker run -p 3000:3000 \
  -e FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' \
  -e FIREBASE_DATABASE_URL="https://appsinhvien-24482-default-rtdb.asia-southeast1.firebasedatabase.app" \
  ayk-main-8686
```

---

## 3. Kiểm Tra Sức Khỏe Hệ Thống (/api/health)

Sau khi backend khởi động, bạn có thể kiểm tra trạng thái bằng cách truy cập:
```bash
curl https://<backend-url>/api/health
```
Phản hồi mẫu:
```json
{
  "status": "ok",
  "timestamp": 1729740000000,
  "adminConnected": true,
  "env": "production"
}
```
- `status: "ok"`: Express đang hoạt động bình thường.
- `adminConnected: true`: Firebase Admin SDK đã xác thực thành công qua Service Account.

---

## 4. Danh Sách Lỗ Hổng Bảo Mật Đã Được Khắc Phục
1. **Một nguồn sự thật duy nhất (Single Source of Truth)**: Toàn bộ số dư điểm ảo PP lưu tại `wallets/{uid}/pp`. Quyền `.write: false` tuyệt đối cho client, chỉ Admin SDK trên server được ghi.
2. **Khắc phục lỗi 404 GitHub Pages**: Dọn sạch các script redirect cũ sang `/docs/`, xây dựng pipeline `.github/workflows/pages.yml` chuẩn GitHub Actions Artifact.
3. **CORS & Trust Proxy**: Bật CORS cho phép các domain `github.io` và `localhost`, bật `trust proxy` bảo vệ IP và rate limit.
4. **Bảo mật Game & Chống Hack**: Toàn bộ kết quả xúc xắc, bóng đá, đua ngựa, roulette, gắp thú và crash được tính toán bằng `crypto.randomInt` trên server.
