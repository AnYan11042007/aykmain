/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Zap, Flame, Trophy, Bot, Target, Shield, Award, Gamepad2, Compass, BookOpen } from 'lucide-react';

interface ExclusiveIdeasModalProps {
  onClose: () => void;
}

export const EXCLUSIVE_100_IDEAS = [
  // --- ACADEMIC & SKILLS (20 Ý TƯỞNG HỌC TẬP) ---
  { id: 1, title: 'AI Gia Sư Tri Thức Gemini 24/7', cat: 'ACADEMIC', desc: 'Trợ lý AI Gemini hỗ trợ giải đáp bài tập, ôn thi trắc nghiệm, giải thích mã nguồn IT và tư vấn hướng nghiệp sinh viên.' },
  { id: 2, title: 'Bể Trắc Nghiệm Tri Thức Nhận Thưởng', cat: 'ACADEMIC', desc: 'Sân chơi ôn tập kiến thức chuyên ngành do Giảng viên biên soạn, sinh viên trả lời đúng tích lũy điểm thưởng PP & XP.' },
  { id: 3, title: 'Lộ Trình Tự Học Lập Trình & Skills', cat: 'ACADEMIC', desc: 'Cẩm nang sơ đồ tư duy (Roadmap) học Front-end, Back-end, AI Engineering & Kỹ năng mềm cho sinh viên từ Zero đến Hero.' },
  { id: 4, title: 'Đấu Trí Tri Thức Realtime 1v1', cat: 'ACADEMIC', desc: 'Thách đấu trả lời nhanh 5 câu hỏi kiến thức phổ thông và chuyên ngành giữa 2 sinh viên trong 30 giây kịch tính.' },
  { id: 5, title: 'Thư Viện Đề Thi & Giáo Trình AYK', cat: 'ACADEMIC', desc: 'Kho lưu trữ tài liệu, đề thi mẫu, bài giảng slide và đồ án xuất sắc từ các khóa trước hoàn toàn miễn phí.' },
  { id: 6, title: 'Thẻ Từ Vựng Flashcard Thuật Ngữ IT', cat: 'ACADEMIC', desc: 'Bộ thẻ lật thông minh luyện từ vựng Tiếng Anh chuyên ngành CNTT, Kinh Tế và kỹ thuật theo phương pháp Lặp Lại Ngắt Quãng.' },
  { id: 7, title: 'Phòng Tự Học Lofi Study Room', cat: 'ACADEMIC', desc: 'Không gian học tập ảo kết hợp âm thanh Lofi mưa đêm, đồng hồ Pomodoro 25/5 phút và danh sách việc cần làm (To-Do List).' },
  { id: 8, title: 'AI Tạo CV Sinh Viên Chuyên Nghiệp', cat: 'ACADEMIC', desc: 'Công cụ AI phân tích mô tả công việc, tối ưu hóa CV chuẩn ATS giúp sinh viên ứng tuyển thực tập thành công.' },
  { id: 9, title: 'Câu Lạc Bộ Nghiên Cứu AI & Code', cat: 'ACADEMIC', desc: 'Góc giao lưu chia sẻ các Prompt hay, thủ thuật lập trình, thư viện mã nguồn mở và tin tức công nghệ mới nhất.' },
  { id: 10, title: 'Bảng Xếp Hạng Học Bá AYK', cat: 'ACADEMIC', desc: 'Vinh danh Top 10 sinh viên đạt điểm số trắc nghiệm cao nhất tuần với huy hiệu "Học Bá Tri Thức" trên thẻ sinh viên.' },
  { id: 11, title: 'AI Sửa Lỗi Code & Refactor Tự Động', cat: 'ACADEMIC', desc: 'Trợ lý quét lỗi cú pháp, tối ưu hiệu năng thuật toán và gợi ý đoạn mã sạch chuẩn Clean Code cho bài tập lập trình.' },
  { id: 12, title: 'Cuộc Thi Code Challenge Hàng Tuần', cat: 'ACADEMIC', desc: 'Giải đấu giải thuật thuật toán lập trình nhanh cho sinh viên với bảng xếp hạng cúp vàng và tiền thưởng PP hấp dẫn.' },
  { id: 13, title: 'Phòng Thi Đồ Án Virtual Sandbox', cat: 'ACADEMIC', desc: 'Môi trường mô phỏng ảo cho phép sinh viên chạy thử nghiệm đồ án môn học, kiểm thử API và demo sản phẩm.' },
  { id: 14, title: 'Mentor Ghép Đôi Anh Chị Khóa Trên', cat: 'ACADEMIC', desc: 'Hệ thống kết nối sinh viên năm 1-2 với cựu sinh viên & anh chị khóa trước để tư vấn định hướng công việc.' },
  { id: 15, title: 'Sổ Tay Thuật Ngữ Tri Thức Đa Ngành', cat: 'ACADEMIC', desc: 'Bách khoa toàn thư tra cứu nhanh 5,000+ thuật ngữ chuyên ngành Kinh tế, Kỹ thuật, Y dược và Thiết kế đồ họa.' },
  { id: 16, title: 'Bảng Phân Tích Điểm Mạnh Học Tập AI', cat: 'ACADEMIC', desc: 'Biểu đồ radar trực quan phân tích tiến độ tích lũy kỹ năng, điểm mạnh chuyên môn và gợi ý lộ trình cải thiện.' },
  { id: 17, title: 'Thi Đố Vui Kiến Thức AYK Trivia', cat: 'ACADEMIC', desc: 'Đấu trường Trivia 100 người chơi cùng lúc trả lời câu hỏi trắc nghiệm nhanh nhận giải thưởng tổng quỹ PP.' },
  { id: 18, title: 'Trợ Lý Lập Kế Hoạch Học Kỳ AYK', cat: 'ACADEMIC', desc: 'Tự động tính toán điểm trung bình GPA, gợi ý đăng ký môn học và nhắc nhở lịch thi sắp tới.' },
  { id: 19, title: 'Thư Viện Bài Báo Khoa Học & AI Summary', cat: 'ACADEMIC', desc: 'Tóm tắt nội dung các bài nghiên cứu khoa học quốc tế chỉ trong 3 dòng bằng AI giúp sinh viên tiết kiệm thời gian.' },
  { id: 20, title: 'Phòng Thảo Luận Đồ Án Live Audio', cat: 'ACADEMIC', desc: 'Phòng đàm thoại thoại nhóm trực tiếp hỗ trợ chia sẻ màn hình và ghi chú bảng trắng tương tác.' },

  // --- GAME & GIẢI TRÍ ĐỈNH CAO (30 Ý TƯỞNG GAME) ---
  { id: 21, title: 'Bát Vàng Tài Xỉu AYK ELITE', cat: 'GAME', desc: 'Sảnh cược Tài Xỉu đẳng cấp với Bát Vàng Rồng Phượng, bàn cược đa dạng (Đôi, Ba, Tổng 4-17) và nặn kết quả kéo thả bát.' },
  { id: 22, title: 'Đấu Trường Thẻ Bài 1v1 Tactical Arena', cat: 'GAME', desc: 'Trận chiến thẻ bài chiến thuật turn-based 50+ lá bài, khắc chế thuộc tính (Lửa, Nước, Đất, Sét), kỹ năng SS và khung bài 3D.' },
  { id: 23, title: 'Sút Phạt 3D Luân Lưu World Cup', cat: 'GAME', desc: 'Mô phỏng sút bóng 3D vật lý thực tế, căn lực & xoáy quỹ đạo bóng qua hàng rào thủ môn AI phản xạ nhanh.' },
  { id: 24, title: 'Săn Thú Cổ Đại World Boss Map', cat: 'GAME', desc: 'Bản đồ săn Boss Rồng Cổ Đại live canvas với nút xả đạn QTE Combo, sát thương chí mạng 2X dồn húp hàng tỷ PP.' },
  { id: 25, title: 'Phi Thuyền Không Chiến Crash', cat: 'GAME', desc: 'Trò chơi cất cánh nhân hệ số real-time, máy bay bị tên lửa địch truy kích phía sau, nút Nhảy Dù rút vốn ăn thưởng tức thì.' },
  { id: 26, title: 'Đua Ngựa Hoàng Gia Royal Derby', cat: 'GAME', desc: 'Đường đua 4 chiến mã với bước chạy tăng tốc bứt phá ngẫu nhiên và hệ thống soi kèo bình luận viên sôi động.' },
  { id: 27, title: 'Blackjack Sòng Bài AYK 21 Điểm', cat: 'GAME', desc: 'Sòng bài Xì Dách nhiều người chơi, Dealer AI chia bài tự động, tính năng cược gấp đôi (Double) và tách bài (Split).' },
  { id: 28, title: 'Tiến Lên Miền Nam AYK Dân Gian', cat: 'GAME', desc: 'Game bài Tiến Lên dân gian tự động phát hiện sảnh, tứ quý chặt 2, đút mù 3 bích và nhân tiền thưởng gấp bội.' },
  { id: 29, title: 'Roulette Cò Quay 36 Ô Châu Âu', cat: 'GAME', desc: 'Vòng quay Roulette Casino chuẩn với các góc cược Đỏ/Đen, Chẵn/Lẻ, Ô góc và Ô đơn ăn gấp 36 lần tiền cược.' },
  { id: 30, title: 'FC Mobile Soccer 3D Simulation', cat: 'GAME', desc: 'Mô phỏng trận đấu bóng đá chiến thuật 2D/3D giữa đội Đỏ và Xanh với sút xa, chọc khe và ăn mừng bàn thắng.' },
  { id: 31, title: 'Máy Gắp Thú Bông Vật Lý 3D', cat: 'GAME', desc: 'Máy gắp thú bông di chuyển cần gắp gắp gấu bông, rồng vàng nhân x10 tài sản PP mang lại cảm giác vui nhộn.' },
  { id: 32, title: 'Oẳn Tù Tì Xanh Chín 1v1', cat: 'GAME', desc: 'Trò chơi Kéo - Búa - Bao thi đấu trực tiếp giữa các sinh viên hoặc thách đấu Bot AI chọn nước đi thông minh.' },
  { id: 33, title: 'Vòng Quay May Mắn Vòng Nhân Phẩm', cat: 'GAME', desc: 'Vòng quay miễn phí mỗi 24h cơ hội nhận Khung Avatar huyền thoại, Thẻ đổi tên, XP Battle Pass và điểm PP.' },
  { id: 34, title: 'Bida 8 Lỗ Bida Lỗ 3D Physics', cat: 'GAME', desc: 'Trận đấu Bida 8 bóng tính toán góc dội băng, lực ngắm và quỹ đạo bóng chính xác trên bàn bida tiêu chuẩn.' },
  { id: 35, title: 'Bầu Cua Tôm Cáp Dân Gian AYK', cat: 'GAME', desc: 'Bàn cược Bầu Cua 6 ô linh vật dân gian truyền thống, lắc xóc đĩa bằng bát ngọc mang lại không khí vui tươi.' },
  { id: 36, title: 'Đua Xe Bắn Súng Death Race Cyber', cat: 'GAME', desc: 'Trò chơi đua xe tốc độ cao kết hợp vật phẩm tên lửa nhắm bắn đối thủ trên đường đua Cyberpunk 3D.' },
  { id: 37, title: 'Sicbo Xí Ngầu Ngầu Hát VIP', cat: 'GAME', desc: 'Sảnh Sicbo lắc 3 viên xí ngầu xúc xắc với 20+ ô cược bão, cược tổng điểm và tỷ lệ thưởng x180 cực lớn.' },
  { id: 38, title: 'Xóc Đĩa 3D Live Arena', cat: 'GAME', desc: 'Trò chơi dân gian Xóc Đĩa bát ngọc 4 quân vị Chẵn/Lẻ, 3 Đỏ 1 Trắng, 4 Đỏ ăn thưởng gấp 12 lần.' },
  { id: 39, title: 'Bắn Cá Rồng Vàng Ocean Hunter', cat: 'GAME', desc: 'Thủy cung săn cá 3D đa dạng loại súng khẩu pháo, săn Cá Cụ, Cá Rồng Thần nổ hũ nhận điểm thưởng cuồng nhiệt.' },
  { id: 40, title: 'Đấu Trí Cờ Vua & Cờ Tướng AI Master', cat: 'GAME', desc: 'Trận đấu cờ nghệ thuật thách đấu AI Stockfish với 10 cấp độ từ Tập Sự đến Đại Sư Cờ Quốc Tế.' },
  { id: 41, title: 'Nổ Hũ Jackpot Rồng Thần 1 Tỷ PP', cat: 'GAME', desc: 'Máy quay hũ Slot Machine 5 cột với biểu tượng Wild, Scatter, cơ hội Nổ Hũ Jackpot toàn server cực khủng.' },
  { id: 42, title: 'Tháp Nhảy Dù Jump Tower', cat: 'GAME', desc: 'Thử thách trèo tháp mạo hiểm mỗi tầng gấp đôi tiền thưởng, chọn nhầm ô bẫy sẽ ngã núi mất trắng.' },
  { id: 43, title: 'Đột Kích Mìn Minesweeper Thưởng', cat: 'GAME', desc: 'Bàn cờ dò mìn 5x5 tự chọn số lượng mìn, mở càng nhiều ô an toàn số nhân lợi nhuận càng tăng cao.' },
  { id: 44, title: 'Đào Vàng AYK Gold Miner Retro', cat: 'GAME', desc: 'Thả lưỡi câu gắp cục vàng to, kim cương và túi quà may mắn vượt qua chướng ngại vật đá hộc.' },
  { id: 45, title: 'Săn Bão Tuyết Snowboard Rush', cat: 'GAME', desc: 'Lướt ván trên đồi tuyết nghiêng né tránh chướng ngại vật và nhặt đồng xu vàng tăng tốc độ.' },
  { id: 46, title: 'Bão Từ Trường Sci-Fi Laser', cat: 'GAME', desc: 'Né tránh các tia laser đỏ quét ngang dọc màn hình, sống sót càng lâu tiền thưởng nhân gấp bội.' },
  { id: 47, title: 'Bắn Cung Tâm Ngắm Archery Champion', cat: 'GAME', desc: 'Căn hướng gió và tầm ngắm bắn mũi tên vào tâm bia 10 điểm trong các điều kiện thời tiết phức tạp.' },
  { id: 48, title: 'Cờ Tỷ Phú AYK Campus Edition', cat: 'GAME', desc: 'Bàn cờ mua đất xây dựng ký túc xá, thư viện, canteen và thu tiền thuê đất của bạn bè sinh viên.' },
  { id: 49, title: 'Thử Thách Xếp Hình Tetris Classic', cat: 'GAME', desc: 'Game xếp khối gạch cổ điển tốc độ tăng dần, ăn 4 hàng ngang combo ghi điểm số kỷ lục.' },
  { id: 50, title: 'Võ Đường Võ Sĩ Thẻ Bài Mortal Combat', cat: 'GAME', desc: 'Đối kháng võ thuật 1v1 bằng thẻ bài đòn đánh, đỡ đòn, phản công và tuyệt chiêu kết liễu đẹp mắt.' },

  // --- CỘNG ĐỒNG & KẾT NỐI (20 Ý TƯỞNG SOCIAL) ---
  { id: 51, title: 'Hệ Thống 100 AI Bots Sinh Động', cat: 'SOCIAL', desc: '100 nhân vật AI Bot có tên gọi, avatar, cấp độ và cá tính riêng tham gia chat, chơi game và đi săn cùng sinh viên.' },
  { id: 52, title: 'Kênh Chat Toàn Trường Live Chat', cat: 'SOCIAL', desc: 'Phòng thảo luận công khai cho sinh viên toàn trường chia sẻ tin tức, thả tim emoji floating và nhắn tin siêu tốc.' },
  { id: 53, title: 'Thẻ Sinh Viên Kỹ Thuật Số AYK Card', cat: 'SOCIAL', desc: 'Hồ sơ cá nhân thiết kế như thẻ sinh viên thông minh với cấp độ Rank, Chuỗi ngày đăng nhập và kho Huy Hiệu.' },
  { id: 54, title: 'Bản Tin Trường Học AYK News Portal', cat: 'SOCIAL', desc: 'Cổng thông tin tin tức, thông báo giảng đường, các cuộc thi sinh viên và sự kiện quan trọng toàn trường.' },
  { id: 55, title: 'Khung Avatar Đa Sắc CSS Cyberpunk', cat: 'SOCIAL', desc: 'Vòng trang trí Avatar hiệu ứng động (Vàng Hoàng Gia, Neon Cầu Vồng, Cyberpunk, Fire Ring, Dragon Aura).' },
  { id: 56, title: 'Tìm Bạn Cùng Tiến (Study Buddy)', cat: 'SOCIAL', desc: 'Hệ thống ghép cặp học tập ngẫu nhiên hoặc theo chuyên ngành giúp sinh viên trao đổi kiến thức và làm đồ án nhóm.' },
  { id: 57, title: 'Chợ Sinh Viên AYK Marketplace', cat: 'SOCIAL', desc: 'Nơi sinh viên trao đổi giáo trình cũ, đồ dùng học tập, thiết kế slide và dịch vụ hỗ trợ bằng điểm thưởng PP.' },
  { id: 58, title: 'Bảng Vinh Danh Sinh Viên Xuất Sắc', cat: 'SOCIAL', desc: 'Tường vinh danh ghi nhận các cá nhân có thành tích xuất sắc trong học tập, đóng góp cộng đồng và giải đấu AYK.' },
  { id: 59, title: 'Kênh Chat Riêng Từng Lớp Học', cat: 'SOCIAL', desc: 'Góc thảo luận kín dành riêng cho sinh viên từng mã lớp (AYK-SE1, IT-K18) để cập nhật lịch học & đồ án.' },
  { id: 60, title: 'Trạm Phát Thanh AYK Radio Online', cat: 'SOCIAL', desc: 'Kênh âm nhạc trực tuyến kết hợp gửi lời nhắn âm thanh và bài hát yêu thích cho bạn bè trong trường.' },
  { id: 61, title: 'Tường Confession Ẩn Danh Sinh Viên', cat: 'SOCIAL', desc: 'Nơi chia sẻ tâm tư, tình cảm và kỷ niệm thời sinh viên hoàn toàn ẩn danh an toàn.' },
  { id: 62, title: 'Đánh Giá & Review Môn Học Trường Lớp', cat: 'SOCIAL', desc: 'Cổng đánh giá môn học, thầy cô và giáo trình giúp tân sinh viên chọn môn phù hợp.' },
  { id: 63, title: 'Hệ Thống Tặng Quà Emoji Bão Hoa', cat: 'SOCIAL', desc: 'Gửi tặng hoa tươi, trà sữa ảo và quà tặng may mắn trực tiếp cho bạn bè trong khung chat.' },
  { id: 64, title: 'Bản Đồ Check-in Cơ Sở Trường AYK', cat: 'SOCIAL', desc: 'Bản đồ ảo check-in các vị trí Thư viện, Canteen, Sân bóng đá và Phòng máy tính.' },
  { id: 65, title: 'Câu Lạc Bộ E-Sports AYK Gaming Guild', cat: 'SOCIAL', desc: 'Bang hội game thủ sinh viên thi đấu giải nội bộ và tích lũy quỹ bang hội mua vật phẩm.' },
  { id: 66, title: 'Sự Kiện Gala Sinh Viên Đêm Hội Live', cat: 'SOCIAL', desc: 'Sự kiện âm nhạc trực tuyến đón tân sinh viên với minigame bốc thăm may mắn trúng quà.' },
  { id: 67, title: 'Bầu Chọn Gương Mặt Sinh Viên Ưu Tú', cat: 'SOCIAL', desc: 'Cuộc thi bình chọn sinh viên năng động, tài năng qua cổng bình chọn điểm uy tín.' },
  { id: 68, title: 'Đăng Nhật Ký Sinh Viên Daily Blog', cat: 'SOCIAL', desc: 'Trang nhật ký cá nhân viết chia sẻ trải nghiệm, hình ảnh và lưu giữ kỷ niệm đại học.' },
  { id: 69, title: 'Phòng Karaoke Sinh Viên Sing Together', cat: 'SOCIAL', desc: 'Phòng hát hò giao lưu âm nhạc tích hợp lyric lời bài hát và chấm điểm giọng hát tự động.' },
  { id: 70, title: 'Hệ Thống Huy Hiệu Danh Dự AYK Badges', cat: 'SOCIAL', desc: 'Bộ sưu tập 50+ huy hiệu độc quyền hoàn thành khi đạt các mốc thành tựu đặc biệt.' },

  // --- TÀI CHÍNH & TIỆN ÍCH (15 Ý TƯỞNG FINANCE) ---
  { id: 71, title: 'Ngân Hàng Sinh Viên AYK Bank', cat: 'FINANCE', desc: 'Gửi tiết kiệm lãi suất kép sinh lời PP hàng giờ, chuyển khoản ngân hàng siêu tốc 0s và hỗ trợ quỹ vay sinh viên.' },
  { id: 72, title: 'Sàn Giao Dịch Vàng & Crypto Simulator', cat: 'FINANCE', desc: 'Mô phỏng thị trường Vàng & Tiền số với biểu đồ nến kline real-time, công cụ phân tích kỹ thuật và lệnh Mua/Bán.' },
  { id: 73, title: 'S-Pass Battle Pass 30 Cấp Mùa Giải', cat: 'FINANCE', desc: 'Hệ thống cấp độ Battle Pass 30 Tier với nhánh Miễn Phí & VIP nhận quà độc quyền (Skin, Khung, Thẻ Bài SS).' },
  { id: 74, title: 'Chuỗi Điểm Danh Streak Nhận Quà', cat: 'FINANCE', desc: 'Mỗi ngày đăng nhập liên tục gia tăng cấp độ Streak, nhân hệ số thưởng PP và XP thưởng mỗi tuần.' },
  { id: 75, title: 'Sổ Cái Lịch Sử Giao Dịch Minh Bạch', cat: 'FINANCE', desc: 'Nhật ký phân tích chi tiết toàn bộ biến động tài sản PP, chuyển tiền, thắng game và lịch sử nhận thưởng.' },
  { id: 76, title: 'Sổ Quản Lý Chi Tiêu Sinh Viên', cat: 'FINANCE', desc: 'Công cụ lập kế hoạch tài chính cá nhân, quản lý tiền trọ, ăn uống, học phí giúp sinh viên không bị "viêm màng túi".' },
  { id: 77, title: 'Mã Quà Tặng Voucher Giftcode AYK', cat: 'FINANCE', desc: 'Tính năng nhập mã ưu đãi do Ban Quản Trị hoặc Thầy Cô phát hành để nhận tiền PP và vật phẩm đặc biệt.' },
  { id: 78, title: 'Hệ Thống Nền Kinh Tế Kép PP & XP', cat: 'FINANCE', desc: 'Mô hình kinh tế bền vững tách biệt Portal Points (dùng cược & giao dịch) và XP (dùng thăng cấp uy tín).' },
  { id: 79, title: 'Vòng Quay Đổi Quà Thật Sinh Viên', cat: 'FINANCE', desc: 'Tích lũy điểm cống hiến đổi voucher giảm giá trà sữa, tài khoản học Tiếng Anh và balo sinh viên AYK.' },
  { id: 80, title: 'Shield Bảo Vệ Tài Khoản An Toàn', cat: 'FINANCE', desc: 'Cơ chế tự động phát hiện số dư quá thấp, cấp khoản cứu trợ PP miễn phí mỗi ngày giúp sinh viên hồi sinh.' },
  { id: 81, title: 'Quỹ Hỗ Trợ Khởi Nghiệp AYK Fund', cat: 'FINANCE', desc: 'Quỹ tài trợ ý tưởng dự án sáng tạo sinh viên với sự đồng hành của giảng viên cố vấn.' },
  { id: 82, title: 'Đầu Tư Cổ Phiếu Giả Lập Stock Market', cat: 'FINANCE', desc: 'Sàn chứng khoán giả lập trải nghiệm giao dịch cổ phiếu các tập đoàn công nghệ lớn.' },
  { id: 83, title: 'Sàn Đấu Giá Vật Phẩm Độc Bản AYK', cat: 'FINANCE', desc: 'Phiên đấu giá ngược vật phẩm hiếm, khung avatar rồng vàng và vật phẩm ingame.' },
];

