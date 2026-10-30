import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, Calendar, Clock, ChevronDown, Bell, User, 
  Flame, Award, ShieldCheck, Zap, Phone, CheckCircle, ArrowRight,
  Sparkles, Star, Heart, Navigation, ExternalLink, Ticket, Check, RefreshCw, Eye, Users, MessageSquare
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import FieldDetail from './FieldDetail';

// 1. Danh sách ảnh thẻ sân dự phòng chất lượng cao
const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1529900248057-5e632c63c574?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1626248801379-51a0748a5f96?auto=format&fit=crop&w=800&q=80'
];

// 2. Định nghĩa chuẩn 4 khung giờ thi đấu - Cố định thứ tự từ ID 1 đến 4
const TIME_SLOTS = [
  { id: 1, start: '16:00', end: '17:30', label: '16:00 - 17:30' },
  { id: 2, start: '17:30', end: '19:00', label: '17:30 - 19:00' },
  { id: 3, start: '19:00', end: '20:30', label: '19:00 - 20:30 (HOT)', isGold: true },
  { id: 4, start: '20:30', end: '22:00', label: '20:30 - 22:00' }
];

export default function Home() {
  // State người dùng hiện tại từ CSDL NguoiDung
  const [currentUser] = useState({
    MaNguoiDung: 4,
    TenDangNhap: 'ducminh_fc',
    HoTen: 'Đức Minh (FC Sông Hàn)',
    Email: 'ducminh@datsan.vn',
    VaiTro: 'KHACHHANG'
  });

  // Dynamic States kết nối Supabase CSDL
  const [loaiSanList, setLoaiSanList] = useState([]);
  const [sanList, setSanList] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Router State điều hướng sang trang Chi Tiết Sân (SanDetail.jsx)
  const [selectedDetailSanId, setSelectedDetailSanId] = useState(null);

  // Filter States
  const [selectedMaLoaiSan, setSelectedMaLoaiSan] = useState(0); // 0 = Tất cả
  const [selectedQuan, setSelectedQuan] = useState(''); // '' = Tất cả quận
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Đặt Sân Quá Trình
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState(null);
  const [bookingSuccessModal, setBookingSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dữ liệu mẫu ghép kèo cộng đồng
  const [communityMatches] = useState([
    { id: 1, team: 'FC Sông Hàn', level: 'Khá - Cần kèo 5v5', time: '19:00 - Hôm nay', pitch: 'Tuyên Sơn Arena', phone: '0905.111.222' },
    { id: 2, team: 'Pickleball Đà Thành', level: 'Trung bình - Cần đối đôi nam nữ', time: '17:30 - Hôm nay', pitch: 'Pickleball Hòa Xuân', phone: '0905.333.444' },
    { id: 3, team: 'FC Chợ Mới', level: 'Cơ bản - Bắt kèo 7v7 chia tiền sân', time: '20:30 - Ngày mai', pitch: 'Chợ Mới Green Field', phone: '0905.555.666' }
  ]);

  // --------------------------------------------------------------------------
  // FETCH DỮ LIỆU TỪ SUPABASE (REALTIME SYNC)
  // --------------------------------------------------------------------------
  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: lsData } = await supabase.from('loaisan').select('*');
      if (lsData) setLoaiSanList(lsData);

      const { data: vtData } = await supabase.from('vitri').select('*');
      const { data: sanData } = await supabase.from('san').select('*');

      // Tải các đơn đặt sân đã cọc theo ngày được chọn
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
            MoTa: san.mota || san.MoTa || 'Sân cỏ nhân tạo chất lượng tiêu chuẩn cao, có hệ thống chiếu sáng LED hiện đại.',
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

    // Lắng nghe biến động CSDL thời gian thực
    const channel = supabase
      .channel('datsan-home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'san' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'datsan' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  // Thuật toán kiểm tra trạng thái khung giờ
  const getSlotStatus = (maSan, slotId) => {
    const isBookedInDB = bookedSlots.some(
      (b) => b.masan === maSan && b.datsan_khunggio?.some((k) => k.makhunggio === slotId)
    );
    if (isBookedInDB) return 'DADAT';

    const dateNum = new Date(selectedDate).getDate();
    return (maSan * 3 + slotId * 2 + dateNum) % 6 === 0 ? 'DADAT' : 'TRONG';
  };

  // Logic lọc danh sách sân
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
    setSelectedSlotForBooking({ san, slot, gia: san.GiaSan });
    setBookingSuccessModal(true);
  };

  // Xác nhận lưu đơn đặt sân vào CSDL Supabase
  const confirmBookingToSupabase = async () => {
    if (!selectedSlotForBooking) return;
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

      alert('Tạo đơn đặt sân thành công vào Supabase!');
      setBookingSuccessModal(false);
      fetchData();
    } catch (err) {
      console.error('Lỗi khi lưu đơn:', err);
      alert('Lỗi đặt sân: ' + (err.message || 'Lỗi hệ thống'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ĐIỀU HƯỚNG TRỰC TIẾP SANG TRANG CHI TIẾT SÂN
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
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#046c4e] text-emerald-100 text-xs py-1.5 px-6 border-b border-emerald-700/50">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              Hotline đặt sân 24/7: <b className="text-white">1900 8899</b>
            </span>
            <span className="hidden md:inline text-emerald-300/80">|</span>
            <span className="hidden md:inline">Kết nối trực tiếp CSDL PostgreSQL Sân Thể Thao Đà Nẵng</span>
          </div>
          <div className="flex items-center space-x-5 text-emerald-100">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Tự động giữ chỗ tức thì
            </span>
            <span>•</span>
            <span className="font-semibold text-white">Đang đăng nhập: {currentUser.HoTen}</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER NAVIGATION */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <a href="/" className="flex items-center gap-2.5">
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
            </a>
            <div className="relative">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>TP. Đà Nẵng</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên sân (Tuyên Sơn, Chợ Mới...), địa chỉ (Nại Nam, Trưng Nữ Vương)..."
                className="w-full h-11 pl-11 pr-24 rounded-full bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4" />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 text-xs text-slate-400 hover:text-slate-600"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition">
              <span>+ Đăng Ký Chủ Sân</span>
            </button>
            <button className="relative p-2 text-slate-500 hover:text-emerald-600 transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                ĐM
              </div>
              <div className="hidden xl:block text-left text-xs leading-tight">
                <div className="font-bold text-slate-800">{currentUser.HoTen}</div>
                <div className="text-[10px] text-emerald-600 font-medium font-mono">#{currentUser.TenDangNhap} • VIP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub Nav */}
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-[1440px] mx-auto px-6 h-11 flex items-center justify-between text-xs font-semibold">
            <nav className="flex items-center space-x-8">
              <a href="#" className="text-emerald-600 border-b-2 border-emerald-600 py-3 font-bold">Trang Chủ</a>
              <a href="#matrix-section" className="text-slate-600 hover:text-emerald-600 py-3 transition">Lưới Khung Giờ Real-time</a>
              <a href="#venues-section" className="text-slate-600 hover:text-emerald-600 py-3 transition">Danh Sách Cụm Sân ({sanList.length})</a>
              <a href="#community-section" className="text-slate-600 hover:text-emerald-600 py-3 transition">Ghép Kèo Giao Lưu</a>
            </nav>
            <div className="flex items-center gap-2 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Realtime Supabase Sync
            </div>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION VỚI BỘ LỌC TƯƠNG TÁC */}
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
            {/* Tabs LoaiSan */}
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

            {/* Grid 3 trường lọc */}
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
                  <Calendar className="w-3.5 h-3.5" /> 2. Ngày Sử Dụng (Đổi Ngày)
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
                  3. Ca Thi Đấu Ưu Tiên
                </label>
                <select 
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả khung giờ (16:00 - 22:00)</option>
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
                onClick={() => {
                  const elem = document.getElementById('venues-section');
                  elem?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition"
              >
                XEM KẾT QUẢ TÌM KIẾM
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. REAL-TIME AVAILABILITY MATRIX */}
      <section id="matrix-section" className="max-w-[1440px] mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>BẢNG Khung Giờ REAL-TIME</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Bảng Giờ Thi Đấu Ngày {selectedDate}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bấm vào ô màu xanh để tạo đơn đặt sân trong 30 giây.
              </p>
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
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          {san.LoaiSanText}
                        </span>
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

      {/* 5. DANH SÁCH THẺ CỤM SÂN */}
      <section id="venues-section" className="max-w-[1440px] mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
              <Award className="w-4 h-4" />
              <span>Hệ Thống Sân Tiêu Chuẩn 5 Sao</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Cụm Sân Thể Thao Đang Hoạt Động ({filteredSan.length})
            </h2>
          </div>
        </div>

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
                <span className="absolute top-3 left-3 text-[11px] font-black uppercase text-white px-2.5 py-1 rounded bg-emerald-700 shadow-sm">
                  {san.LoaiSanText}
                </span>
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-bold text-white drop-shadow">
                  <span className="bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">Mã Sân: #{san.MaSan}</span>
                  <span className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {san.Rating} ({san.TotalReviews} đánh giá)
                  </span>
                </div>
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
                  <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-4">
                    {san.MoTa}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Giá thuê niêm yết:</span>
                    <span className="text-base font-black text-slate-900">
                      {Number(san.GiaSan).toLocaleString('vi-VN')} đ <span className="text-xs font-normal text-slate-500">/ca</span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedDetailSanId(san.MaSan)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Chi Tiết
                    </button>
                    <button 
                      onClick={() => handleQuickBook(san, TIME_SLOTS[0])}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                    >
                      Đặt Ngay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. SECTION GHÉP KÈO CỘNG ĐỒNG */}
      <section id="community-section" className="bg-slate-100/70 border-t border-b border-slate-200 py-12 px-6">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase mb-1">
                <Users className="w-4 h-4" /> <span>Cộng Đồng Ghép Kèo Đà Nẵng</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">Đang Tìm Đối Thủ / Ghép Đội Thi Đấu</h2>
            </div>
            <button className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-700 transition">
              + Đăng Tin Tìm Kèo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {communityMatches.map((m) => (
              <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-extrabold text-sm text-slate-900">{m.team}</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Đang chờ đối</span>
                </div>
                <div className="text-xs text-slate-600 mb-1">⚽ Trình độ: <b>{m.level}</b></div>
                <div className="text-xs text-slate-500 mb-1">🕒 Thời gian: {m.time}</div>
                <div className="text-xs text-slate-500 mb-4">📍 Địa điểm: {m.pitch}</div>
                <button 
                  onClick={() => alert(`Hotline kết nối FC: ${m.phone}`)}
                  className="w-full py-2 bg-slate-50 hover:bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Bắt Kèo Ngay ({m.phone})
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. MODAL ĐẶT SÂN TÍCH HỢP LƯU CSDL */}
      {bookingSuccessModal && selectedSlotForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 text-center mb-1">
              Xác Nhận Đặt Sân Trực Tiếp
            </h3>
            <p className="text-xs text-slate-500 text-center mb-5">
              Đơn đặt sẽ được lưu trực tiếp vào CSDL Supabase.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2.5 mb-5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Khách hàng:</span>
                <span className="font-bold">{currentUser.HoTen}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sân thi đấu:</span>
                <span className="font-bold">{selectedSlotForBooking.san.TenSan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày sử dụng:</span>
                <span className="font-bold">{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khung giờ:</span>
                <span className="font-bold text-emerald-700">
                  {selectedSlotForBooking.slot.start} - {selectedSlotForBooking.slot.end}
                </span>
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
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Hủy
              </button>
              <button 
                disabled={isSubmitting}
                onClick={confirmBookingToSupabase}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Đang lưu CSDL...' : 'Xác Nhận Đặt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-8 px-6 text-center text-xs text-slate-400">
        © 2026 DatSanOnline VN. Tương thích CSDL PostgreSQL Supabase Realtime.
      </footer>
    </div>
  );
}