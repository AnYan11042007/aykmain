/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { get, ref, update, set } from 'firebase/database';
import { db } from '../firebase';
import { Shield, Eye, EyeOff, Key, Terminal, AlertTriangle, HelpCircle, UserPlus, HelpCircle as QuestionIcon, CheckCircle2, UserCheck, Hash } from 'lucide-react';

interface SecureLoginProps {
  onLoginSuccess: (uid: string, token: string) => void;
}

export default function SecureLogin({ onLoginSuccess }: SecureLoginProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Login form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Register form states (Full Name, Numeric ID, Password)
  const [regName, setRegName] = useState('');
  const [regId, setRegId] = useState(''); // Numeric ID, also bank account number
  const [regPass, setRegPass] = useState('');

  // Forgot password form state
  const [forgotId, setForgotId] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [secAnswerInput, setSecAnswerInput] = useState('');
  const [newPassResetInput, setNewPassResetInput] = useState('');

  // Secure Brute force rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setLockoutTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);

  // LOGIN ACTION
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimeLeft > 0) return;

    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const snap = await get(ref(db, `users/${u}`));
      if (snap.exists()) {
        const uData = snap.val();
        if (uData.pass === p) {
          if (uData.locked) {
            setErrorMsg('TÀI KHOẢN CỦA BẠN ĐÃ BỊ KHÓA!');
            setIsLoading(false);
            return;
          }

          const randToken = Math.random().toString(36).substring(2, 15) + 
                            Date.now().toString(36) + 
                            Math.random().toString(36).substring(2, 15);

          await update(ref(db, `users/${u}`), {
            sessionToken: randToken
          });

          const timestamp = Date.now();
          const logTime = new Date().toLocaleString('vi-VN');
          await set(ref(db, `online_logs/${u}/L_${timestamp}`), {
            action: 'LOGIN_SECURE',
            name: uData.name || 'Sinh Viên',
            time: logTime,
            timestamp: timestamp
          });

          try { localStorage.setItem('s88_uid', u); } catch (e) {}
          try { sessionStorage.setItem('s88_uid', u); } catch (e) {}
          try { localStorage.setItem('s88_sessionToken', randToken); } catch (e) {}
          try { sessionStorage.setItem('s88_sessionToken', randToken); } catch (e) {}

          onLoginSuccess(u, randToken);
        } else {
          handleFailedAttempt();
        }
      } else {
        handleFailedAttempt();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Lỗi kết nối máy chủ dữ liệu!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFailedAttempt = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      setLockoutTimeLeft(30);
      setErrorMsg('SAI TÀI KHOẢN HOẶC MẬT KHẨU QUÁ 5 LẦN! Hệ thống tạm khóa 30 giây.');
      setFailedAttempts(0);
    } else {
      setErrorMsg(`SAI UID HOẶC MẬT MÃ! Lần thử thứ ${nextAttempts}/5.`);
    }
  };

  // REGISTER ACTION (Creates account, gives 100k PP bonus, notifies admin)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const name = regName.trim();
    const numericId = regId.trim();
    const pass = regPass.trim();

    if (!name || !numericId || !pass) {
      setErrorMsg('Vui lòng nhập đầy đủ Tên, Mã ID và Mật khẩu!');
      return;
    }

    // Validate numeric ID format
    if (!/^\d+$/.test(numericId)) {
      setErrorMsg('Mã ID phải là CHỮ SỐ (Ví dụ: 102030, 889922)!');
      return;
    }

    if (numericId.length < 3) {
      setErrorMsg('Mã ID phải có ít nhất 3 chữ số!');
      return;
    }

    setIsLoading(true);

    try {
      // Check if user ID already exists
      const snap = await get(ref(db, `users/${numericId}`));
      if (snap.exists()) {
        setErrorMsg('Mã ID (Số) này đã tồn tại trên hệ thống! Vui lòng chọn Mã ID khác.');
        setIsLoading(false);
        return;
      }

      // Create new user profile with 100,000 PP bonus!
      const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150';
      const randToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

      await set(ref(db, `users/${numericId}`), {
        uid: numericId,
        name: name,
        pass: pass,
        bankAccount: numericId, // Numeric ID is also the bank account number for transfers!
        pp: 100000, // 100k PP starting bonus
        role: 'STUDENT',
        class: 'Tân Sinh Viên AYK8686',
        avatar: defaultAvatar,
        sessionToken: randToken,
        createdAt: Date.now()
      });

      // Notify admin & system log
      const timestamp = Date.now();
      const logTime = new Date().toLocaleString('vi-VN');
      await set(ref(db, `registration_logs/${numericId}`), {
        uid: numericId,
        name: name,
        ppBonus: 100000,
        time: logTime,
        timestamp: timestamp
      });

      // Auto login newly registered student directly!
      try { localStorage.setItem('s88_uid', numericId); } catch (e) {}
      try { sessionStorage.setItem('s88_uid', numericId); } catch (e) {}
      try { localStorage.setItem('s88_sessionToken', randToken); } catch (e) {}
      try { sessionStorage.setItem('s88_sessionToken', randToken); } catch (e) {}

      onLoginSuccess(numericId, randToken);
    } catch (err) {
      console.error(err);
      setErrorMsg('Lỗi tạo tài khoản trên máy chủ!');
    } finally {
      setIsLoading(false);
    }
  };

  // FORGOT PASSWORD ACTION (Verifies user ID & security question)
  const handleForgotPass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const targetId = forgotId.trim();
    if (!targetId) {
      setErrorMsg('Vui lòng nhập Mã ID (Số) của bạn!');
      return;
    }

    setIsLoading(true);

    try {
      const snap = await get(ref(db, `users/${targetId}`));
      if (!snap.exists()) {
        setErrorMsg('Mã ID này không tồn tại trong hệ thống S88!');
        setIsLoading(false);
        return;
      }

      const userData = snap.val();

      if (userData.securityQuestion && userData.securityAnswer) {
        // User has a security question configured! Move to Step 2
        setTargetUser(userData);
        setForgotStep(2);
        setSuccessMsg(`🔒 Đã tìm thấy tài khoản "${userData.name || targetId}". Vui lòng trả lời câu hỏi bảo mật bên dưới để đặt lại mật khẩu.`);
      } else {
        // Fallback for accounts without security question set: submit reset request to QTV
        await set(ref(db, `password_reset_requests/${targetId}`), {
          uid: targetId,
          name: userData.name || 'Sinh Viên',
          requestedAt: Date.now(),
          status: 'PENDING'
        });

        setSuccessMsg(`⚠️ Tài khoản này chưa cài đặt câu hỏi bảo mật. Hệ thống đã tự động gửi yêu cầu đổi mật khẩu cho Quản trị viên (QTV) duyệt!`);
        setForgotId('');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Lỗi kiểm tra ID tài khoản!');
    } finally {
      setIsLoading(false);
    }
  };

  // RESET PASSWORD BY SECURITY QUESTION
  const handleResetWithSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!targetUser || !targetUser.securityAnswer) {
      setErrorMsg('Dữ liệu không hợp lệ!');
      return;
    }

    const answer = secAnswerInput.trim();
    const newPass = newPassResetInput.trim();

    if (!answer || !newPass) {
      setErrorMsg('Vui lòng nhập đầy đủ Câu trả lời bảo mật và Mật khẩu mới!');
      return;
    }

    if (newPass.length < 3) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 3 ký tự!');
      return;
    }

    // Case-insensitive comparison for security answer
    if (answer.toLowerCase() !== targetUser.securityAnswer.trim().toLowerCase()) {
      setErrorMsg('❌ CÂU TRẢ LỜI BẢO MẬT KHÔNG CHÍNH XÁC! Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);

    try {
      await update(ref(db, `users/${targetUser.uid}`), {
        pass: newPass
      });

      setSuccessMsg(`🎉 XÁC NHẬN CÂU HỎI BẢO MẬT THÀNH CÔNG! Mật khẩu tài khoản "${targetUser.name}" đã được đổi thành "${newPass}". Vui lòng đăng nhập ngay!`);
      setForgotStep(1);
      setForgotId('');
      setTargetUser(null);
      setSecAnswerInput('');
      setNewPassResetInput('');
    } catch (err) {
      console.error(err);
      setErrorMsg('Lỗi cập nhật mật khẩu mới trên máy chủ!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="overlay relative overflow-hidden bg-cover bg-center" style={{ backgroundImage: "linear-gradient(to bottom, rgba(5,6,8,0.55), rgba(5,6,8,0.75)), url('https://cdnv2.tgdd.vn/mwg-static/common/News/1586975/hinh-nen-may-tinh-anime-4k%20%2894%29.jpg')" }}>
      <div className="glass-box login-panel relative overflow-hidden max-w-[460px] w-full p-6 text-left border-red-500/60 shadow-[0_0_50px_rgba(255,0,60,0.3)] bg-slate-950/85 backdrop-blur-xl">
        {/* Neon scanline accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-yellow-400 to-cyan-400 animate-pulse"></div>
        
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center animate-pulse">
            <Shield className="w-7 h-7 text-[#ff003c] text-glow-red" />
          </div>
        </div>

        <h1 className="brand-glitch text-2xl font-black mb-1 text-white tracking-widest text-center">
          AYK 8686 SYSTEM
        </h1>
        <p className="text-[10px] font-mono tracking-wider text-cyan-300 uppercase mb-5 text-center font-bold">
          Hệ Thống Đào Tạo & Giải Trí Đi Săn AYK8686
        </p>

        {/* Tab Selection Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-black/60 border border-white/10 rounded-xl p-1 mb-5 text-[10px] font-mono font-bold uppercase">
          <button
            onClick={() => {
              setActiveTab('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer text-center ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-red-950/60 to-red-900/60 text-white border border-red-500/50 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer text-center ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-cyan-950/60 to-cyan-900/60 text-[#00f0ff] border border-[#00f0ff]/50 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tạo Tài Khoản
          </button>
          <button
            onClick={() => {
              setActiveTab('forgot');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer text-center ${
              activeTab === 'forgot'
                ? 'bg-gradient-to-r from-yellow-950/60 to-amber-900/60 text-yellow-400 border border-yellow-500/50 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Quên Mật Khẩu
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-400 flex items-start gap-2 text-left">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#ff003c] mt-0.5" />
            <span className="leading-relaxed font-mono">{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/60 rounded-lg text-xs text-emerald-400 flex items-start gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span className="leading-relaxed font-mono">{successMsg}</span>
          </div>
        )}

        {/* FORM 1: LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3.5 font-mono">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 font-bold uppercase">Mã ID (Số hoặc Tên tài khoản):</label>
              <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-[#00f0ff] rounded-lg p-3 transition-all">
                <Terminal className="w-4 h-4 text-[#8b949e]" />
                <input
                  type="text"
                  placeholder="Nhập mã UID (Vd: 889922, 1a1, teacher...)"
                  className="bg-transparent border-none text-white w-full outline-none font-mono text-xs"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading || lockoutTimeLeft > 0}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1 font-bold uppercase">Mật Khẩu Đăng Nhập:</label>
              <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-[#00f0ff] rounded-lg p-3 transition-all relative">
                <Key className="w-4 h-4 text-[#8b949e]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập Mật mã bảo mật"
                  className="bg-transparent border-none text-white w-full outline-none font-mono text-xs pr-8"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || lockoutTimeLeft > 0}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-[#8b949e] hover:text-white transition"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {lockoutTimeLeft > 0 ? (
              <button
                type="button"
                className="w-full py-3 bg-red-950/20 border border-[#ff003c] text-[#ff003c] font-bold rounded-lg font-mono tracking-widest uppercase cursor-not-allowed text-xs"
                disabled
              >
                LOCKED OUT ({lockoutTimeLeft}S)
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-red-950/20 to-black hover:from-[#ff003c] hover:to-red-600 border border-[#ff003c] text-[#ff003c] hover:text-white font-extrabold rounded-lg font-mono tracking-widest uppercase cursor-pointer hover:shadow-[0_0_15px_rgba(255,0,60,0.4)] transition-all text-xs flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? 'ĐANG ĐĂNG NHẬP...' : '[ ĐĂNG NHẬP HỆ THỐNG ]'}
              </button>
            )}
          </form>
        )}

        {/* FORM 2: REGISTER (TẠO TÀI KHOẢN) */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5 font-mono">
            <div className="bg-cyan-950/20 border border-[#00f0ff]/30 p-2.5 rounded-lg text-[10px] text-cyan-300">
              🎁 <b>ĐẶC QUYỀN TÂN SINH VIÊN:</b> Tạo tài khoản mới nhận ngay <b>100,000 PP</b> thưởng khởi nghiệp vào ví!
            </div>

            <div>
              <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">1. Họ Và Tên:</label>
              <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-[#00f0ff] rounded-lg p-3 transition-all">
                <UserCheck className="w-4 h-4 text-[#00f0ff]" />
                <input
                  type="text"
                  placeholder="Vd: Nguyễn Văn A..."
                  className="bg-transparent border-none text-white w-full outline-none font-mono text-xs"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">
                2. Mã ID (Chỉ Số - Dùng Đăng Nhập & CK Bank):
              </label>
              <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-[#00f0ff] rounded-lg p-3 transition-all">
                <Hash className="w-4 h-4 text-yellow-400" />
                <input
                  type="text"
                  placeholder="Vd: 889922, 102030..."
                  className="bg-transparent border-none text-yellow-400 font-bold w-full outline-none font-mono text-xs"
                  value={regId}
                  onChange={(e) => setRegId(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">3. Mật Khẩu Đăng Nhập:</label>
              <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-[#00f0ff] rounded-lg p-3 transition-all">
                <Key className="w-4 h-4 text-[#8b949e]" />
                <input
                  type="password"
                  placeholder="Tạo mật khẩu bảo mật..."
                  className="bg-transparent border-none text-white w-full outline-none font-mono text-xs"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-950 to-cyan-900 hover:from-[#00f0ff] hover:to-cyan-400 text-[#00f0ff] hover:text-black font-black rounded-lg font-mono tracking-widest uppercase cursor-pointer hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all text-xs flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? 'ĐANG TẠO TÀI KHOẢN...' : '[ TẠO ACC & NHẬN 100K PP ]'}
            </button>
          </form>
        )}

        {/* FORM 3: FORGOT PASSWORD (QUÊN MẬT KHẨU) */}
        {activeTab === 'forgot' && (
          <div className="font-mono space-y-3.5">
            {forgotStep === 1 ? (
              <form onSubmit={handleForgotPass} className="space-y-3.5">
                <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded-lg text-[10px] text-amber-300 leading-relaxed">
                  🔒 Nhập Mã ID (Số) để kiểm tra câu hỏi bảo mật. Trả lời đúng để tự đổi mật khẩu ngay lập tức!
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">Mã ID Của Bạn (Số):</label>
                  <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-yellow-400 rounded-lg p-3 transition-all">
                    <Hash className="w-4 h-4 text-yellow-400" />
                    <input
                      type="text"
                      placeholder="Nhập Mã ID đã đăng ký (Vd: 889922)..."
                      className="bg-transparent border-none text-white w-full outline-none font-mono text-xs"
                      value={forgotId}
                      onChange={(e) => setForgotId(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-amber-950 to-yellow-900 hover:from-yellow-400 hover:to-amber-500 text-yellow-400 hover:text-black font-black rounded-lg font-mono tracking-widest uppercase cursor-pointer hover:shadow-[0_0_15px_rgba(255,215,0,0.4)] transition-all text-xs flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? 'ĐANG KIỂM TRA...' : '[ KIỂM TRA CÂU HỎI BẢO MẬT ]'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetWithSecurityQuestion} className="space-y-3.5">
                <div className="bg-cyan-950/30 border border-cyan-500/40 p-2.5 rounded-lg text-[11px] text-cyan-300 font-bold">
                  ❓ Câu hỏi: "{targetUser?.securityQuestion}"
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">Câu Trả Lời Bảo Mật:</label>
                  <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-cyan-400 rounded-lg p-3 transition-all">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <input
                      type="text"
                      placeholder="Nhập câu trả lời bí mật..."
                      className="bg-transparent border-none text-white w-full outline-none font-mono text-xs"
                      value={secAnswerInput}
                      onChange={(e) => setSecAnswerInput(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">Mật Khẩu Mới:</label>
                  <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-emerald-400 rounded-lg p-3 transition-all">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu mới..."
                      className="bg-transparent border-none text-white w-full outline-none font-mono text-xs"
                      value={newPassResetInput}
                      onChange={(e) => setNewPassResetInput(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[11px] uppercase"
                  >
                    Quay lại
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-2/3 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-black rounded-lg font-mono tracking-wider uppercase cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.4)] text-xs"
                  >
                    {isLoading ? 'ĐANG XỬ LÝ...' : '[ ĐỔI MẬT KHẨU NGAY ]'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-[#8b949e]">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-[#00ff80]" /> Secured v3.5
          </span>
          <span className="hover:text-white cursor-help flex items-center gap-0.5" title="Tạo nick số: Tặng ngay 100K PP!">
            <HelpCircle className="w-3 h-3" /> Hướng dẫn
          </span>
        </div>
      </div>
    </div>
  );
}
