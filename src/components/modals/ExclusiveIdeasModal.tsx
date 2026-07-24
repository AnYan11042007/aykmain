/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Zap, Flame, Trophy, Bot, Target, Shield, Award, Gamepad2, Compass, BookOpen } from 'lucide-react';

interface ExclusiveIdeasModalProps {
  onClose: () => void;
}

export const EXCLUSIVE_50_IDEAS = [
  // --- ACADEMIC & SKILLS (10 Ý TƯỞNG HỌC TẬP) ---
  { id: 1, title: 'AI Gia Sư Tri Thức Gemini 24/7', cat: 'ACADEMIC', desc: 'Trợ lý AI Gemini hỗ trợ giải đáp bài tập, ôn thi trắc nghiệm, giải thích mã nguồn IT và tư vấn hướng nghiệp sinh viên.' },
  { id: 2, title: 'Bể Trắc Nghiệm Tri Thức Nhận Thưởng', cat: 'ACADEMIC', desc: 'Sân chơi ôn tập kiến thức chuyên ngành do Giảng viên biên soạn, sinh viên trả lời đúng tích lũy điểm thưởng PP & XP.' },
  { id: 3, title: 'Lộ Trình Tự Học Lập Trình & Skills', cat: 'ACADEMIC', desc: 'Cẩm nang sơ đồ tư duy (Roadmap) học Front-end, Back-end, AI Engineering & Kỹ năng mềm cho sinh viên từ Zero đến Hero.' },
  { id: 4, title: 'Đấu Trí Tri Thức Realtime 1v1', cat: 'ACADEMIC', desc: 'Thách đấu trả lời nhanh 5 câu hỏi kiến thức phổ thông và chuyên ngành giữa 2 sinh viên trong 30 giây kịch tính.' },
  { id: 5, title: 'Thư Viện Đề Thi & Giáo Trình S88', cat: 'ACADEMIC', desc: 'Kho lưu trữ tài liệu, đề thi mẫu, bài giảng slide và đồ án xuất sắc từ các khóa trước hoàn toàn miễn phí.' },
  { id: 6, title: 'Thẻ Từ Vựng Flashcard Thuật Ngữ IT', cat: 'ACADEMIC', desc: 'Bộ thẻ lật thông minh luyện từ vựng Tiếng Anh chuyên ngành CNTT, Kinh Tế và kỹ thuật theo phương pháp Lặp Lại Ngắt Quãng.' },
  { id: 7, title: 'Phòng Tự Học Lofi Study Room', cat: 'ACADEMIC', desc: 'Không gian học tập ảo kết hợp âm thanh Lofi mưa đêm, đồng hồ Pomodoro 25/5 phút và danh sách việc cần làm (To-Do List).' },
  { id: 8, title: 'AI Tạo CV Sinh Viên Chuyên Nghiệp', cat: 'ACADEMIC', desc: 'Công cụ AI phân tích mô tả công việc, tối ưu hóa CV chuẩn ATS giúp sinh viên ứng tuyển thực tập thành công.' },
  { id: 9, title: 'Câu Lạc Bộ Nghiên Cứu AI & Code', cat: 'ACADEMIC', desc: 'Góc giao lưu chia sẻ các Prompt hay, thủ thuật lập trình, thư viện mã nguồn mở và tin tức công nghệ mới nhất.' },
  { id: 10, title: 'Bảng Xếp Hạng Học Bá S88', cat: 'ACADEMIC', desc: 'Vinh danh Top 10 sinh viên đạt điểm số trắc nghiệm cao nhất tuần với huy hiệu "Học Bá Tri Thức" trên thẻ sinh viên.' },

  // --- GAME & GIẢI TRÍ ĐỈNH CAO (15 Ý TƯỞNG GAME) ---
  { id: 11, title: 'Bát Vàng Tài Xỉu S88 ELITE', cat: 'GAME', desc: 'Sảnh cược Tài Xỉu đẳng cấp với Bát Vàng Rồng Phượng, bàn cược đa dạng (Đôi, Ba, Tổng 4-17) và nặn kết quả kéo thả bát.' },
  { id: 12, title: 'Đấu Trường Thẻ Bài 1v1 Tactical Arena', cat: 'GAME', desc: 'Trận chiến thẻ bài chiến thuật turn-based 50+ lá bài, khắc chế thuộc tính (Lửa, Nước, Đất, Sét), kỹ năng SS và khung bài 3D.' },
  { id: 13, title: 'Sút Phạt 3D Luân Lưu World Cup', cat: 'GAME', desc: 'Mô phỏng sút bóng 3D vật lý thực tế, căn lực & xoáy quỹ đạo bóng qua hàng rào thủ môn AI phản xạ nhanh.' },
  { id: 14, title: 'Săn Thú Cổ Đại World Boss Map', cat: 'GAME', desc: 'Bản đồ săn Boss Rồng Cổ Đại live canvas với nút xả đạn QTE Combo, sát thương chí mạng 2X dồn húp hàng tỷ PP.' },
  { id: 15, title: 'Phi Thuyền Không Chiến Crash', cat: 'GAME', desc: 'Trò chơi cất cánh nhân hệ số real-time, nút Nhảy Dù rút vốn ăn thưởng tức thì trước khi phi thuyền phát nổ.' },
  { id: 16, title: 'Đua Ngựa Hoàng Gia Royal Derby', cat: 'GAME', desc: 'Đường đua 4 chiến mã với bước chạy tăng tốc bứt phá ngẫu nhiên và hệ thống soi kèo bình luận viên sôi động.' },
  { id: 17, title: 'Blackjack Sòng Bài S88 21 Điểm', cat: 'GAME', desc: 'Sòng bài Xì Dách nhiều người chơi, Dealer AI chia bài tự động, tính năng cược gấp đôi (Double) và tách bài (Split).' },
  { id: 18, title: 'Tiến Lên Miền Nam S88 Dân Gian', cat: 'GAME', desc: 'Game bài Tiến Lên dân gian tự động phát hiện sảnh, tứ quý chặt 2, đút mù 3 bích và nhân tiền thưởng gấp bội.' },
  { id: 19, title: 'Roulette Cò Quay 36 Ô Châu Âu', cat: 'GAME', desc: 'Vòng quay Roulette Casino chuẩn với các góc cược Đỏ/Đen, Chẵn/Lẻ, Ô góc và Ô đơn ăn gấp 36 lần tiền cược.' },
  { id: 20, title: 'FC Mobile Soccer 3D Simulation', cat: 'GAME', desc: 'Mô phỏng trận đấu bóng đá chiến thuật 2D/3D giữa đội Đỏ và Xanh với sút xa, chọc khe và ăn mừng bàn thắng.' },
  { id: 21, title: 'Máy Gắp Thú Bông Vật Lý 3D', cat: 'GAME', desc: 'Máy gắp thú bông di chuyển cần gắp gắp gấu bông, rồng vàng nhân x10 tài sản PP mang lại cảm giác vui nhộn.' },
  { id: 22, title: 'Oẳn Tù Tì Xanh Chín 1v1', cat: 'GAME', desc: 'Trò chơi Kéo - Búa - Bao thi đấu trực tiếp giữa các sinh viên hoặc thách đấu Bot AI chọn nước đi thông minh.' },
  { id: 23, title: 'Vòng Quay May Mắn Vòng Nhân Phẩm', cat: 'GAME', desc: 'Vòng quay miễn phí mỗi 24h cơ hội nhận Khung Avatar huyền thoại, Thẻ đổi tên, XP Battle Pass và điểm PP.' },
  { id: 24, title: 'Bida 8 Lỗ Bida Lỗ 3D Physics', cat: 'GAME', desc: 'Trận đấu Bida 8 bóng tính toán góc dội băng, lực ngắm và quỹ đạo bóng chính xác trên bàn bida tiêu chuẩn.' },
  { id: 25, title: 'Bầu Cua Tôm Cáp Dân Gian S88', cat: 'GAME', desc: 'Bàn cược Bầu Cua 6 ô linh vật dân gian truyền thống, lắc xóc đĩa bằng bát ngọc mang lại không khí vui tươi.' },

  // --- CỘNG ĐỒNG & KẾT NỐI (10 Ý TƯỞNG SOCIAL) ---
  { id: 26, title: 'Hệ Thống 100 AI Bots Sinh Động', cat: 'SOCIAL', desc: '100 nhân vật AI Bot có tên gọi, avatar, cấp độ và cá tính riêng tham gia chat, chơi game và đi săn cùng sinh viên.' },
  { id: 27, title: 'Kênh Chat Toàn Trường Live Chat', cat: 'SOCIAL', desc: 'Phòng thảo luận công khai cho sinh viên toàn trường chia sẻ tin tức, thả tim emoji floating và nhắn tin siêu tốc.' },
  { id: 28, title: 'Thẻ Sinh Viên Kỹ Thuật Số S88 Card', cat: 'SOCIAL', desc: 'Hồ sơ cá nhân thiết kế như thẻ sinh viên thông minh với cấp độ Rank, Chuỗi ngày đăng nhập và kho Huy Hiệu.' },
  { id: 29, title: 'Bản Tin Trường Học S88 News Portal', cat: 'SOCIAL', desc: 'Cổng thông tin tin tức, thông báo giảng đường, các cuộc thi sinh viên và sự kiện quan trọng toàn trường.' },
  { id: 30, title: 'Khung Avatar Đa Sắc CSS Cyberpunk', cat: 'SOCIAL', desc: 'Vòng trang trí Avatar hiệu ứng động (Vàng Hoàng Gia, Neon Cầu Vồng, Cyberpunk, Fire Ring, Dragon Aura).' },
  { id: 31, title: 'Tìm Bạn Cùng Tiến (Study Buddy)', cat: 'SOCIAL', desc: 'Hệ thống ghép cặp học tập ngẫu nhiên hoặc theo chuyên ngành giúp sinh viên trao đổi kiến thức và làm đồ án nhóm.' },
  { id: 32, title: 'Chợ Sinh Viên S88 Marketplace', cat: 'SOCIAL', desc: 'Nơi sinh viên trao đổi giáo trình cũ, đồ dùng học tập, thiết kế slide và dịch vụ hỗ trợ bằng điểm thưởng PP.' },
  { id: 33, title: 'Bảng Vinh Danh Sinh Viên Xuất Sắc', cat: 'SOCIAL', desc: 'Tường vinh danh ghi nhận các cá nhân có thành tích xuất sắc trong học tập, đóng góp cộng đồng và giải đấu S88.' },
  { id: 34, title: 'Kênh Chat Riêng Từng Lớp Học', cat: 'SOCIAL', desc: 'Góc thảo luận kín dành riêng cho sinh viên từng mã lớp (S88-SE1, IT-K18) để cập nhật lịch học & đồ án.' },
  { id: 35, title: 'Trạm Phát Thanh S88 Radio Online', cat: 'SOCIAL', desc: 'Kênh âm nhạc trực tuyến kết hợp gửi lời nhắn âm thanh và bài hát yêu thích cho bạn bè trong trường.' },

  // --- TÀI CHÍNH & TIỆN ÍCH (10 Ý TƯỞNG FINANCE) ---
  { id: 36, title: 'Ngân Hàng Sinh Viên S88 Bank', cat: 'FINANCE', desc: 'Gửi tiết kiệm lãi suất kép sinh lời PP hàng giờ, chuyển khoản ngân hàng siêu tốc 0s và hỗ trợ quỹ vay sinh viên.' },
  { id: 37, title: 'Sàn Giao Dịch Vàng & Crypto Simulator', cat: 'FINANCE', desc: 'Mô phỏng thị trường Vàng & Tiền số với biểu đồ nến kline real-time, công cụ phân tích kỹ thuật và lệnh Mua/Bán.' },
  { id: 38, title: 'S-Pass Battle Pass 30 Cấp Mùa Giải', cat: 'FINANCE', desc: 'Hệ thống cấp độ Battle Pass 30 Tier với nhánh Miễn Phí & VIP nhận quà độc quyền (Skin, Khung, Thẻ Bài SS).' },
  { id: 39, title: 'Chuỗi Điểm Danh Streak Nhận Quà', cat: 'FINANCE', desc: 'Mỗi ngày đăng nhập liên tục gia tăng cấp độ Streak, nhân hệ số thưởng PP và XP thưởng mỗi tuần.' },
  { id: 40, title: 'Sổ Cái Lịch Sử Giao Dịch Minh Bạch', cat: 'FINANCE', desc: 'Nhật ký phân tích chi tiết toàn bộ biến động tài sản PP, chuyển tiền, thắng game và lịch sử nhận thưởng.' },
  { id: 41, title: 'Sổ Quản Lý Chi Tiêu Sinh Viên', cat: 'FINANCE', desc: 'Công cụ lập kế hoạch tài chính cá nhân, quản lý tiền trọ, ăn uống, học phí giúp sinh viên không bị "viêm màng túi".' },
  { id: 42, title: 'Mã Quà Tặng Voucher Giftcode S88', cat: 'FINANCE', desc: 'Tính năng nhập mã ưu đãi do Ban Quản Trị hoặc Thầy Cô phát hành để nhận tiền PP và vật phẩm đặc biệt.' },
  { id: 43, title: 'Hệ Thống Nền Kinh Tế Kép PP & XP', cat: 'FINANCE', desc: 'Mô hình kinh tế bền vững tách biệt Portal Points (dùng cược & giao dịch) và XP (dùng thăng cấp uy tín).' },
  { id: 44, title: 'Vòng Quay Đổi Quà Thật Sinh Viên', cat: 'FINANCE', desc: 'Tích lũy điểm cống hiến đổi voucher giảm giá trà sữa, tài khoản học Tiếng Anh và balo sinh viên S88.' },
  { id: 45, title: 'Shield Bảo Vệ Tài Khoản An Toàn', cat: 'FINANCE', desc: 'Cơ chế tự động phát hiện số dư quá thấp, cấp khoản cứu trợ PP miễn phí mỗi ngày giúp sinh viên hồi sinh.' },

  // --- HỆ THỐNG & TRẢI NGHIỆM (5 Ý TƯỞNG SYSTEM) ---
  { id: 46, title: 'Bảng Điều Khiển Admin Master Portal', cat: 'SYSTEM', desc: 'Hệ thống quản trị toàn năng cho Giảng viên quản lý danh sách sinh viên, duyệt bài viết, chỉnh PP và xuất báo cáo.' },
  { id: 47, title: 'Ngân Hàng 20 Nhiệm Vụ Hàng Ngày', cat: 'SYSTEM', desc: 'Kho nhiệm vụ phong phú ngẫu nhiên mỗi 24h từ chơi minigame, học tập, gửi lời nhắn đến duy trì chuỗi Streak.' },
  { id: 48, title: 'Trình Phát Nhạc Lo-Fi Ambient Player', cat: 'SYSTEM', desc: 'Trình phát nhạc nền chất lượng cao tích hợp ngay trên Header với danh sách nhạc Lofi, EDM và tính năng đổi bài.' },
  { id: 49, title: 'Chế Độ Cửa Sổ Nổi PIP Live Casino', cat: 'SYSTEM', desc: 'Cửa sổ thu nhỏ Picture-in-Picture cho phép vừa xem Live Stream Tài Xỉu vừa đọc báo hay làm bài tập.' },
  { id: 50, title: 'Chế Độ Resilient Offline Cache', cat: 'SYSTEM', desc: 'Tự động lưu trữ dữ liệu cục bộ (localStorage) giúp ứng dụng chạy mượt mà ngay cả khi kết nối mạng chập chờn.' },
];

