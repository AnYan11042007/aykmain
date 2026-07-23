/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { get, ref, onValue, set, update, push } from 'firebase/database';
import { db } from '../firebase';
import { User } from '../types';
import { 
  Newspaper, 
  Sparkles, 
  Bell, 
  Megaphone, 
  Clock, 
  ThumbsUp, 
  Share2, 
  Plus, 
  Search, 
  Tag, 
  Bookmark, 
  ShieldCheck, 
  Send, 
  X,
  Flame,
  Award,
  BookOpen
} from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: 'SCHOOL' | 'SYSTEM' | 'EVENT';
  author: string;
  timestamp: number;
  likes: number;
  views: number;
  pinned?: boolean;
  bannerUrl?: string;
  likedBy?: Record<string, boolean>;
}

interface S88NewsPortalProps {
  uid: string;
  user: User | null;
  onShowResult: (title: string, message: string, isWin: boolean) => void;
}

const DEFAULT_NEWS: NewsItem[] = [
  {
    id: 'news_1',
    title: 'THÔNG BÁO HỆ THỐNG AYK8686: KÍCH HOẠT ĐẤU TRƯỜNG "ĐI SĂN THẾ GIỚI" & TRUY CẦU PP HÀNG TỶ',
    content: 'Ban Giám Hiệu AYK MAIN 8686 chính thức khởi chạy Đồ Án "ĐI SĂN THẾ GIỚI". Tất cả Sinh viên có thể tham gia vào chiến trường mini-map đa người chơi live, cùng hơn 20 AI Bot đi săn thú quý hiếm, Rồng Thần, Phượng Hoàng để cướp kho báu từ 1,000 PP đến 1 TỶ PP!\n\nHệ thống AYK8686 đã nâng cấp hạ tầng đa máy chủ giúp trải nghiệm săn thú siêu mượt mà, không giật lag. Sinh viên có thể tích lũy số dư PP khủng để mua sắm vật phẩm và quy đổi học bổng giá trị.',
    category: 'SYSTEM',
    author: 'AYK8686 SYSTEM ADMIN',
    timestamp: Date.now() - 1000 * 60 * 30,
    likes: 288,
    views: 3420,
    pinned: true,
    bannerUrl: 'https://cdn-media.sforum.vn/storage/app/media/ctvseo_maihue/hinh-nen-1920-1080/hinh-nen-1920-1080-thumbnail.jpg'
  },
  {
    id: 'news_2',
    title: 'THÔNG BÁO LỊCH THI HỌC KỲ VÀ THƯỞNG HỌC BỔNG PP DÀNH CHO TÂN SINH VIÊN AYK8686',
    content: 'Tất cả sinh viên đăng ký tài khoản thành công tại cổng AYK MAIN 8686 với Mã ID Chữ Số sẽ nhận thưởng ngay 100,000 PP vào tài khoản.\n\nHãy hoàn thành các nhiệm vụ hằng ngày để tích lũy điểm Trí Tuệ, nâng hạng Bảng Vàng và quy đổi thành học bổng AYK8686 giá trị cao!',
    category: 'SCHOOL',
    author: 'PHÒNG ĐÀO TẠO AYK8686',
    timestamp: Date.now() - 1000 * 60 * 60 * 5,
    likes: 195,
    views: 1890,
    pinned: true,
    bannerUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'news_3',
    title: 'SỰ KIỆN SÚT PENALTY & ĐUA NGỰA HOÀNG GIA - TỔNG GIẢI THƯỞNG 500 TRIỆU PP',
    content: 'Giải đấu thể thao điện tử AYK8686 Arena đang diễn ra vô cùng sôi nổi. Tham gia tranh tài tại Đấu Trường AYK8686 để vinh danh tên mình trên Bảng Vàng Toàn Trường và nhận hàng trăm triệu PP thưởng trực tiếp!',
    category: 'EVENT',
    author: 'BAN TỔ CHỨC AYK8686 ARENA',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    likes: 310,
    views: 4300,
    pinned: false,
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80'
  }
];

