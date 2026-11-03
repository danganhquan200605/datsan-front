import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Bell, LogIn, Shield, User, LogOut, PlusCircle, Building2, Lock, X
} from 'lucide-react';

export default function Header({ 
  user, 
  setUser, 
  onLoginClick, 
  searchTerm,
  setSearchTerm
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // State quản lý Modal Mật khẩu Admin Cấp 2
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [attempts, setAttempts] = useState(0);

  // MẬT KHẨU CẤP 2 CHUẨN
  const DEFAULT_ADMIN_PIN = 'admin123';
  const BACKUP_ADMIN_PIN = '123456';

  // Xử lý đăng xuất
  const handleLogout = () => {
    sessionStorage.removeItem('datsan_user');
    setUser(null);
    setShowDropdown(false);
    navigate('/');
  };

  // Mở modal xác thực khi bấm nút hoặc chọn menu Admin
  const handleOpenAdminModal = () => {
    setShowDropdown(false);
    setErrorMsg('');
    setAdminPin('');
    setShowAdminModal(true);
  };

  // Xử lý kiểm tra Mật khẩu cấp 2
  const handleVerifyAdminPin = (e) => {
    e.preventDefault();

    if (attempts >= 3) {
      setErrorMsg('Bạn đã nhập sai 3 lần. Vui lòng thử lại sau!');
      return;
    }

    if (adminPin === DEFAULT_ADMIN_PIN || adminPin === BACKUP_ADMIN_PIN) {
      setShowAdminModal(false);
      setAdminPin('');
      setErrorMsg('');
      setAttempts(0);
      navigate('/admin');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setErrorMsg(`Sai mật khẩu cấp 2! (Sai ${newAttempts}/3 lần)`);
    }
  };

  // Lấy tên hiển thị & vai trò
  const displayName = user?.HoTen || user?.hoten || 'Tài khoản';
  const userRole = user?.VaiTro || user?.vaitro || 'KHACHHANG';

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm font-sans">
        <div className="max-w-[1440px] mx-auto px-6 h-20 flex items-center justify-between gap-6">
          
          {/* LOGO */}
          <div className="flex items-center gap-5">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-bold text-lg">
                DS
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-emerald-600 leading-none">
                  DatSan<span className="text-amber-500">Online</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">
                  Hệ Sinh Thái Sân Cỏ VN
                </span>
              </div>
            </Link>
            <div className="relative hidden sm:block">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>TP. Đà Nẵng</span>
              </div>
            </div>
          </div>
          
          {/* SEARCH BAR */}
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên sân, địa chỉ..."
                className="w-full h-11 pl-11 pr-24 rounded-full bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4" />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm && setSearchTerm('')}
                  className="absolute right-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* CÁC NÚT THAO TÁC / PROFILE */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Nút Đăng Ký Chủ Sân cho Khách Hàng */}
                {userRole === 'KHACHHANG' && (
                  <button 
                    onClick={() => navigate('/register-field')} 
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Đăng Ký Chủ Sân</span>
                  </button>
                )}

                {/* Nút Quản Lý Sân / Admin */}
                {(userRole === 'ADMIN' || userRole === 'CHUSAN') && (
                  <button 
                    onClick={() => {
                      if (userRole === 'ADMIN') {
                        handleOpenAdminModal();
                      } else {
                        navigate('/owner');
                      }
                    }} 
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition"
                  >
                    <Shield className="w-4 h-4" /> 
                    <span>{userRole === 'ADMIN' ? 'Trang Admin' : 'Quản Lý Sân'}</span>
                  </button>
                )}
                
                <button className="relative p-2 text-slate-500 hover:text-emerald-600 transition">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
                </button>

                {/* AVATAR & DROPDOWN MENU */}
                <div className="relative">
                  <div 
                    className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer select-none" 
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden xl:block text-left text-xs leading-tight">
                      <div className="font-bold text-slate-800">{displayName}</div>
                      <div className="text-[10px] text-emerald-600 font-medium font-mono">{userRole}</div>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-3 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                      <button 
                        onClick={() => { setShowDropdown(false); navigate('/profile'); }}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold transition"
                      >
                        <User className="w-4 h-4 text-emerald-600" /> Thông tin cá nhân
                      </button>

                      {userRole === 'CHUSAN' && (
                        <button 
                          onClick={() => { setShowDropdown(false); navigate('/owner'); }}
                          className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold transition"
                        >
                          <Building2 className="w-4 h-4 text-amber-500" /> Bảng quản lý sân
                        </button>
                      )}

                      {userRole === 'ADMIN' && (
                        <button 
                          onClick={handleOpenAdminModal}
                          className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold transition"
                        >
                          <Shield className="w-4 h-4 text-rose-500" /> Trang quản trị Admin
                        </button>
                      )}

                      <div className="h-px bg-slate-100 my-1"></div>
                      
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition"
                      >
                        <LogOut className="w-4 h-4" /> Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button 
                onClick={onLoginClick} 
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-sm transition"
              >
                <LogIn className="w-4 h-4" /> Đăng nhập
              </button>
            )}
          </div>
        </div>
        
        {/* SUB NAV */}
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-[1440px] mx-auto px-6 h-11 flex items-center justify-between text-xs font-semibold">
            <nav className="flex items-center space-x-8">
              <Link to="/" className="text-emerald-600 border-b-2 border-emerald-600 py-3 font-bold">Trang Chủ</Link>
              <a href="#matrix-section" className="text-slate-600 hover:text-emerald-600 py-3 transition">Lưới Khung Giờ Real-time</a>
              <a href="#venues-section" className="text-slate-600 hover:text-emerald-600 py-3 transition">Danh Sách Cụm Sân</a>
            </nav>
            <div className="flex items-center gap-2 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Realtime Supabase Sync
            </div>
          </div>
        </div>
      </header>

      {/* POPUP MODAL MẬT KHẨU CẤP 2 */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowAdminModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Xác thực Quản Trị Viên</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Tài khoản ADMIN yêu cầu mật khẩu bảo mật cấp 2.
              </p>
            </div>

            <form onSubmit={handleVerifyAdminPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mật khẩu Admin Cấp 2</label>
                <input 
                  type="password" 
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Nhập mật khẩu admin..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 transition text-center tracking-widest text-slate-800"
                  autoFocus
                  required
                />
              </div>

              {errorMsg && (
                <p className="text-xs font-bold text-rose-600 text-center animate-bounce">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-lg transition"
              >
                Xác nhận Quyền Admin
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}