export default function ExclusiveIdeasModal({ onClose }: ExclusiveIdeasModalProps) {
  const [selectedCat, setSelectedCat] = useState<string>('ALL');

  const categories = ['ALL', 'ACADEMIC', 'GAME', 'SOCIAL', 'FINANCE', 'SYSTEM'];

  const filtered = selectedCat === 'ALL'
    ? EXCLUSIVE_50_IDEAS
    : EXCLUSIVE_50_IDEAS.filter((i) => i.cat === selectedCat);

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 font-mono select-none animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#080c14] border border-cyan-500/40 rounded-3xl p-6 md:p-8 flex flex-col shadow-[0_0_80px_rgba(0,240,255,0.25)] overflow-hidden">
        
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-5 mb-5 shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold rounded-full uppercase tracking-widest mb-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              ĐỘC QUYỀN S88 SERVER
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <Trophy className="w-7 h-7 text-yellow-400 animate-bounce" />
              50 Ý TƯỞNG & TÍNH NĂNG ĐỘC QUYỀN S88
            </h2>
            <p className="text-slate-400 text-xs font-sans mt-1">
              Khám phá trọn bộ 50 tính năng đỉnh cao đã được hiện thực hóa đầy đủ trên Server AYK8686!
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 border border-white/10 hover:bg-white/15 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-4 shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
                selectedCat === cat
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid List */}
        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-4 scrollbar-thin scrollbar-thumb-cyan-500/30">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-slate-950/80 border border-white/10 hover:border-cyan-500/50 rounded-2xl transition duration-300 group flex flex-col justify-between hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                    #{item.id.toString().padStart(2, '0')} // {item.cat}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition uppercase tracking-wide">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-1.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between shrink-0 text-xs text-slate-400 font-sans">
          <span>Server AYK8686 - Đã vận hành 100 AI Bots & 50 Tính năng sẵn sàng 24/7.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-mono font-black rounded-xl hover:brightness-110 transition cursor-pointer"
          >
            ĐÓNG KHÁM PHÁ
          </button>
        </div>

      </div>
    </div>
  );
}
