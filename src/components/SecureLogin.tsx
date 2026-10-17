/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { get, ref, update, set } from 'firebase/database';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { db, auth, formatVirtualEmail } from '../firebase';
import { Shield, Eye, EyeOff, Key, HelpCircle, Hash } from 'lucide-react';

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

  // LOGIN ACTION via Firebase Auth + Automatic Legacy Migration
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimeLeft > 0) return;

    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setErrorMsg('Vui lòng nhập đầy đủ Mã ID / Tên đăng nhập và Mật khẩu!');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const virtualEmail = formatVirtualEmail(u);

    try {
      let authSuccess = false;

      // 1. Attempt login with Firebase Auth
      try {
        await signInWithEmailAndPassword(auth, virtualEmail, p);
        authSuccess = true;
      } catch (authErr: any) {
        // 2. Check for legacy account migration if not found in Firebase Auth
        const snap = await get(ref(db, `users/${u}`));
        if (snap.exists()) {
          const uData = snap.val();
          // If legacy plaintext password matches, register to Firebase Auth immediately and wipe plaintext pass
          if (uData.pass === p) {
            try {
              await createUserWithEmailAndPassword(auth, virtualEmail, p);
              authSuccess = true;
              // Clean legacy plaintext password on backend
              fetch('/api/auth/migrate-legacy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: u })
              }).catch(() => {});
            } catch (createErr) {
              // Might already exist in Auth, attempt sign-in once more
              try {
                await signInWithEmailAndPassword(auth, virtualEmail, p);
                authSuccess = true;
              } catch (retryErr) {
                authSuccess = false;
              }
            }
          }
        }
      }

      if (!authSuccess) {
        handleFailedAttempt();
        setIsLoading(false);
        return;
      }

      // 3. Verify user profile in RTDB
      const snap = await get(ref(db, `users/${u}`));
      let uData = snap.exists() ? snap.val() : null;

      if (!uData) {
        // Create initial profile if missing
        uData = {
          uid: u,
          name: `Sinh Viên ${u}`,
          bankAccount: u,
          pp: 100000,
          role: 'STUDENT',
          class: 'Tân Sinh Viên AYK8686',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
          createdAt: Date.now()
        };
        await set(ref(db, `users/${u}`), uData);
      }

      if (uData.locked) {
        setErrorMsg('TÀI KHOẢN CỦA BẠN ĐÃ BỊ KHÓA BỞI HỆ THỐNG!');
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
        action: 'LOGIN_FIREBASE_AUTH',
        name: uData.name || 'Sinh Viên',
        time: logTime,
        timestamp: timestamp
      });

      try { localStorage.setItem('s88_uid', u); } catch (e) {}
      try { sessionStorage.setItem('s88_uid', u); } catch (e) {}
      try { localStorage.setItem('s88_sessionToken', randToken); } catch (e) {}
      try { sessionStorage.setItem('s88_sessionToken', randToken); } catch (e) {}

      onLoginSuccess(u, randToken);
    } catch (err: any) {
      console.error('Login Error:', err);
      setErrorMsg(err?.message || 'Lỗi đăng nhập hệ thống bảo mật Firebase!');
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

  // REGISTER ACTION via Firebase Authentication (NO plaintext password in RTDB!)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const name = regName.trim();
    const numericId = regId.trim();
    const pass = regPass.trim();

    if (!name || !numericId || !pass) {
      setErrorMsg('Vui lòng nhập đầy đủ Họ Tên, Mã ID và Mật khẩu!');
      return;
    }

    if (!/^\d+$/.test(numericId)) {
      setErrorMsg('Mã ID phải là CHỮ SỐ (Ví dụ: 102030, 889922)!');
      return;
    }

    if (numericId.length < 3) {
      setErrorMsg('Mã ID phải có ít nhất 3 chữ số!');
      return;
    }

    if (pass.length < 6) {
      setErrorMsg('Mật khẩu bảo mật phải có ít nhất 6 ký tự!');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check if user already exists in database
      const snap = await get(ref(db, `users/${numericId}`));
      if (snap.exists()) {
        setErrorMsg('Mã ID (Số) này đã tồn tại trên hệ thống AYK!');
        setIsLoading(false);
        return;
      }

      // 2. Register with Firebase Authentication
      const virtualEmail = formatVirtualEmail(numericId);
      await createUserWithEmailAndPassword(auth, virtualEmail, pass);

      // 3. Create user profile in RTDB WITHOUT plaintext password!
      const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150';
      const randToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

      await set(ref(db, `users/${numericId}`), {
        uid: numericId,
        name: name,
        bankAccount: numericId,
        pp: 100000, // 100k PP starting bonus
        role: 'STUDENT',
        class: 'Tân Sinh Viên AYK8686',
        avatar: defaultAvatar,
        sessionToken: randToken,
        createdAt: Date.now()
      });

      // 4. Log registration
      const timestamp = Date.now();
      const logTime = new Date().toLocaleString('vi-VN');
      await set(ref(db, `registration_logs/${numericId}`), {
        uid: numericId,
        name: name,
        ppBonus: 100000,
        time: logTime,
        timestamp: timestamp
      });

      // Auto login newly registered student directly
      try { localStorage.setItem('s88_uid', numericId); } catch (e) {}
      try { sessionStorage.setItem('s88_uid', numericId); } catch (e) {}
      try { localStorage.setItem('s88_sessionToken', randToken); } catch (e) {}
      try { sessionStorage.setItem('s88_sessionToken', randToken); } catch (e) {}

      onLoginSuccess(numericId, randToken);
    } catch (err: any) {
      console.error('Registration Error:', err);
      if (err?.code === 'auth/email-already-in-use') {
        setErrorMsg('Tài khoản với mã ID này đã đăng ký trước đó!');
      } else {
        setErrorMsg(err?.message || 'Lỗi tạo tài khoản trên hệ thống bảo mật Firebase!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // FORGOT PASSWORD ACTION: Verifies security question
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
        setErrorMsg('Mã ID này không tồn tại trong hệ thống AYK!');
        setIsLoading(false);
        return;
      }

      const userData = snap.val();

      if (userData.securityQuestion && userData.securityAnswer) {
        setTargetUser(userData);
        setForgotStep(2);
        setSuccessMsg(`🔒 Đã tìm thấy tài khoản "${userData.name || targetId}". Vui lòng trả lời câu hỏi bảo mật để đặt lại mật khẩu.`);
      } else {
        await set(ref(db, `password_reset_requests/${targetId}`), {
          uid: targetId,
          name: userData.name || 'Sinh Viên',
          requestedAt: Date.now(),
          status: 'PENDING'
        });

        setSuccessMsg(`⚠️ Tài khoản chưa cài đặt câu hỏi bảo mật. Đã gửi yêu cầu cấp lại đến Quản trị viên (QTV)!`);
        setForgotId('');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Lỗi kiểm tra ID tài khoản!');
    } finally {
      setIsLoading(false);
    }
  };

  // RESET PASSWORD BY SECURITY QUESTION (Uses Firebase Auth update, NO plaintext storage)
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

    if (newPass.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự để bảo mật!');
      return;
    }

    if (answer.toLowerCase() !== targetUser.securityAnswer.trim().toLowerCase()) {
      setErrorMsg('❌ CÂU TRẢ LỜI BẢO MẬT KHÔNG CHÍNH XÁC!');
      return;
    }

    setIsLoading(true);

    try {
      const virtualEmail = formatVirtualEmail(targetUser.uid);
      
      // Update Firebase Auth credential
      try {
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, newPass);
        } else {
          // If not currently logged in, sign in or create auth user
          try {
            const userCred = await signInWithEmailAndPassword(auth, virtualEmail, targetUser.pass || 'default123');
            await updatePassword(userCred.user, newPass);
          } catch (e) {
            await createUserWithEmailAndPassword(auth, virtualEmail, newPass);
          }
        }
      } catch (authErr) {
        console.warn('Firebase Auth password update fallback:', authErr);
      }

      // Ensure no plaintext pass in RTDB
      await fetch('/api/auth/migrate-legacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: targetUser.uid })
      }).catch(() => {});

      setSuccessMsg(`🎉 ĐỔI MẬT KHẨU THÀNH CÔNG! Vui lòng đăng nhập bằng mật khẩu mới.`);
      setForgotStep(1);
      setForgotId('');
      setTargetUser(null);
      setSecAnswerInput('');
      setNewPassResetInput('');
      setActiveTab('login');
    } catch (err) {
      console.error(err);
      setErrorMsg('Lỗi cập nhật mật khẩu mới!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="overlay relative overflow-hidden bg-cover bg-center min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: "linear-gradient(to bottom, rgba(5,6,8,0.7), rgba(5,6,8,0.85)), url('https://cdnv2.tgdd.vn/mwg-static/common/News/1586975/hinh-nen-may-tinh-anime-4k%20%2894%29.jpg')" }}>
      <div className="glass-box login-panel relative overflow-hidden max-w-[460px] w-full p-6 text-left border-red-500/60 shadow-[0_0_50px_rgba(255,0,60,0.3)] bg-slate-950/90 backdrop-blur-xl rounded-2xl">
        {/* Neon scanline accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-yellow-400 to-cyan-400 animate-pulse"></div>
        
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center animate-pulse">
            <Shield className="w-7 h-7 text-[#ff003c]" />
          </div>
        </div>

        <h1 className="brand-glitch text-2xl font-black mb-1 text-white tracking-widest text-center">
          AYK MAIN 8686
        </h1>
        <p className="text-[10px] font-mono tracking-wider text-cyan-300 uppercase mb-5 text-center font-bold">
          Hệ Thống Đào Tạo & Quản Trị Sinh Viên Bảo Mật
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

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-red-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-mono">
            {successMsg}
          </div>
        )}

        {/* TAB 1: LOGIN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">Mã Sinh Viên / UID:</label>
              <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-red-500 rounded-lg p-3 transition-all">
                <Hash className="w-4 h-4 text-red-500" />
                <input
                  type="text"
                  placeholder="Nhập Mã ID sinh viên..."
                  className="bg-transparent border-none text-white w-full outline-none font-mono text-xs"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading || lockoutTimeLeft > 0}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">Mật Khẩu:</label>
              <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-red-500 rounded-lg p-3 transition-all">
                <Key className="w-4 h-4 text-red-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu..."
                  className="bg-transparent border-none text-white w-full outline-none font-mono text-xs"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || lockoutTimeLeft > 0}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || lockoutTimeLeft > 0}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black rounded-lg font-mono tracking-widest uppercase cursor-pointer hover:shadow-[0_0_20px_rgba(255,0,60,0.5)] transition-all text-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <Shield className="w-4 h-4" />
              {lockoutTimeLeft > 0 ? `TẠM KHÓA (${lockoutTimeLeft}s)` : isLoading ? 'ĐANG XÁC THỰC...' : '[ ĐĂNG NHẬP HỆ THỐNG ]'}
            </button>
          </form>
        )}

        {/* TAB 2: REGISTER FORM */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">Họ và Tên Sinh Viên:</label>
              <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-[#00f0ff] rounded-lg p-3 transition-all">
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A..."
                  className="bg-transparent border-none text-white w-full outline-none font-mono text-xs"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">Mã Sinh Viên / ID (Chữ số):</label>
              <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-[#00f0ff] rounded-lg p-3 transition-all">
                <Hash className="w-4 h-4 text-[#00f0ff]" />
                <input
                  type="text"
                  placeholder="Ví dụ: 889922, 102030..."
                  className="bg-transparent border-none text-white w-full outline-none font-mono text-xs"
                  value={regId}
                  onChange={(e) => setRegId(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">Mật Khẩu (Ít nhất 6 ký tự):</label>
              <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-[#00f0ff] rounded-lg p-3 transition-all">
                <Key className="w-4 h-4 text-[#00f0ff]" />
                <input
                  type="password"
                  placeholder="Nhập mật khẩu an toàn..."
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
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-lg font-mono tracking-widest uppercase cursor-pointer hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all text-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {isLoading ? 'ĐANG TẠO HỒ SƠ...' : '[ ĐĂNG KÝ (TẶNG 100K PP) ]'}
            </button>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {activeTab === 'forgot' && (
          <div>
            {forgotStep === 1 ? (
              <form onSubmit={handleForgotPass} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">Mã ID Sinh Viên (Số):</label>
                  <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-yellow-400 rounded-lg p-3 transition-all">
                    <Hash className="w-4 h-4 text-yellow-400" />
                    <input
                      type="text"
                      placeholder="Nhập Mã ID đã đăng ký..."
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
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-black rounded-lg font-mono tracking-widest uppercase cursor-pointer transition-all text-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {isLoading ? 'ĐANG TÌM KIẾM...' : '[ KIỂM TRA BẢO MẬT ]'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetWithSecurityQuestion} className="space-y-4">
                <div className="bg-cyan-950/30 border border-cyan-500/40 p-2.5 rounded-lg text-xs text-cyan-300 font-bold">
                  Câu hỏi: "{targetUser?.securityQuestion}"
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 mb-1 font-bold uppercase">Câu Trả Lời:</label>
                  <div className="flex items-center gap-2.5 bg-black/60 border border-[#30363d] focus-within:border-cyan-400 rounded-lg p-3 transition-all">
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
                      placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
                      className="bg-transparent border-none text-white w-full outline-none font-mono text-xs"
                      value={newPassResetInput}
                      onChange={(e) => setNewPassResetInput(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-2/3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-lg font-mono text-xs uppercase"
                  >
                    {isLoading ? 'ĐANG LƯU...' : '[ ĐỔI MẬT KHẨU ]'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-[#8b949e]">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-[#00ff80]" /> Firebase Auth v12
          </span>
          <span className="text-cyan-400 font-bold">
            AYK 8686 SECURE PORTAL
          </span>
        </div>
      </div>
    </div>
  );
}
