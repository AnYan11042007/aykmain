# Kế hoạch Tái cấu trúc & Nâng cấp Toàn diện AYK MAIN 8686

Kế hoạch tái thiết kế bảo mật, kiến trúc backend server-authoritative, chuẩn hóa trải nghiệm mini-game học đường và tối ưu mã nguồn cho hệ thống AYK MAIN 8686 theo đúng 4 nhóm ưu tiên.

***

## Quyết định Đã Thống nhất & Định hướng Triển khai

> [!IMPORTANT]
> Dựa trên phản hồi trong bước làm rõ yêu cầu, các quyết định kiến trúc chính đã được chốt như sau:
> - **Mini-game**: Giữ lại các trò chơi tương tác hiện có nhưng áp dụng **giới hạn cược trần giải trí** (tránh cờ bạc hóa, cấm quy đổi giá trị ngoài đời), đổi mới danh hiệu và giao diện sang phong cách thi đua học thuật/học đường.
> - **Kiến trúc Triển khai**: Triển khai theo mô hình **Full-stack container trên Cloud Run** (chạy Express server phục vụ API xác thực, proxy Gemini 2.5 Flash, xử lý giao dịch PP an toàn và serve Vite build).
> - **Chuyển đổi Firebase Authentication**: Tự động liên kết tài khoản định danh hiện tại (`username`) thành email nội bộ định danh hệ thống (`${username}@ayk8686.internal`) để bảo toàn dữ liệu hồ sơ, cấp độ và tài sản của người dùng mà không làm gián đoạn trải nghiệm đăng nhập.

***

## 1. Tổng quan & Mục tiêu Cốt lõi

- **Mục tiêu**: Loại bỏ triệt để các lỗ hổng bảo mật nghiêm trọng (lưu mật khẩu dạng thô `pass`, reset mật khẩu về `123`, client-side tự ghi đè số dư `pp`), ngăn chặn gian lận, xóa bot ảo/chat rác, cấu trúc lại mã nguồn sạch sẽ, dễ bảo trì và sẵn sàng cho môi trường trường học.
- **Đối tượng**: Sinh viên và giảng viên/quản trị viên học viện AYK 8686.
- **Giá trị đem lại**: Hệ sinh thái học tập kết hợp giải trí lành mạnh, bảo mật đa lớp, số dư điểm thưởng (PP) được kiểm soát bởi server không thể can thiệp từ DevTools, vận hành ổn định trên Cloud Run.

***

## 2. Trải nghiệm Người dùng & Giao diện

- **Trải nghiệm Đăng nhập**: Giao diện đăng nhập giữ nét nhận diện Cyberpunk học viện nhưng bảo mật bằng Firebase Auth (ẩn hoàn toàn mật khẩu thô trong cơ sở dữ liệu), có cơ chế khôi phục mật khẩu chuẩn qua liên kết an toàn hoặc mã xác thực OTP thay vì reset cứng về `'123'`.
- **Bộ Danh hiệu & Mini-game Học đường**:
  - Đổi các danh hiệu mang hơi hướng sòng bạc (ví dụ: *"Thần Bài Las Vegas"*, *"Ông Trùm Cờ Bạc"*) thành danh hiệu học thuật & thử thách trí tuệ: *"Bậc Thầy Toán Xác Suất"*, *"Thủ Khoa Trí Tuệ"*, *"Chiến Thần Đấu Trí"*, *"Học Giả Xuất Sắc"*.
  - Các mini-game Tài Xỉu, Phi Thuyền, Sút Phạt, Vòng Quay áp dụng trần cược nội bộ (tối đa theo hạn mức cấp độ sinh viên), hiển thị rõ thông điệp rèn luyện tư duy xác suất và tính toán logic.
- **Cộng đồng Thật 100%**: Xóa hoàn toàn 20 bot tự sinh tin nhắn và cược ảo trong khung chat, đảm bảo bảng xếp hạng và lịch sử cược chỉ phản ánh tương tác của sinh viên thật trong trường.

***

## 3. Kiến trúc Kỹ thuật & Luồng Xử lý Dữ liệu

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT (React 19 + Vite)             │
│  - Firebase Auth SDK (Email: username@ayk8686.internal) │
│  - Không còn quyền ghi trực tiếp pp, role, xp          │
│  - Gọi REST API server để thực hiện cược & nhiệm vụ    │
└───────────────────────────┬────────────────────────────┘
                            │ Bearer Firebase ID Token
                            ▼
┌────────────────────────────────────────────────────────┐
│              SERVER (Express Full-Stack / Node 20)     │
│  - verifyIdToken xác thực danh tính người dùng         │
│  - Environment Variables (.env) cho mọi secret & config │
│  - crypto.randomInt sinh kết quả ngẫu nhiên bảo mật    │
│  - Firebase Admin SDK Transaction cập nhật PP & XP     │
│  - Gemini 2.5 Flash Proxy (AI Gia sư & AI Chat)        │
└───────────────────────────┬────────────────────────────┘
                            │ Admin Privileges
                            ▼