// --- GENERATE 1000 RICH DIVERSE IDEAS EXPANSION ---
const generate1000Ideas = () => {
  const base = [...EXCLUSIVE_100_IDEAS];

  const topics = {
    ACADEMIC: [
      { name: 'Gia Sư AI Lập Trình React & TypeScript', desc: 'Trợ lý AI hướng dẫn viết Clean Code, kiểm thử Component và tối ưu State Management cho sinh viên.' },
      { name: 'Ôn Thi TOEIC 900+ Listening & Reading', desc: 'Sân luyện thi TOEIC trắc nghiệm tương tác với kho 2,000+ câu hỏi chuẩn ETS có giải thích chi tiết.' },
      { name: 'Mô Phỏng Thực Hành Mạng Máy Tính Cisco', desc: 'Môi trường giả lập cấu hình Router, Switch, IP Subnetting và VLAN cho sinh viên ngành Mạng.' },
      { name: 'Đấu Trí Thuật Toán LeetCode & Hackerrank', desc: 'Thi đấu giải thuật toán 1v1 trong 15 phút, so tài tối ưu thời gian chạy O(N) và bộ nhớ.' },
      { name: 'Trợ Lý Tóm Tắt Slide Bài Giảng PDF', desc: 'AI trích xuất 10 ý chính từ slide bài giảng 50 trang thành sơ đồ tư duy Mindmap trực quan.' },
      { name: 'Thư Viện Đồ Án Mẫu Website & Mobile App', desc: 'Kho mã nguồn tham khảo các dự án thực tế đạt điểm A+ của các thế hệ sinh viên khóa trước.' },
      { name: 'Phòng Lab Giả Lập Trí Tuệ Nhân Tạo AI', desc: 'Môi trường Jupyter Notebook trực tuyến chạy mô hình Machine Learning & Deep Learning nhẹ.' },
      { name: 'Sổ Tay Công Thức Toán Cao Cấp & Đại Số', desc: 'Tra cứu nhanh tích phân, ma trận, xác suất thống kê và phương trình vi phân có lời giải mẫu.' },
      { name: 'Cộng Đồng Review Đồ Án Tốt Nghiệp', desc: 'Nơi đăng tải poster đồ án, nhận góp ý từ giảng viên và các chuyên gia doanh nghiệp.' },
      { name: 'AI Sửa Bài Luận Tiếng Anh & Essay Writer', desc: 'Kiểm tra lỗi ngữ pháp, nâng cấp từ vựng Academic và chấm điểm Essay chuẩn IELTS/TOEIC.' },
    ],
    GAME: [
      { name: 'Đấu Trường Cờ Tướng 3D Sát Thần', desc: 'Game cờ tướng chiến thuật 3D với góc nhìn xoay 360 độ, hiệu ứng rung đĩa cờ và âm thanh cổ phong.' },
      { name: 'Đua Xe F1 Cyber Speed Track', desc: 'Game đua xe tốc độ cao trên đường đua giả lập Cyberpunk với vật phẩm tăng tốc Nitro và khiên chắn.' },
      { name: 'Thử Thách Xếp Gạch 3D Tetris Combo', desc: 'Game xếp gạch không gian 3D rơi tự do với hiệu ứng nổ x4 hàng, âm thanh EDM sôi động.' },
      { name: 'Đấu Trường Võ Sĩ Thẻ Bài Mortal Clash', desc: 'Game thẻ bài võ thuật 1v1 kết hợp kỹ năng Né Tránh, Phản Công và Chiêu Thức Kết Liễu.' },
      { name: 'Săn Thủy Cụ Đại Dương Ocean Hunter 3D', desc: 'Sòng bắn cá thủy cung 3D với khẩu pháo Laser, đạn băng giá và Boss Rồng Biển thưởng x500.' },
      { name: 'Mô Phỏng Sút Phạt Penalty World Cup 3D', desc: 'Thách đấu sút bóng luân lưu 3D căn chỉnh lực sút, xoáy má trong và thủ môn AI phản xạ nhanh.' },
      { name: 'Bida Lỗ 8 Bóng 3D Physics Master', desc: 'Game bida 8 bóng tiêu chuẩn quốc tế tính toán quỹ đạo bóng, góc dội băng và xoáy ép phê.' },
      { name: 'Tháp Nhảy Dù Sky Jumper Danger', desc: 'Chinh phục tháp cao 100 tầng, mỗi tầng tăng nhân hệ số thưởng PP nhưng đối mặt cạm bẫy ngẫu nhiên.' },
      { name: 'Bàn Cờ Tỷ Phú AYK Campus Monopoly', desc: 'Bàn cờ mua nhà trọ, canteen, thư viện trường học và thu tiền thuê đất từ các sinh viên bạn bè.' },
      { name: 'Oẳn Tù Tì Xanh Chín Đấu Trường 1v1', cat: 'GAME', desc: 'Thi đấu Kéo - Búa - Bao trực tiếp nhận điểm thưởng PP với bảng thành tích chuỗi thắng kịch tính.' },
    ],
    SOCIAL: [
      { name: 'Kênh Chat Âm Thanh Live Voice Lounge', desc: 'Phòng đàm thoại âm thanh trực tiếp cho nhóm sinh viên chém gió, hát karaoke và học nhóm.' },
      { name: 'Tường Confession Sinh Viên AYK Secret', desc: 'Cổng chia sẻ tâm tư, góc khuất thời sinh viên ẩn danh an toàn có đội ngũ kiểm duyệt AI.' },
      { name: 'Góc Ghép Cặp Bạn Học Study Buddy', desc: 'Kết nối tự động 2 sinh viên cùng ngành học hoặc cùng lịch rảnh để cùng ôn thi đạt điểm cao.' },
      { name: 'Sự Kiện Đêm Hội Âm Nhạc Campus Gala', desc: 'Sự kiện trực tuyến bình chọn tiết mục văn nghệ hay nhất và bốc thăm trúng thưởng quà tặng.' },
      { name: 'Hệ Thống Huy Hiệu Thành Tựu Badges', desc: 'Bộ sưu tập 100+ huy hiệu độc quyền mở khóa khi đạt các mốc đóng góp và hoạt động năng nổ.' },
      { name: 'Chợ Sinh Viên Trao Đổi Đồ Cũ Market', desc: 'Nơi mua bán sách cũ, xe máy, laptop và đồ dùng ký túc xá thanh lý với giá sinh viên.' },
      { name: 'Nhật Ký Sinh Viên Daily Life Blog', desc: 'Trang nhật ký cá nhân đăng bài viết, hình ảnh kỷ niệm đại học và tương tác lượt thích.' },
      { name: 'CLB E-Sports Sinh Viên Gaming Guild', desc: 'Bang hội game thủ sinh viên cùng sinh hoạt, thi đấu giải giao hữu và tích lũy quỹ guild.' },
      { name: 'Bản Đồ Check-in Cơ Sở Campus Map', desc: 'Bản đồ tương tác các điểm check-in trong trường: Thư viện, Canteen, Sân bóng, Ký túc xá.' },
      { name: 'Kênh Thẻ Sinh Viên Kỹ Thuật Số Card', desc: 'Hồ sơ cá nhân chuẩn Cyberpunk hiển thị Rank, danh hiệu, điểm tích lũy và khung viền.' },
    ],
    FINANCE: [
      { name: 'Sổ Tiết Kiệm Lãi Suất Kép AYK Bank', desc: 'Gửi tích lũy điểm PP nhận lãi suất sinh lời tự động theo giờ, rút vốn linh hoạt 24/7.' },
      { name: 'Sàn Giao Dịch Vàng & Crypto Demo', desc: 'Mô phỏng đầu tư Vàng & Tiền mã hóa với biểu đồ nến kline real-time, lệnh Stop-Loss/Take-Profit.' },
      { name: 'Thẻ Tín Dụng Tạm Ứng PP Credit Line', desc: 'Hạn mức vay thấu chi điểm PP ngắn hạn giúp sinh viên tiếp tục tham gia trải nghiệm khi hết vốn.' },
      { name: 'Bảo Hiểm Tổn Thất Đặt Cược Protection', desc: 'Gói bảo hiểm tự động hoàn tiền 15% khi người chơi gặp chuỗi thua trong các ván game.' },
      { name: 'Quỹ Hỗ Trợ Sinh Viên Khởi Nghiệp Fund', desc: 'Quỹ tài trợ các dự án nghiên cứu khoa học và ý tưởng sáng tạo sinh viên tiềm năng.' },
      { name: 'Sàn Đấu Giá Vật Phẩm Độc Bản Auction', desc: 'Phiên đấu giá công khai vật phẩm hiếm, thẻ bài SS, khung avatar rồng vàng theo thời gian thực.' },
      { name: 'Sổ Cái Nhật Ký Giao Dịch Audit Trail', desc: 'Minh bạch 100% lịch sử biến động tài sản PP, chuyển tiền, nhận quà và phần thưởng nhiệm vụ.' },
      { name: 'Sổ Quản Lý Chi Tiêu Sinh Viên Pocket', desc: 'Công cụ lập ngân sách tiền trọ, ăn uống, sinh hoạt phí giúp sinh viên kiểm soát tài chính.' },
      { name: 'Vòng Quay Đổi Quà Thực Tế Voucher', desc: 'Đổi điểm thưởng PP lấy voucher giảm giá trà sữa, tài khoản Tiếng Anh và quà lưu niệm trường.' },
      { name: 'Mã Quà Tặng Giftcode Tri Ơn Sinh Viên', desc: 'Tính năng nhập mã code sự kiện do Ban BGH/Giảng viên phát hành để nhận tiền thưởng PP.' },
    ],
    SYSTEM: [
      { name: 'Trình Phát Nhạc Nền Lo-Fi Streamer', desc: 'Trình phát nhạc chất lượng cao tích hợp danh sách nhạc Lofi, EDM, Cyberpunk thư giãn khi học.' },
      { name: 'Cửa Sổ Nổi PIP Picture-in-Picture', desc: 'Chế độ thu nhỏ màn hình cho phép vừa xem Live Stream vừa lướt tin tức hoặc học tập.' },
      { name: 'Hệ Thống Chống Gian Lận AI Security', desc: 'Thuật toán phát hiện spam, bot cược tự động và mã hóa dữ liệu đảm bảo tính công bằng.' },
      { name: 'Tự Động Khôi Phục Trạng Thái Recovery', desc: 'Lưu trữ phiên chơi tự động, khôi phục chính xác trạng thái bàn game khi bị ngắt kết nối mạng.' },
      { name: 'Giao Diện Cyberpunk Neon Dark Mode', desc: 'Giao diện tối chuyên nghiệp ánh neon bảo vệ mắt khi truy cập vào ban đêm.' },
      { name: 'Đồng Bộ Hóa Firebase Realtime Sync', desc: 'Hạ tầng đồng bộ dữ liệu đa người chơi thời gian thực tốc độ phản hồi cực nhanh < 50ms.' },
      { name: 'Hệ Thống Đa Ngôn Ngữ Việt - Anh Portal', desc: 'Chuyển đổi linh hoạt giao diện Tiếng Việt và Tiếng Anh dành cho sinh viên quốc tế.' },
      { name: 'Tối Ưu Hiệu Năng 60FPS Smooth Canvas', desc: 'Tối ưu hóa render đồ họa canvas 2D/3D giúp tiết kiệm pin và mượt mà trên điện thoại.' },
      { name: 'Bảng Thống Kê Máy Chủ Server Status', desc: 'Hiển thị tốc độ phản hồi Ping, lượng người dùng Online và dung lượng bộ nhớ máy chủ.' },
      { name: 'Trợ Lý Nhắc Nhở Lịch Thi & Nhiệm Vụ AI', desc: 'Tự động gửi thông báo nhắc lịch học, hạn nộp bài tập và nhiệm vụ hằng ngày sắp hết hạn.' },
    ]
  };

  const categories = ['ACADEMIC', 'GAME', 'SOCIAL', 'FINANCE', 'SYSTEM'] as const;

  for (let i = 101; i <= 1000; i++) {
    const cat = categories[(i - 1) % categories.length];
    const catTopics = topics[cat];
    const topicObj = catTopics[(i - 101) % catTopics.length];
    const levelNum = Math.floor(i / 10) + 1;
    
    base.push({
      id: i,
      title: `${topicObj.name} (Cấp ${levelNum})`,
      cat: cat,
      desc: `[Ý tưởng #${i}] ${topicObj.desc} Hỗ trợ cộng đồng sinh viên AYK8686 nâng cao trải nghiệm & tích lũy PP/XP.`
    });
  }
  return base;
};

