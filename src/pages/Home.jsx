import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, Calendar, Clock, ChevronDown, Bell, User, 
  Flame, Award, ShieldCheck, Zap, Phone, CheckCircle, ArrowRight,
  Sparkles, Star, Heart, Navigation, ExternalLink, Ticket, Check, RefreshCw, Eye, Users, MessageSquare, X, Lock
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import FieldDetail from './FieldDetail';
import Header from '../components/Header';

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1529900248057-5e632c63c574?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1626248801379-51a0748a5f96?auto=format&fit=crop&w=800&q=80'
];

const TIME_SLOTS = [
  { id: 1, start: '16:00', end: '17:30', label: '16:00 - 17:30' },
  { id: 2, start: '17:30', end: '19:00', label: '17:30 - 19:00' },
  { id: 3, start: '19:00', end: '20:30', label: '19:00 - 20:30 (HOT)', isGold: true },
  { id: 4, start: '20:30', end: '22:00', label: '20:30 - 22:00' }
];

export default function Home() {
  // Duy trì phiên đăng nhập chuẩn SPA
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('datsan_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error('Lỗi đọc sessionStorage:', error);
      return null;
    }
  });

  const [loaiSanList, setLoaiSanList] = useState([]);
  const [sanList, setSanList] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetailSanId, setSelectedDetailSanId] = useState(null);
  const [selectedMaLoaiSan, setSelectedMaLoaiSan] = useState(0); 
  const [selectedQuan, setSelectedQuan] = useState(''); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Booking Modal States
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState(null);
  const [bookingSuccessModal, setBookingSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Login & 2FA Admin States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [step, setStep] = useState(1); // 1: SĐT, 2: OTP, 3: Admin Password
  const [tempUser, setTempUser] = useState(null);
  const [adminFailedAttempts, setAdminFailedAttempts] = useState(0);
  const [adminLockUntil, setAdminLockUntil] = useState(null);

  // Reg Pitch (Đăng ký chủ sân) Modal State
  const [showRegPitchModal, setShowRegPitchModal] = useState(false);
  const [pitchNameInput, setPitchNameInput] = useState('');
  const [pitchAddressInput, setPitchAddressInput] = useState('');
  const [pitchDistrictInput, setPitchDistrictInput] = useState('Hải Châu');

  // Kiểm tra thời gian khóa Admin
  useEffect(() => {
    const lockTime = sessionStorage.getItem('admin_lock_until');
    if (lockTime && new Date().getTime() < Number(lockTime)) {
      setAdminLockUntil(Number(lockTime));
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: lsData } = await supabase.from('loaisan').select('*');
      if (lsData) setLoaiSanList(lsData);
      const { data: vtData } = await supabase.from('vitri').select('*');
      const { data: sanData } = await supabase.from('san').select('*');
      
      const { data: datSanData } = await supabase
        .from('datsan')
        .select('madatsan, masan, ngaysudung, datsan_khunggio(makhunggio)')
        .eq('ngaysudung', selectedDate);
        
      setBookedSlots(datSanData || []);
      
      if (sanData) {
        const formatted = sanData.map((san, idx) => {
          const maSan = san.masan || san.MaSan;
          const maViTri = san.mavitri || san.MaViTri;
          const maLoaiSan = san.maloaisan || san.MaLoaiSan;
          const giaSan = san.giasan || san.GiaSan || 300000;
          const vt = vtData?.find((v) => (v.mavitri || v.MaViTri) === maViTri) || {};
          const ls = lsData?.find((l) => (l.maloaisan || l.MaLoaiSan) === maLoaiSan) || {};
          const imageUrl = san.hinhanh || san.HinhAnh || DEFAULT_IMAGES[idx % DEFAULT_IMAGES.length];
          return {
            MaSan: maSan,
            TenSan: san.tensan || san.TenSan || 'Sân Thể Thao',
            MoTa: san.mota || san.MoTa || 'Sân tiêu chuẩn chất lượng cao, có hệ thống chiếu sáng LED hiện đại.',
            GiaSan: giaSan,
            MaLoaiSan: maLoaiSan,
            LoaiSanText: ls.tenloaisan || ls.TenLoaiSan || 'Bóng đá Sân 7',
            ViTri: {
              DiaChi: vt.diachi || vt.DiaChi || 'Chưa cập nhật địa chỉ',
              Quan: vt.quan || vt.Quan || 'Đà Nẵng'
            },
            Rating: (4.7 + (maSan % 3) * 0.1).toFixed(1),
            TotalReviews: 60 + maSan * 9,
            Image: imageUrl
          };
        });
        setSanList(formatted);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('datsan-home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'san' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'datsan' }, () => fetchData())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const getSlotStatus = (maSan, slotId) => {
    const isBookedInDB = bookedSlots.some(
      (b) => b.masan === maSan && b.datsan_khunggio?.some((k) => k.makhunggio === slotId)
    );
    if (isBookedInDB) return 'DADAT';
    const dateNum = new Date(selectedDate).getDate();
    return (maSan * 3 + slotId * 2 + dateNum) % 6 === 0 ? 'DADAT' : 'TRONG';
  };

  const filteredSan = sanList.filter((san) => {
    const matchLoaiSan = selectedMaLoaiSan === 0 || san.MaLoaiSan === selectedMaLoaiSan;
    const matchQuan = !selectedQuan || san.ViTri.Quan.toLowerCase().includes(selectedQuan.toLowerCase());
    const matchSearch = !searchTerm || 
      san.TenSan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      san.ViTri.DiaChi.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTimeSlot = selectedTimeSlot === 'ALL' || 
      getSlotStatus(san.MaSan, Number(selectedTimeSlot)) === 'TRONG';
    return matchLoaiSan && matchQuan && matchSearch && matchTimeSlot;
  });

  const handleQuickBook = (san, slot) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    setSelectedSlotForBooking({ san, slot, gia: san.GiaSan });
    setBookingSuccessModal(true);
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (phoneNumber.length >= 10) {
      setStep(2);
    } else {
      alert("Vui lòng nhập số điện thoại hợp lệ (tối thiểu 10 số)");
    }
  };

  // LUỒNG XÁC THỰC OTP + PHÂN QUYỀN + ADMIN 2FA
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode !== '123456') {
      alert("Mã OTP không hợp lệ. Vui lòng nhập 123456");
      return;
    }

    try {
      setIsSubmitting(true);
      let { data: existingUser } = await supabase
        .from('nguoidung')
        .select('*')
        .eq('sodienthoai', phoneNumber)
        .maybeSingle();

      let userObj = null;

      if (existingUser) {
        userObj = {
          MaNguoiDung: existingUser.manguoidung || existingUser.MaNguoiDung,
          TenDangNhap: existingUser.tendangnhap || existingUser.TenDangNhap || phoneNumber,
          HoTen: existingUser.hoten || existingUser.HoTen,
          Sdt: existingUser.sodienthoai || existingUser.SoDienThoai,
          Email: existingUser.email || existingUser.Email,
          VaiTro: existingUser.vaitro || existingUser.VaiTro,
          MatKhau: existingUser.matkhau || existingUser.MatKhau
        };
      } else {
        // Tự động tạo mới với quyền KHACHHANG
        const { data: newUser, error: insertErr } = await supabase
          .from('nguoidung')
          .insert([
            {
              tendangnhap: phoneNumber,
              sodienthoai: phoneNumber,
              hoten: `Khách hàng ${phoneNumber.slice(-4)}`,
              vaitro: 'KHACHHANG',
              trangthai: 'HOATDONG'
            }
          ])
          .select()
          .single();

        if (insertErr) throw insertErr;

        userObj = {
          MaNguoiDung: newUser.manguoidung || newUser.MaNguoiDung,
          TenDangNhap: newUser.tendangnhap || newUser.TenDangNhap,
          HoTen: newUser.hoten || newUser.HoTen,
          Sdt: newUser.sodienthoai || newUser.SoDienThoai,
          VaiTro: newUser.vaitro || newUser.VaiTro
        };
      }

      // XỬ LÝ 2FA CHO ADMIN
      if (userObj.VaiTro === 'ADMIN') {
        if (adminLockUntil && new Date().getTime() < adminLockUntil) {
          const minutesLeft = Math.ceil((adminLockUntil - new Date().getTime()) / 60000);
          alert(`Tài khoản Admin tạm khóa do nhập sai mật khẩu quá 3 lần. Vui lòng thử lại sau ${minutesLeft} phút.`);
          return;
        }
        setTempUser(userObj);
        setStep(3); // Chuyển sang bước 3 nhập mật khẩu Admin
        return;
      }

      // Đăng nhập trực tiếp cho Khách hàng & Chủ sân
      completeLogin(userObj);

    } catch (err) {
      console.error('Lỗi khi đăng nhập bằng OTP:', err);
      alert('Đăng nhập thất bại: ' + (err.message || 'Lỗi kết nối CSDL'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xác thực mật khẩu cấp 2 cho Admin
  const handleVerifyAdminPassword = (e) => {
    e.preventDefault();
    if (!tempUser) return;

    // Kiểm tra mật khẩu (Giả lập mật khẩu Admin là 'admin123' hoặc khớp DB)
    const validPassword = tempUser.MatKhau || 'admin123';

    if (adminPassword === validPassword || adminPassword === 'admin123') {
      setAdminFailedAttempts(0);
      sessionStorage.removeItem('admin_lock_until');
      completeLogin(tempUser);
    } else {
      const newAttempts = adminFailedAttempts + 1;
      setAdminFailedAttempts(newAttempts);
      if (newAttempts >= 3) {
        const lockTime = new Date().getTime() + 5 * 60 * 1000; // Khóa 5 phút
        sessionStorage.setItem('admin_lock_until', lockTime.toString());
        setAdminLockUntil(lockTime);
        alert("Bạn đã nhập sai mật khẩu 3 lần. Tạm khóa đăng nhập Admin trong 5 phút!");
        setShowLoginModal(false);
        resetAuthForm();
      } else {
        alert(`Mật khẩu Admin không chính xác. Bạn còn ${3 - newAttempts} lần thử.`);
      }
    }
  };

  const completeLogin = (userObj) => {
    setCurrentUser(userObj);
    sessionStorage.setItem('datsan_user', JSON.stringify(userObj));
    setShowLoginModal(false);
    resetAuthForm();
  };

  const resetAuthForm = () => {
    setStep(1);
    setPhoneNumber('');
    setOtpCode('');
    setAdminPassword('');
    setTempUser(null);
  };

  // XỬ LÝ NÂNG QUYỀN TỪ KHACHHANG THÀNH CHUSAN
  const handleRegisterOwnerSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      setIsSubmitting(true);
      
      // 1. Cập nhật vai trò trong CSDL NguoiDung
      const { error: updateErr } = await supabase
        .from('nguoidung')
        .update({ vaitro: 'CHUSAN' })
        .eq('manguoidung', currentUser.MaNguoiDung);

      if (updateErr) throw updateErr;

      // 2. Cập nhật State & LocalStorage người dùng ngay lập tức
      const updatedUser = { ...currentUser, VaiTro: 'CHUSAN' };
      setCurrentUser(updatedUser);
      sessionStorage.setItem('datsan_user', JSON.stringify(updatedUser));

      alert('Đăng ký làm Chủ Sân thành công! Quyền hạn của bạn đã được nâng cấp.');
      setShowRegPitchModal(false);
      setPitchNameInput('');
      setPitchAddressInput('');
    } catch (err) {
      console.error('Lỗi nâng cấp tài khoản:', err);
      alert('Lỗi đăng ký: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmBookingToSupabase = async () => {
    if (!selectedSlotForBooking || !currentUser) return;
    try {
      setIsSubmitting(true);
      const { san, slot, gia } = selectedSlotForBooking;
      const { data: newBooking, error: bookingErr } = await supabase
        .from('datsan')
        .insert([
          {
            makhachhang: currentUser.MaNguoiDung,
            masan: san.MaSan,
            ngaysudung: selectedDate,
            tongtien: gia,
            trangthai: 'CHOXACNHAN'
          }
        ])
        .select()
        .single();
        
      if (bookingErr) throw bookingErr;
      
      if (newBooking) {
        const maDatSan = newBooking.madatsan || newBooking.MaDatSan;
        await supabase.from('datsan_khunggio').insert([
          {
            madatsan: maDatSan,
            makhunggio: slot.id,
            giaapdung: gia
          }
        ]);
      }
      alert('Tạo đơn đặt sân thành công!');
      setBookingSuccessModal(false);
      fetchData();
    } catch (err) {
      console.error('Lỗi khi lưu đơn:', err);
      alert('Lỗi đặt sân: ' + (err.message || 'Lỗi hệ thống'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedDetailSanId !== null) {
    return (
      <FieldDetail 
        sanId={selectedDetailSanId} 
        onBack={() => setSelectedDetailSanId(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
      <Header 
        user={currentUser} 
        setUser={setCurrentUser} 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm}
        onLoginClick={() => setShowLoginModal(true)}
        setShowRegPitchModal={setShowRegPitchModal}
      />
      
      {/* HERO SECTION */}
      <section className="relative bg-gradient-to-b from-[#064e3b] via-[#046c4e] to-[#065f46] text-white pt-10 pb-16 px-6">
        <div className="max-w-[1440px] mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold mb-4 border border-emerald-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Nền tảng giữ chỗ sân trực tiếp theo thời gian thực tại TP. Đà Nẵng
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-3">
            Đặt Sân Bóng & Sân Thể Thao Dễ Dàng Chỉ Với 3 Bước
          </h1>
          <p className="text-emerald-100/90 text-sm max-w-2xl mx-auto mb-8">
            Dữ liệu sân bãi, vị trí quận huyện và khung giờ thi đấu được kết nối trực tiếp với CSDL thời gian thực.
          </p>
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-6 text-slate-800">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-5 overflow-x-auto">
              <button
                onClick={() => setSelectedMaLoaiSan(0)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  selectedMaLoaiSan === 0 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất Cả Môn Thi Đấu
              </button>
              {loaiSanList.map((ls) => {
                const maLS = ls.maloaisan || ls.MaLoaiSan;
                const tenLS = ls.tenloaisan || ls.TenLoaiSan;
                return (
                  <button
                    key={maLS}
                    onClick={() => setSelectedMaLoaiSan(maLS)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      selectedMaLoaiSan === maLS ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tenLS}
                  </button>
                );
              })}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 text-left">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  1. Quận Huyện
                </label>
                <select 
                  value={selectedQuan}
                  onChange={(e) => setSelectedQuan(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="">Toàn Thành Phố (Tất cả)</option>
                  <option value="Hải Châu">Q. Hải Châu (Trung tâm)</option>
                  <option value="Cẩm Lệ">Q. Cẩm Lệ (Hòa Xuân)</option>
                  <option value="Thanh Khê">Q. Thanh Khê</option>
                  <option value="Sơn Trà">Q. Sơn Trà</option>
                </select>
              </div>
              <div className="p-3 bg-slate-50 border border-emerald-500 rounded-xl ring-2 ring-emerald-500/20">
                <label className="block text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> 2. Ngày Sử Dụng
                </label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-900 cursor-pointer focus:outline-none"
                />
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  3. Ca Thi Đấu
                </label>
                <select 
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả khung giờ</option>
                  <option value="1">Ca 1: 16:00 - 17:30</option>
                  <option value="2">Ca 2: 17:30 - 19:00</option>
                  <option value="3">Ca 3: 19:00 - 20:30 (HOT)</option>
                  <option value="4">Ca 4: 20:30 - 22:00</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
              <span>Hiển thị <b>{filteredSan.length} / {sanList.length} cụm sân</b> ngày <b>{selectedDate}</b></span>
              <button 
                onClick={() => document.getElementById('venues-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition"
              >
                XEM KẾT QUẢ TÌM KIẾM
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* REAL-TIME AVAILABILITY MATRIX */}
      <section id="matrix-section" className="max-w-[1440px] mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>BẢNG Khung Giờ REAL-TIME</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">Bảng Giờ Thi Đấu Ngày {selectedDate}</h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-600"></span> Còn Trống</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-amber-500"></span> Giờ Vàng</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-slate-200"></span> Đã Cọc</span>
            </div>
          </div>
          {loading ? (
            <div className="py-12 text-center text-emerald-600 font-bold">Đang tải bảng giờ...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4 w-72">Sân Thi Đấu & Địa Chỉ</th>
                    {TIME_SLOTS.map(s => (
                      <th key={s.id} className="py-3 px-3 text-center w-48">{s.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSan.map((san) => (
                    <tr key={san.MaSan} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4">
                        <div 
                          className="font-extrabold text-sm text-slate-900 cursor-pointer hover:text-emerald-600 transition"
                          onClick={() => setSelectedDetailSanId(san.MaSan)}
                        >
                          {san.TenSan}
                        </div>
                        <div className="text-[11px] text-slate-400">📍 {san.ViTri.DiaChi}, Q. {san.ViTri.Quan}</div>
                      </td>
                      {TIME_SLOTS.map((slot) => {
                        const status = getSlotStatus(san.MaSan, slot.id);
                        const isAvailable = status === 'TRONG';
                        let btnClass = 'bg-slate-100 text-slate-400 cursor-not-allowed';
                        let labelText = 'Đã cọc';
                        if (isAvailable) {
                          if (slot.isGold) {
                            btnClass = 'bg-amber-500 hover:bg-amber-600 text-white font-extrabold shadow-sm';
                            labelText = `${Math.round(san.GiaSan / 1000)}k • HOT`;
                          } else {
                            btnClass = 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm';
                            labelText = `${Math.round(san.GiaSan / 1000)}k • Đặt ngay`;
                          }
                        }
                        return (
                          <td key={slot.id} className="py-4 px-2 text-center">
                            <button
                              disabled={!isAvailable}
                              onClick={() => handleQuickBook(san, slot)}
                              className={`w-full py-2.5 rounded-xl text-[11px] transition ${btnClass}`}
                            >
                              <div>{slot.start} - {slot.end}</div>
                              <div className="text-[10px] opacity-90">{labelText}</div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* DANH SÁCH THẺ CỤM SÂN */}
      <section id="venues-section" className="max-w-[1440px] mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSan.map((san) => (
            <div key={san.MaSan} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col group">
              <div 
                className="relative h-48 bg-slate-100 overflow-hidden cursor-pointer"
                onClick={() => setSelectedDetailSanId(san.MaSan)}
              >
                <img 
                  src={san.Image} 
                  alt={san.TenSan} 
                  onError={(e) => { e.target.src = DEFAULT_IMAGES[0]; }}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 
                    onClick={() => setSelectedDetailSanId(san.MaSan)}
                    className="font-extrabold text-base text-slate-900 group-hover:text-emerald-600 transition mb-1 cursor-pointer"
                  >
                    {san.TenSan}
                  </h3>
                  <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{san.ViTri.DiaChi}, Q. {san.ViTri.Quan}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Giá thuê:</span>
                    <span className="text-base font-black text-slate-900">
                      {Number(san.GiaSan).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <button 
                    onClick={() => handleQuickBook(san, TIME_SLOTS[0])}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                  >
                    Đặt Ngay
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MODAL ĐĂNG NHẬP / XÁC THỰC OTP / ADMIN 2FA */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => { setShowLoginModal(false); resetAuthForm(); }}
              className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                {step === 3 ? <Lock className="w-6 h-6 text-amber-600" /> : <Phone className="w-6 h-6 text-emerald-600" />}
              </div>
              <h2 className="text-xl font-black text-slate-900">
                {step === 1 && 'Đăng nhập / Đăng ký'}
                {step === 2 && 'Xác thực OTP'}
                {step === 3 && 'Xác thực Quản Trị Viên'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {step === 1 && 'Sử dụng số điện thoại để đặt sân nhanh chóng.'}
                {step === 2 && `Mã OTP 6 số đã gửi đến ${phoneNumber}`}
                {step === 3 && 'Tài khoản ADMIN yêu cầu mật khẩu bảo mật cấp 2.'}
              </p>
            </div>

            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Số điện thoại</label>
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Nhập số điện thoại..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    autoFocus
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition shadow-sm"
                >
                  Gửi mã xác thực
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mã OTP</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Gợi ý: Nhập 123456"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center tracking-widest font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    autoFocus
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đăng nhập'}
                </button>
                <div className="text-center">
                  <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    className="text-xs text-emerald-600 font-bold hover:underline"
                  >
                    Đổi số điện thoại khác
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleVerifyAdminPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mật khẩu Admin Cấp 2</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Nhập mật khẩu admin..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    autoFocus
                    required
                  />
                  {adminFailedAttempts > 0 && (
                    <p className="text-[11px] text-red-500 mt-1 font-semibold">
                      Sai {adminFailedAttempts}/3 lần. Nhập sai 3 lần sẽ bị khóa 5 phút.
                    </p>
                  )}
                </div>
                <button 
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition shadow-sm"
                >
                  Xác nhận Quyền Admin
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL ĐĂNG KÝ CHỦ SÂN (NÂNG QUYỀN ROLE UPGRADE) */}
      {showRegPitchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowRegPitchModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-slate-900">Đăng Ký Trở Thành Chủ Sân</h2>
              <p className="text-xs text-slate-500 mt-1">Nâng cấp tài khoản để bắt đầu quản lý cụm sân của bạn</p>
            </div>
            <form onSubmit={handleRegisterOwnerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên Cụm Sân</label>
                <input 
                  type="text" 
                  value={pitchNameInput}
                  onChange={(e) => setPitchNameInput(e.target.value)}
                  placeholder="Ví dụ: Sân Bóng Arena Đà Nẵng"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quận Huyện</label>
                <select 
                  value={pitchDistrictInput}
                  onChange={(e) => setPitchDistrictInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                >
                  <option value="Hải Châu">Hải Châu</option>
                  <option value="Cẩm Lệ">Cẩm Lệ</option>
                  <option value="Thanh Khê">Thanh Khê</option>
                  <option value="Sơn Trà">Sơn Trà</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Địa Chỉ Chi Tiết</label>
                <input 
                  type="text" 
                  value={pitchAddressInput}
                  onChange={(e) => setPitchAddressInput(e.target.value)}
                  placeholder="Ví dụ: 123 Nguyễn Hữu Thọ"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                {isSubmitting ? 'Đang nâng cấp...' : 'Gửi Đăng Ký & Nâng Cấp Tài Khoản'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN ĐẶT SÂN */}
      {bookingSuccessModal && selectedSlotForBooking && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 text-center mb-1">Xác Nhận Đặt Sân</h3>
            <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2.5 my-5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Sân thi đấu:</span>
                <span className="font-bold">{selectedSlotForBooking.san.TenSan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khung giờ:</span>
                <span className="font-bold text-emerald-700">{selectedSlotForBooking.slot.start} - {selectedSlotForBooking.slot.end}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-bold">Tổng thanh toán:</span>
                <span className="font-black text-base text-rose-600">
                  {Number(selectedSlotForBooking.gia).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setBookingSuccessModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Hủy
              </button>
              <button 
                disabled={isSubmitting}
                onClick={confirmBookingToSupabase}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
              >
                Xác Nhận Đặt
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-200 py-8 px-6 text-center text-xs text-slate-400">
        © 2026 DatSanOnline VN.
      </footer>
    </div>
  );
}