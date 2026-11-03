import React, { useState, useEffect } from 'react';
import { 
  MapPin, Calendar, Clock, ArrowLeft, ShieldCheck, Zap, Star, 
  Check, Phone, CheckCircle, Navigation, Coffee, Award, ChevronRight, Video, Sparkles, Car, Wifi, Info,
  Tv, Heart, ExternalLink, Shield, RefreshCw, CheckCircle2, AlertCircle, Plus, Trash2
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function FieldDetail({ sanId = 1, onBack }) {
  const [sanInfo, setSanInfo] = useState(null);
  const [bookedSlotsFromDB, setBookedSlotsFromDB] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States tương tác bộ lọc ngày & phân loại sân
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSubSan, setSelectedSubSan] = useState('Sân 5 người (Sân A1, A2, A3)');
  
  // STATE MỚI: Dùng mảng để chọn được nhiều khung giờ (cộng dồn giờ)
  const [selectedSlots, setSelectedSlots] = useState([]);

  // State các dịch vụ chọn thêm
  const [services, setServices] = useState({
    water: false,
    bibs: false,
    referee: false,
    video: false
  });

  // TẠO ĐỘNG DANH SÁCH 17 KHUNG GIỜ (Mỗi ca 1 tiếng từ 6:00 đến 23:00)
  const MASTER_TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
    const startHour = i + 6;
    const endHour = startHour + 1;
    const startStr = `${startHour.toString().padStart(2, '0')}:00`;
    const endStr = `${endHour.toString().padStart(2, '0')}:00`;
    let shift = 'morning';
    let basePrice = 200000;
    let isGold = false;

    if (startHour >= 12 && startHour < 16) {
        shift = 'afternoon';
        basePrice = 250000;
    } else if (startHour >= 16) {
        shift = 'evening';
        basePrice = startHour >= 17 && startHour <= 20 ? 380000 : 320000;
        if (startHour >= 17 && startHour <= 20) isGold = true;
    }

    return { 
        id: i + 1, 
        start: startStr, 
        end: endStr, 
        basePrice, 
        shift, 
        isGold,
        label: `${startStr} - ${endStr}` 
    };
  });

  // Ghi nhớ sanId vào localStorage để F5 không bị mất trang
  useEffect(() => {
    sessionStorage.setItem('activeSanId', sanId);
    async function loadSanBaseInfo() {
      try {
        setInitialLoading(true);
        const { data: sanData } = await supabase.from('san').select('*').eq('masan', sanId).single();
        const { data: vtData } = await supabase.from('vitri').select('*');
        const { data: lsData } = await supabase.from('loaisan').select('*');
        if (sanData) {
          const vt = vtData?.find((v) => (v.mavitri || v.MaViTri) === (sanData.mavitri || sanData.MaViTri)) || {};
          const ls = lsData?.find((l) => (l.maloaisan || l.MaLoaiSan) === (sanData.maloaisan || sanData.MaLoaiSan)) || {};
          setSanInfo({
            MaSan: sanData.masan || sanData.MaSan,
            TenSan: sanData.tensan || sanData.TenSan || 'Sân Bóng Đá Cỏ Nhân Tạo Tuyên Sơn',
            MoTa: sanData.mota || sanData.MoTa || 'Sân cỏ nhân tạo tiêu chuẩn thi đấu FIFA 2026, trang bị hệ thống chiếu sáng LED chống chói 1000W hiện đại, bãi đỗ xe rộng rãi.',
            GiaSan: sanData.giasan || sanData.GiaSan || 380000,
            LoaiSanText: ls.tenloaisan || ls.TenLoaiSan || 'Bóng đá Sân 7',
            ViTri: {
              DiaChi: vt.diachi || vt.DiaChi || 'Số 02 Đường 2/9',
              Phuong: vt.phuong || vt.Phuong || 'Hòa Cường Bắc',
              Quan: vt.quan || vt.Quan || 'Hải Châu',
              ThanhPho: vt.thanhpho || vt.ThanhPho || 'Đà Nẵng'
            },
            Rating: 4.9,
            TotalReviews: 148,
            Image: sanData.hinhanh || sanData.HinhAnh || 'https://images.unsplash.com/photo-1529900248057-5e632c63c574?auto=format&fit=crop&w=1200&q=80'
          });
        }
      } catch (err) {
        console.error('Lỗi tải thông tin sân:', err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadSanBaseInfo();
  }, [sanId]);

  const fetchBookedSlots = async () => {
    try {
      const { data: datSanData } = await supabase
        .from('datsan')
        .select('madatsan, masan, ngaysudung, trangthai, datsan_khunggio(makhunggio)')
        .eq('masan', sanId)
        .eq('ngaysudung', selectedDate);
      setBookedSlotsFromDB(datSanData || []);
    } catch (err) {
      console.error('Lỗi tải lịch cọc:', err);
    }
  };

  useEffect(() => {
    fetchBookedSlots();
    // Bỏ chọn các slot hiện tại khi đổi ngày đá
    setSelectedSlots([]);
    const channel = supabase
      .channel('detail-realtime-sub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'datsan' }, () => fetchBookedSlots())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sanId, selectedDate]);

  const getCalculatedSlots = () => {
    let multiplier = 1;
    if (selectedSubSan.includes('Sân 7')) multiplier = 1.35;
    if (selectedSubSan.includes('Sân 11')) multiplier = 2.1;
    return MASTER_TIME_SLOTS.map((slot) => {
      const isBookedInDB = bookedSlotsFromDB.some(
        (b) => b.datsan_khunggio?.some((k) => k.makhunggio === slot.id) && b.trangthai !== 'DAHUY'
      );
      const finalPrice = Math.round((slot.basePrice * multiplier) / 10000) * 10000;
      return {
        ...slot,
        price: finalPrice,
        isBooked: isBookedInDB,
        subText: isBookedInDB ? 'Đã có đội đặt qua hệ thống' : 'Sân cỏ mới vừa trống'
      };
    });
  };

  const currentDynamicSlots = getCalculatedSlots();

  // Hàm Toggle thêm/bớt ca giờ
  const handleToggleSlot = (slot) => {
    const isExist = selectedSlots.some(s => s.id === slot.id);
    if (isExist) {
      setSelectedSlots(selectedSlots.filter(s => s.id !== slot.id));
    } else {
      setSelectedSlots([...selectedSlots, slot].sort((a, b) => a.id - b.id));
    }
  };

  // TÍNH TỔNG TIỀN ĐẶT SÂN
  const totalPitchPrice = selectedSlots.reduce((sum, item) => sum + item.price, 0);
  const priceWater = services.water ? 80000 : 0;
  const priceBibs = services.bibs ? 50000 : 0;
  const priceReferee = services.referee ? 150000 : 0;
  const priceVideo = services.video ? 100000 : 0;
  const discountAmount = selectedSlots.length > 0 ? 50000 : 0;
  const totalPrice = totalPitchPrice + priceWater + priceBibs + priceReferee + priceVideo - discountAmount;

  const handleConfirmBooking = async () => {
    if (selectedSlots.length === 0) return;
    
    // Lấy thông tin user (để lấy mã Khách hàng), mặc định 4 nếu chưa đăng nhập
    const localUser = JSON.parse(sessionStorage.getItem('datsan_user'));
    const maKH = localUser ? localUser.MaNguoiDung : 4; 

    try {
      setIsSubmitting(true);
      const { data: newBooking, error: bErr } = await supabase.from('datsan').insert([
        {
          makhachhang: maKH,
          masan: sanInfo.MaSan,
          ngaysudung: selectedDate,
          tongtien: totalPrice,
          trangthai: 'CHOXACNHAN'
        }
      ]).select().single();
      if (bErr) throw bErr;

      if (newBooking) {
        // Lưu toàn bộ các khung giờ đã chọn vào bảng datsan_khunggio
        const itemsToInsert = selectedSlots.map(slot => ({
          madatsan: newBooking.madatsan || newBooking.MaDatSan,
          makhunggio: slot.id,
          giaapdung: slot.price
        }));
        await supabase.from('datsan_khunggio').insert(itemsToInsert);
      }

      alert('Tạo đơn đặt sân thành công!'); // Thay thế màn hình block cũ
      setSelectedSlots([]); // Reset bảng để người dùng bấm đặt tiếp sân khác ngay lập tức
      setServices({ water: false, bibs: false, referee: false, video: false });
      fetchBookedSlots();
    } catch (e) {
      alert('Lỗi đặt sân: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-emerald-600 font-bold gap-3">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span>Đang kết nối CSDL Supabase tải thông tin sân...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased pb-20">
      {/* TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#046c4e] text-emerald-100 text-xs py-1.5 px-6 border-b border-emerald-700/50">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              Hotline hỗ trợ 24/7: <b className="text-white">1900 8899</b>
            </span>
            <span className="hidden md:inline text-emerald-300/80">|</span>
            <span className="hidden md:inline">Hệ thống giữ chỗ thời gian thực DatSanOnline</span>
          </div>
          <div className="flex items-center space-x-4 text-emerald-100">
            <span className="bg-emerald-700 px-2.5 py-0.5 rounded text-[11px] font-bold">Giữ chỗ 100%</span>
            <span>Đã phục vụ hơn 3.200+ trận đấu</span>
          </div>
        </div>
      </div>
      {/* HEADER NAVIGATION */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                sessionStorage.removeItem('activeSanId');
                onBack();
              }} 
              className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600 flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
            </button>
            <div className="h-4 w-px bg-slate-200"></div>
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow">DS</div>
              <span className="text-xl font-black text-emerald-600">DatSanOnline</span>
            </a>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold text-slate-600">
            <span className="text-emerald-600">Trang Chủ</span>
            <span>Tìm Sân Nhanh</span>
            <span>Bảng Giá & Khung Giờ</span>
            <span>Tìm Đối Giao Lưu</span>
          </div>
        </div>
      </header>
      {/* BREADCRUMBS & TIÊU ĐỀ SÂN */}
      <main className="max-w-[1440px] mx-auto px-6 pt-6">
        <div className="text-xs text-slate-400 flex items-center gap-2 mb-4">
          <span>Trang Chủ</span> <ChevronRight className="w-3 h-3" />
          <span>Đà Nẵng</span> <ChevronRight className="w-3 h-3" />
          <span>Quận {sanInfo?.ViTri.Quan}</span> <ChevronRight className="w-3 h-3" />
          <span className="text-slate-700 font-bold">{sanInfo?.TenSan}</span>
        </div>
        {/* BADGES NỔI BẬT */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">CỎ MỚI 2026</span>
          <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">CHUẨN FIFA</span>
          <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase flex items-center gap-1"><Video className="w-3 h-3" /> CÓ CAMERA QUAY TRẬN ĐẤU</span>
          <span className="px-2.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase">ĐƯỢC ĐẶT NHIỀU NHẤT TUẦN</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{sanInfo?.TenSan}</h1>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-4 h-4 fill-amber-400" /> {sanInfo?.Rating} ({sanInfo?.TotalReviews} đánh giá thực tế)
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">Đã phục vụ hơn 3.200+ trận đấu</span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {sanInfo?.ViTri.DiaChi}, P. {sanInfo?.ViTri.Phuong}, Q. {sanInfo?.ViTri.Quan}, TP. Đà Nẵng</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition">
              <Navigation className="w-3.5 h-3.5 text-emerald-600" /> Google Maps
            </button>
            <button className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition">
              <Phone className="w-3.5 h-3.5" /> Quản lý sân: 0905.123.456
            </button>
          </div>
        </div>
        {/* LAYOUT GRID 12 CỘT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* CỘT TRÁI (8 CỘT) */}
          <div className="lg:col-span-8 space-y-8">
            {/* THƯ VIỆN ẢNH GALLERY GRID */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 relative h-[380px] rounded-2xl overflow-hidden shadow-sm bg-slate-100">
                <img src={sanInfo?.Image} alt="Main" className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-xl font-bold">
                  Hệ thống sân cỏ nhân tạo tiêu chuẩn thi đấu, đèn LED 1000W
                </div>
              </div>
              <div className="grid grid-rows-3 gap-2 h-[380px]">
                <div className="rounded-xl overflow-hidden bg-slate-100 relative">
                  <img src="https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=400&q=80" alt="Sub 1" className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-bold">Khán đài có mái che</span>
                </div>
                <div className="rounded-xl overflow-hidden bg-slate-100 relative">
                  <img src="https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=400&q=80" alt="Sub 2" className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-bold">Phòng tắm nóng lạnh</span>
                </div>
                <div className="rounded-xl overflow-hidden bg-slate-100 relative">
                  <img src="https://images.unsplash.com/photo-1626248801379-51a0748a5f96?auto=format&fit=crop&w=400&q=80" alt="Sub 3" className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-bold">Bãi đỗ ô tô 50 xe</span>
                </div>
              </div>
            </div>
            {/* TIỆN ÍCH TIÊU CHUẨN SÂN BÃI */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-extrabold text-base text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Tiện Ích Tiêu Chuẩn Sân Bãi
              </h3>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold"><Zap className="w-4 h-4" /></div>
                  <div><div className="font-bold">Đèn LED 1000W</div><div className="text-[11px] text-slate-400">Góc chiếu sáng rộng chống chói</div></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold"><Car className="w-4 h-4" /></div>
                  <div><div className="font-bold">Bãi đỗ ô tô & Xe máy</div><div className="text-[11px] text-slate-400">Bảo vệ & camera an ninh 24/7</div></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold"><Coffee className="w-4 h-4" /></div>
                  <div><div className="font-bold">Tắm nóng lạnh</div><div className="text-[11px] text-slate-400">Khu thay đồ & tủ khóa riêng</div></div>
                </div>
              </div>
            </div>
            {/* BẢNG CHỌN NGÀY & KHUNG GIỜ TỰ ĐỘNG CHẠY NGẦM */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Bảng Khung Giờ Thi Đấu Trực Quan (1 Tiếng/Ca)</h3>
                  <p className="text-xs text-slate-400">Có thể bấm chọn nhiều ca liên tiếp để đặt 2-3 tiếng.</p>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Realtime Supabase
                </span>
              </div>
              {/* BƯỚC 1: CHỌN NGÀY ĐÁ */}
              <div className="mb-5">
                <div className="text-xs font-bold uppercase text-slate-400 mb-2">BƯỚC 1: CHỌN NGÀY ĐÁ</div>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { day: 'HÔM NAY', date: '30/10', full: '2026-10-30', label: 'Thứ Sáu' },
                    { day: 'NGÀY MAI', date: '31/10', full: '2026-10-31', label: 'Thứ Bảy' },
                    { day: 'NGÀY KỊA', date: '01/11', full: '2026-11-01', label: 'Chủ Nhật' },
                    { day: 'THỨ HAI', date: '02/11', full: '2026-11-02', label: 'Thứ Hai' },
                    { day: 'THỨ BA', date: '03/11', full: '2026-11-03', label: 'Thứ Ba' },
                    { day: 'THỨ TƯ', date: '04/11', full: '2026-11-04', label: 'Thứ Tư' }
                  ].map((d) => (
                    <button
                      key={d.full}
                      onClick={() => setSelectedDate(d.full)}
                      className={`p-3 rounded-xl border text-center transition ${
                        selectedDate === d.full 
                          ? 'bg-emerald-700 text-white border-emerald-700 font-extrabold shadow-md' 
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[10px] opacity-80 uppercase">{d.day}</div>
                      <div className="text-base font-black my-0.5">{d.date}</div>
                      <div className="text-[10px] opacity-90">{d.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              {/* BƯỚC 2: CHỌN PHÂN LOẠI SÂN */}
              <div className="mb-6">
                <div className="text-xs font-bold uppercase text-slate-400 mb-2">BƯỚC 2: CHỌN PHÂN LOẠI SÂN</div>
                <div className="flex gap-3">
                  {['Sân 5 người (Sân A1, A2, A3)', 'Sân 7 người (Sân B1, B2)', 'Sân 11 người (Toàn sân Tuyên Sơn)'].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubSan(sub)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedSubSan === sub 
                          ? 'bg-emerald-600 text-white shadow' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> {sub}
                    </button>
                  ))}
                </div>
              </div>
              {/* CHÚ THÍCH TRẠNG THÁI */}
              <div className="flex items-center gap-6 text-xs font-bold mb-4 pb-3 border-b border-slate-100">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-600"></span> Còn trống</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500"></span> Đang chọn</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200"></span> Đã cọc</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400"></span> Giờ Vàng VIP</span>
              </div>
              
              {/* GRID KHUNG GIỜ THI ĐẤU 1 TIẾNG */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {currentDynamicSlots.map((slot) => {
                    const isSelected = selectedSlots.some(s => s.id === slot.id);
                    return (
                        <div key={slot.id} className={`p-3 rounded-xl border flex flex-col justify-between transition ${
                            slot.isBooked ? 'bg-slate-100 opacity-60' : isSelected ? 'bg-amber-50 border-2 border-amber-500 shadow-sm' : 'bg-slate-50 hover:bg-slate-100'
                        }`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    {slot.isGold && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-extrabold text-[9px] uppercase inline-block mb-1">VIP</span>}
                                    <div className="font-extrabold text-sm text-slate-900">{slot.start} - {slot.end}</div>
                                </div>
                                <div className="text-[10px] text-slate-500">{slot.subText}</div>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                                <div className="font-black text-emerald-700 text-sm">{slot.price.toLocaleString('vi-VN')} đ</div>
                                {slot.isBooked ? (
                                    <span className="px-2 py-1 bg-slate-200 text-slate-500 font-bold text-[10px] rounded-lg">Đã cọc</span>
                                ) : (
                                    <button 
                                        onClick={() => handleToggleSlot(slot)} 
                                        className={`px-3 py-1 font-bold text-[11px] rounded-lg ${isSelected ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                    >
                                        {isSelected ? 'Đã Chọn' : '+ Chọn'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
              </div>
            </div>
            {/* DỊCH VỤ CỘNG THÊM PHỤC VỤ TRẬN ĐẤU */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-extrabold text-base text-slate-900 mb-1">Dịch Vụ Cộng Thêm Phục Vụ Trận Đấu (Tùy chọn)</h3>
              <p className="text-xs text-slate-400 mb-4">Chọn thêm dịch vụ đi kèm khi chọn được khung giờ đá.</p>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={services.water} 
                      onChange={(e) => setServices({ ...services, water: e.target.checked })} 
                      className="w-4 h-4 accent-emerald-600 rounded" 
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-800">Thùng nước uống đá lạnh 24 chai (ướp lạnh sẵn)</div>
                      <div className="text-[11px] text-slate-400">Thùng đá ướp lạnh sẵn mang tận sân trước 15 phút bóng lăn</div>
                    </div>
                  </div>
                  <span className="font-black text-xs text-emerald-700">+80.000 đ</span>
                </label>
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={services.bibs} 
                      onChange={(e) => setServices({ ...services, bibs: e.target.checked })} 
                      className="w-4 h-4 accent-emerald-600 rounded" 
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-800">Thuê 2 bộ áo bib thi đấu (14 áo chia 2 màu cam / xanh)</div>
                      <div className="text-[11px] text-slate-400">Áo giặt sạch sẽ, phân định đội hình chuyên nghiệp</div>
                    </div>
                  </div>
                  <span className="font-black text-xs text-emerald-700">+50.000 đ</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* CỘT PHẢI (4 CỘT STICKY) - CHỈ HIỂN THỊ TÍNH TIỀN KHI ĐÃ CHỌN KHUNG GIỜ */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
              
              {selectedSlots.length > 0 ? (
                <>
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Đang giữ chỗ: {selectedSlots.length} tiếng
                    </span>
                    <button onClick={() => setSelectedSlots([])} className="text-[10px] text-red-500 font-bold hover:underline">Hủy tất cả</button>
                  </div>
                  <h3 className="font-black text-base text-slate-900 mb-4">Chi Tiết Đặt Sân</h3>
                  <div className="space-y-3 text-xs border-b border-slate-100 pb-4 mb-4">
                    <div className="flex justify-between items-start">
                      <span className="text-slate-500">Sân thi đấu:</span>
                      <span className="font-extrabold text-slate-900 text-right">{selectedSubSan}<br /><span className="text-[10px] font-normal text-slate-400">{sanInfo?.TenSan}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ngày sử dụng:</span>
                      <span className="font-extrabold text-slate-900">{selectedDate}</span>
                    </div>
                    
                    {/* Danh sách các ca đã chọn */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 mt-2">
                        <div className="font-bold text-slate-500 mb-1 border-b pb-1">Các ca đã chọn ({selectedSlots.length}):</div>
                        {selectedSlots.map(slot => (
                            <div key={slot.id} className="flex justify-between text-[11px]">
                                <span className="font-bold text-slate-700">{slot.label}</span>
                                <span className="font-extrabold text-emerald-700">{slot.price.toLocaleString('vi-VN')} đ</span>
                            </div>
                        ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs border-b border-slate-100 pb-4 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tổng tiền thuê sân:</span>
                      <span className="font-extrabold">{totalPitchPrice.toLocaleString('vi-VN')} đ</span>
                    </div>
                    {services.water && (
                      <div className="flex justify-between text-slate-600">
                        <span>Thùng nước uống 24 chai:</span>
                        <span className="font-bold">+80.000 đ</span>
                      </div>
                    )}
                    {services.bibs && (
                      <div className="flex justify-between text-slate-600">
                        <span>Thuê 2 bộ áo bib:</span>
                        <span className="font-bold">+50.000 đ</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>🏷️ Mã giảm giá (SANVIP50):</span>
                      <span>-50.000 đ</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <div className="text-[11px] text-slate-400 uppercase font-bold">TỔNG TIỀN THANH TOÁN</div>
                      <div className="text-[10px] text-emerald-600 font-semibold">Đã bao gồm VAT & Dịch vụ</div>
                    </div>
                    <div className="text-2xl font-black text-amber-500">
                      {totalPrice.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <button 
                    disabled={isSubmitting}
                    onClick={handleConfirmBooking}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 transition flex items-center justify-center gap-2 mb-4"
                  >
                    {isSubmitting ? 'ĐANG LƯU CSDL...' : 'XÁC NHẬN ĐẶT SÂN & GIỮ CHỖ'} <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Chưa Chọn Khung Giờ</h4>
                    <p className="text-xs text-slate-400 mt-1">Vui lòng bấm chọn các ca 1 tiếng bên trái để cộng dồn giờ đá.</p>
                  </div>
                </div>
              )}
              <div className="text-[11px] text-slate-400 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Hoàn tiền 100% nếu hủy trước 24h
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Đồng bộ CSDL Supabase Realtime
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}