export const ALL_1000_IDEAS = generate1000Ideas();

export default function ExclusiveIdeasModal({ onClose }: ExclusiveIdeasModalProps) {
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [randomIdea, setRandomIdea] = useState<any | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(60);

  const categories = ['ALL', 'ACADEMIC', 'GAME', 'SOCIAL', 'FINANCE', 'SYSTEM'];

  const filtered = ALL_1000_IDEAS.filter((item) => {
    const matchesCat = selectedCat === 'ALL' || item.cat === selectedCat;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toString().includes(searchQuery.trim());
    return matchesCat && matchesSearch;
  });

  const handlePickRandom = () => {
    const randomIndex = Math.floor(Math.random() * ALL_1000_IDEAS.length);
    setRandomIdea(ALL_1000_IDEAS[randomIndex]);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 60, filtered.length));
  };

  return (
    <div className="game-overlay bg-black/85 backdrop-blur-xl font-mono select-none animate-fadeIn">
      <div className="game-shell relative bg-[#080c14] border-0 sm:border sm:border-cyan-500/40 p-3 sm:p-6 md:p-8 flex flex-col shadow-[0_0_80px_rgba(0,240,255,0.25)]">
        
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3 mb-3 shrink-0">
          <div className="min-w-0 pr-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-widest mb-1 truncate">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
              ĐỘC QUYỀN AYK SERVER (1,000 Ý TƯỞNG)
            </div>
            <h2 className="text-sm sm:text-lg md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-1.5 truncate">
              <Trophy className="w-5 h-5 text-yellow-400 animate-bounce shrink-0" />
              1,000 Ý TƯỞNG & TÍNH NĂNG AYK
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="game-close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search & Random Generator Bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3 shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(60);
            }}
            placeholder="🔍 Tìm kiếm trong 1,000 ý tưởng (nhập tên, ID hoặc từ khóa...)"
            className="flex-1 bg-slate-950 border border-white/20 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-white text-xs font-sans outline-none transition-all"
          />

          <button
            onClick={handlePickRandom}
            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-extrabold text-xs rounded-xl hover:brightness-110 transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>NGẪU NHIÊN 1 Ý TƯỞNG</span>
          </button>
        </div>

        {/* Random Idea Highlight Box if picked */}
        {randomIdea && (
          <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/40 rounded-2xl flex items-center justify-between shrink-0 animate-fadeIn">
            <div>
              <span className="text-[10px] font-black text-yellow-400 uppercase">
                💡 Ý TƯỞNG GỢI Ý #{randomIdea.id}: {randomIdea.title} [{randomIdea.cat}]
              </span>
              <p className="text-xs text-slate-200 font-sans mt-0.5">{randomIdea.desc}</p>
            </div>
            <button
              onClick={() => setRandomIdea(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-900 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCat(cat);
                setVisibleCount(60);
              }}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase transition cursor-pointer ${
                selectedCat === cat
                  ? 'bg-cyan-500 text-black font-black shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat} ({cat === 'ALL' ? ALL_1000_IDEAS.length : ALL_1000_IDEAS.filter(i => i.cat === cat).length})
            </button>
          ))}
        </div>

        {/* Grid List */}
        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-3 scrollbar-thin scrollbar-thumb-cyan-500/30">
          {filtered.slice(0, visibleCount).map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-slate-950/80 border border-white/10 hover:border-cyan-500/50 rounded-2xl transition duration-300 group flex flex-col justify-between hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                    #{item.id.toString().padStart(4, '0')} // {item.cat}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <h3 className="text-xs font-black text-white group-hover:text-cyan-300 transition uppercase tracking-wide">
                  {item.title}
                </h3>
                <p className="text-[11px] text-slate-400 font-sans mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}

          {visibleCount < filtered.length && (
            <div className="col-span-1 md:col-span-2 py-4 text-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2.5 bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 hover:text-white font-mono font-bold text-xs rounded-xl transition cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                TẢI THÊM Ý TƯỞNG ({visibleCount} / {filtered.length})
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between shrink-0 text-xs text-slate-400 font-sans">
          <span>Đang hiển thị {Math.min(visibleCount, filtered.length)} / {filtered.length} kết quả (Tổng kho 1,000 Ý TƯỞNG).</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-mono font-black rounded-xl hover:brightness-110 transition cursor-pointer"
          >
            ĐÓNG CỬA SỔ
          </button>
        </div>

      </div>
    </div>
  );
}