export default function S88NewsPortal({ uid, user, onShowResult }: S88NewsPortalProps) {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'SCHOOL' | 'SYSTEM' | 'EVENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Full article view modal state
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  // Modal create news state for admin/teacher
  const [isPublishing, setIsPublishing] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<'SCHOOL' | 'SYSTEM' | 'EVENT'>('SCHOOL');
  const [bannerUrlInput, setBannerUrlInput] = useState('');
  const [isPinnedInput, setIsPinnedInput] = useState(false);

  const isTeacherOrAdmin = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  // Open Full Article View & Increment Views
  const handleOpenArticle = (item: NewsItem) => {
    setSelectedArticle(item);
    // increment view count
    try {
      update(ref(db, `s88_news/${item.id}`), {
        views: (item.views || 0) + 1
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Listen to Firebase Realtime Database
  useEffect(() => {
    const newsRef = ref(db, 's88_news');
    const unsubscribe = onValue(newsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const parsed: NewsItem[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }));
        // Sort: pinned first, then newest timestamp
        parsed.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return b.timestamp - a.timestamp;
        });
        setNewsList(parsed);
      } else {
        // Seed default news if empty
        DEFAULT_NEWS.forEach((item) => {
          set(ref(db, `s88_news/${item.id}`), item);
        });
        setNewsList(DEFAULT_NEWS);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLike = async (newsItem: NewsItem) => {
    const isAlreadyLiked = newsItem.likedBy?.[uid];
    const newLikes = isAlreadyLiked ? newsItem.likes - 1 : newsItem.likes + 1;

    try {
      await update(ref(db, `s88_news/${newsItem.id}`), {
        likes: Math.max(0, newLikes),
        [`likedBy/${uid}`]: !isAlreadyLiked
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !contentInput.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!');
      return;
    }

    const newNewsId = `news_${Date.now()}`;
    const newArticle: NewsItem = {
      id: newNewsId,
      title: titleInput.trim(),
      content: contentInput.trim(),
      category: categoryInput,
      author: user?.name ? `${user.name} (${user.role === 'ADMIN' ? 'QTV' : 'Giáo Viên'})` : 'BAN GIÁM HIỆU S88',
      timestamp: Date.now(),
      likes: 0,
      views: 1,
      pinned: isPinnedInput,
      bannerUrl: bannerUrlInput.trim() || 'https://cdn-media.sforum.vn/storage/app/media/ctvseo_maihue/hinh-nen-1920-1080/hinh-nen-1920-1080-thumbnail.jpg'
    };

    try {
      await set(ref(db, `s88_news/${newNewsId}`), newArticle);
      setIsPublishing(false);
      setTitleInput('');
      setContentInput('');
      setBannerUrlInput('');
      setIsPinnedInput(false);
      onShowResult('ĐÃ ĐĂNG THÔNG BÁO 🎉', 'Thông báo tin tức mới đã được cập nhật lên cổng trường!', true);
    } catch (err) {
      onShowResult('THẤT BẠI ❌', 'Không thể đăng thông báo!', false);
    }
  };

  const filteredNews = newsList.filter((item) => {
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-left">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950 p-6 md:p-8 shadow-[0_0_40px_rgba(0,240,255,0.1)]">
        <div className="absolute inset-0 opacity-40 select-none pointer-events-none">
          <img
            src="https://cdn-media.sforum.vn/storage/app/media/ctvseo_maihue/hinh-nen-1920-1080/hinh-nen-1920-1080-thumbnail.jpg"
            alt="AYK8686 News Portal Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Sparkles className="w-4 h-4 animate-pulse text-[#00f0ff]" /> CỔNG TIN TỨC & THÔNG BÁO AYK8686
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Newspaper className="w-8 h-8 text-[#00f0ff]" /> BẢN TIN AYK8686
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-mono max-w-2xl leading-relaxed">
              Cập nhật liên tục những tin tức mới nhất, sự kiện hot, thông báo từ Ban Giám Hiệu và tính năng nâng cấp của hệ thống AYK MAIN 8686.
            </p>
          </div>

          {isTeacherOrAdmin && (
            <button
              onClick={() => setIsPublishing(true)}
              className="py-3 px-5 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-black text-xs font-mono uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer transition-all active:scale-95 flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> ĐĂNG THÔNG BÁO MỚI
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-white/10 p-3.5 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
          <button
            onClick={() => setFilterCategory('ALL')}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              filterCategory === 'ALL'
                ? 'bg-[#00f0ff] text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            TẤT CẢ ({newsList.length})
          </button>
          <button
            onClick={() => setFilterCategory('SCHOOL')}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterCategory === 'SCHOOL'
                ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" /> THÔNG BÁO TRƯỜNG
          </button>
          <button
            onClick={() => setFilterCategory('SYSTEM')}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterCategory === 'SYSTEM'
                ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> HỆ THỐNG
          </button>
          <button
            onClick={() => setFilterCategory('EVENT')}
            className={`px-3.5 py-2 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterCategory === 'EVENT'
                ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> SỰ KIỆN HOT
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64 font-mono">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm tin tức..."
            className="w-full bg-black/60 border border-white/10 focus:border-[#00f0ff] rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* News Cards Feed */}
      {loading ? (
        <div className="text-center py-12 text-[#00f0ff] font-mono animate-pulse">
          ⚡ ĐANG TẢI BẢN TIN TRƯỜNG AYK8686...
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-white/5 rounded-2xl text-slate-400 font-mono text-xs">
          Chưa có thông báo nào thuộc danh mục này!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((item) => {
            const isLiked = item.likedBy?.[uid];
            const dateStr = new Date(item.timestamp).toLocaleString('vi-VN');

            return (
              <div
                key={item.id}
                onClick={() => handleOpenArticle(item)}
                className="group relative bg-slate-950/80 border border-white/10 hover:border-cyan-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,240,255,0.15)] flex flex-col justify-between cursor-pointer"
              >
                {/* Banner Thumbnail */}
                <div className="relative h-44 w-full overflow-hidden bg-black select-none">
                  <img
                    src={item.bannerUrl || 'https://cdn-media.sforum.vn/storage/app/media/ctvseo_maihue/hinh-nen-1920-1080/hinh-nen-1920-1080-thumbnail.jpg'}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between font-mono text-[9px] font-bold">
                    <span className={`px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md backdrop-blur-md ${
                      item.category === 'SCHOOL'
                        ? 'bg-amber-500/90 text-black'
                        : item.category === 'SYSTEM'
                        ? 'bg-cyan-500/90 text-black'
                        : 'bg-red-600/90 text-white'
                    }`}>
                      {item.category === 'SCHOOL' ? 'THÔNG BÁO' : item.category === 'SYSTEM' ? 'HỆ THỐNG' : 'SỰ KIỆN'}
                    </span>

                    {item.pinned && (
                      <span className="px-2.5 py-1 rounded-full bg-red-600 text-white uppercase tracking-wider flex items-center gap-1 shadow-md animate-pulse">
                        <Bookmark className="w-3 h-3 fill-white" /> GHIM ĐẦU
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <h3 className="text-base font-extrabold text-white group-hover:text-[#00f0ff] transition-colors leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 font-sans">
                      {item.content}
                    </p>
                    <span className="text-[10px] text-cyan-400 font-mono underline font-bold">👉 Xem chi tiết nội dung</span>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2 font-mono text-[10px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-bold text-cyan-400 truncate max-w-[150px]">
                        ✍️ {item.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> {dateStr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(item);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          isLiked
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-cyan-400 text-cyan-400' : ''}`} />
                        <span>{item.likes}</span>
                      </button>

                      <div className="text-slate-500 flex items-center gap-1">
                        👁️ {item.views} Lượt xem
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Full Article Detail Reader */}
      {selectedArticle && (
        <div className="overlay z-[5000]">
          <div className="glass-box overflow-y-auto max-h-[90vh] w-[95vw] md:w-full max-w-[720px] p-0 border-cyan-400/50 relative text-left font-sans rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.25)]">
            
            {/* Header Banner Image */}
            <div className="relative h-64 w-full select-none bg-black">
              <img
                src={selectedArticle.bannerUrl || 'https://cdn-media.sforum.vn/storage/app/media/ctvseo_maihue/hinh-nen-1920-1080/hinh-nen-1920-1080-thumbnail.jpg'}
                alt={selectedArticle.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white p-2 rounded-full backdrop-blur-md border border-white/20 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6 font-mono text-xs flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#00f0ff] text-black font-extrabold uppercase tracking-widest shadow-md">
                  {selectedArticle.category === 'SCHOOL' ? 'THÔNG BÁO AYK8686' : selectedArticle.category === 'SYSTEM' ? 'HỆ THỐNG' : 'SỰ KIỆN ARENA'}
                </span>
                <span className="text-slate-300">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  {new Date(selectedArticle.timestamp).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>

            {/* Article Content Body */}
            <div className="p-6 md:p-8 space-y-6 bg-slate-950">
              <div className="space-y-3">
                <h2 className="text-xl md:text-2xl font-black text-white leading-snug">
                  {selectedArticle.title}
                </h2>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-white/10 pb-4">
                  <span className="text-cyan-400 font-bold">✍️ Đăng bởi: {selectedArticle.author}</span>
                  <span>👁️ {selectedArticle.views} Lượt đọc</span>
                </div>
              </div>

              <div className="text-sm md:text-base text-slate-200 leading-relaxed font-sans whitespace-pre-line space-y-4">
                {selectedArticle.content}
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 border-t border-white/10 flex items-center justify-between font-mono text-xs">
                <button
                  onClick={() => handleLike(selectedArticle)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all cursor-pointer font-bold ${
                    selectedArticle.likedBy?.[uid]
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${selectedArticle.likedBy?.[uid] ? 'fill-cyan-400 text-cyan-400' : ''}`} />
                  <span>Yêu Thích ({selectedArticle.likes})</span>
                </button>

                <button
                  onClick={() => setSelectedArticle(null)}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-black uppercase rounded-xl hover:brightness-110 transition cursor-pointer"
                >
                  [ ĐÓNG BẢN TIN ]
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Publish New Announcement (Teachers / Admins) */}
      {isPublishing && (
        <div className="overlay z-[5000]">
          <div className="glass-box login-panel overflow-y-auto max-h-[90vh] w-[95vw] md:w-full max-w-[560px] p-6 border-[#00f0ff] relative text-left font-mono">
            <button
              onClick={() => setIsPublishing(false)}
              className="absolute top-4 right-4 text-[#8b949e] hover:text-white cursor-pointer transition p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-[#00f0ff] text-glow-blue text-lg font-black uppercase tracking-widest mb-1 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#00f0ff]" /> SOẠN THÔNG BÁO MỚI (QTV / GIÁO VIÊN)
            </h2>
            <p className="text-[10px] text-slate-400 uppercase mb-4">
              Đăng tin tức công khai lên toàn bộ sinh viên trường S88
            </p>

            <form onSubmit={handleCreateNews} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">TIÊU ĐỀ THÔNG BÁO:</label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề thông báo..."
                  className="w-full bg-black/60 border border-white/20 focus:border-[#00f0ff] rounded-lg p-3 text-xs text-white outline-none font-bold"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">DANH MỤC THÔNG BÁO:</label>
                <select
                  className="w-full bg-black/80 border border-white/20 focus:border-[#00f0ff] rounded-lg p-3 text-xs text-cyan-400 outline-none font-bold"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value as any)}
                >
                  <option value="SCHOOL">THÔNG BÁO NHÀ TRƯỜNG</option>
                  <option value="SYSTEM">CẬP NHẬT HỆ THỐNG</option>
                  <option value="EVENT">SỰ KIỆN S88 ARENA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">LINK BANNER ẢNH (TÙY CHỌN):</label>
                <input
                  type="text"
                  placeholder="https://example.com/banner.jpg"
                  className="w-full bg-black/60 border border-white/20 focus:border-[#00f0ff] rounded-lg p-3 text-xs text-white outline-none"
                  value={bannerUrlInput}
                  onChange={(e) => setBannerUrlInput(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase">NỘI DUNG CHI TIẾT:</label>
                <textarea
                  rows={4}
                  placeholder="Nhập nội dung chi tiết thông báo..."
                  className="w-full bg-black/60 border border-white/20 focus:border-[#00f0ff] rounded-lg p-3 text-xs text-white outline-none font-sans"
                  value={contentInput}
                  onChange={(e) => setContentInput(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinnedInput}
                  onChange={(e) => setIsPinnedInput(e.target.checked)}
                  className="w-4 h-4 text-[#00f0ff] rounded bg-black border-white/20"
                />
                <label htmlFor="pinCheck" className="text-xs text-slate-300 font-bold uppercase cursor-pointer">
                  Ghim thông báo này lên đầu trang
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer transition-all active:scale-95"
              >
                [ ĐĂNG THÔNG BÁO NGAY ]
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