┌────────────────────────────────────────────────────────┐
│           FIREBASE REALTIME DATABASE (asia-southeast1) │
│  - database.rules.json:                                │
│      * auth != null                                    │
│      * users/$uid: Chỉ user đó được đọc                │
│      * pp, role, xp, locked: .write = false (Admin only)│
│      * Admin custom claims kiểm tra role ADMIN         │
└────────────────────────────────────────────────────────┘
```

***

## 4. Lộ trình Thực hiện Chi tiết Theo 4 Bước Ưu tiên

### BƯỚC 1: BẢO MẬT HỆ THỐNG & DỮ LIỆU
1. **Firebase Authentication & Khai trừ Mật khẩu Plaintext**:
   - Cấu hình Firebase Auth client & server.
   - Viết cơ chế đăng ký / đăng nhập dùng email ảo định danh `${username}@ayk8686.internal` với mật khẩu mã hóa an toàn qua Firebase Auth.
   - Xóa bỏ trường `pass` trong node `users/{uid}/pass` và loại bỏ hoàn toàn chức năng reset mật khẩu về `'123'` trong Admin portal.
2. **Thiết lập database.rules.json Nghiêm ngặt**:
   - Khóa toàn bộ quyền tự ý ghi đè `pp`, `role`, `xp`, `locked`, `isPremiumBattlePass` từ client.
   - Chỉ cho phép người dùng đọc dữ liệu của chính mình (ngoại trừ các trường public cho bảng xếp hạng như tên, avatar, cấp độ, khung).
   - Kiểm tra `auth.token.admin === true` cho các thao tác quản trị.
3. **Chuyển Toàn bộ Logic PP & Thưởng sang Server Express**:
   - Xây dựng các route `/api/game/bet-taixiu`, `/api/game/bet-penalty`, `/api/game/bet-airplane`, `/api/missions/claim`, v.v.
   - Sử dụng `crypto.randomInt` (thay thế hoàn toàn `Math.random` và các hàm sin dự đoán được).
   - Sử dụng atomic transaction để loại trừ race condition khi người dùng nhấn cược liên tục.
4. **Bảo mật Biến môi trường**:
   - Đưa `FIREBASE_API_KEY`, `FIREBASE_DATABASE_URL`, `FIREBASE_PROJECT_ID`, `GEMINI_API_KEY` vào `.env` và `.env.example`.
   - Xóa bỏ mọi chuỗi khóa API hard-code trong `server.ts` và `src/firebase.ts`.

### BƯỚC 2: CHUẨN HÓA GAME & MÔI TRƯỜNG HỌC ĐƯỜNG
1. **Xóa Bỏ Mã Cheat & Phím tắt Lén lút**:
   - Xóa listener `Ctrl+Shift+A` và các logic can thiệp kết quả game (`s88_cheat_*`, backdoor tài khoản admin).
2. **Loại bỏ Hoàn toàn Bot Ảo**:
   - Xóa bỏ `AIBotSimulation.tsx` ở client.
   - Xóa bỏ `seedAIBots()` và `startAIBotSimulator()` trong `server.ts` (không còn bot tự đặt cược và spam chat).
3. **Chuẩn hóa Học đường & Hạn mức Cược**:
   - Đổi danh hiệu sòng bài thành danh hiệu học viện tri thức.
   - Áp dụng hạn mức cược trần giải trí tối đa (ví dụ tối đa 20,000 PP/lần cược), hiển thị cảnh báo giải trí điều độ.

### BƯỚC 3: DỌN DẸP MÃ NGUỒN & MODULARIZE
1. **Xóa File Rác ở Thư mục Gốc**:
   - Xóa toàn bộ: `fix_*.cjs`, `make_*.cjs`, `move_to_*.cjs`, `parse.js`, `revert_thumbnails.cjs`, `update_livestream.cjs`.
2. **Phân rã Component Quá khổ (< 400 dòng)**:
   - `AdminPortal.tsx` (~2800 dòng) ➔ Tách thành các sub-tabs: AdminGeneral, AdminQuests, AdminMarketplace, AdminAudits.
   - `WorldCardBattleModal.tsx` ➔ Tách CardDeck, BattleArena, BattleEffects.
   - `LiveStreamPanel.tsx` ➔ Tách VideoPlayer, StreamChat, BettingControls.
   - Hợp nhất `DailyMissions` / `DailyMissionsPortal` và `BattlePass` / `BattlePassPortal`.
3. **Cấu hình Chất lượng Mã nguồn**:
   - Cập nhật `name` trong `package.json` thành `"ayk-main-8686"`.
   - Cấu hình ESLint chuẩn và viết test case (sử dụng Vitest/Node test runner) kiểm tra tính đúng đắn của logic tính toán cộng trừ PP và transaction.

### BƯỚC 4: TRIỂN KHAI (DEPLOYMENT)
1. **Cập nhật Dockerfile / GitHub Actions**:
   - Sửa file `.github/workflows/deploy.yml` chuyển từ deploy static GitHub Pages sang containerized build hỗ trợ deploy Cloud Run.
   - Đảm bảo dev server và production server (`npm run build && npm start`) khởi chạy mượt mà trên môi trường container.

***

## 5. Quy trình Báo cáo

Sau khi người dùng nhấn duyệt kế hoạch (Proceed), hệ thống sẽ tiến hành tuần tự từng bước từ Bước 1 đến Bước 4. Sau mỗi bước hoàn tất, hệ thống sẽ kiểm tra biên dịch (`compile_applet`) và báo cáo cụ thể danh sách các file đã được chỉnh sửa/thêm mới.
