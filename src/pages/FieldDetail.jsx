import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { 
  MapPin, Calendar, Clock, ArrowLeft, ShieldCheck, Zap, Star, 
  Check, Phone, CheckCircle, Navigation, Coffee, Award, ChevronRight, Video, Sparkles, Car, Wifi, Info,
  Tv, Heart, ExternalLink, Shield, RefreshCw, CheckCircle2, AlertCircle, Plus, Trash2, User, Users,
  Search, Bell, LogIn, LogOut, Building2, PlusCircle, LayoutDashboard
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function FieldDetail({ sanId: propSanId, onBack, user, setUser }) {
  const navigate = useNavigate();
  const { id: urlSanId } = useParams();
  
  const currentSanId = Number(urlSanId || propSanId || sessionStorage.getItem('activeSanId') || 1);

  const dropdownRef = useRef(null);
  const [sanInfo, setSanInfo] = useState(null);
  const [bookedSlotsFromDB, setBookedSlotsFromDB] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  
  // States các dịch vụ cộng thêm
  const [services, setServices] = useState({
    water: false,
    bibs: false,
    racketBadminton: false,
    shuttlecock: false,
    racketTennis: false
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  useEffect(() => {
    if (currentSanId) sessionStorage.setItem('activeSanId', currentSanId);
    
    async function loadSanBaseInfo() {
      try {
        setInitialLoading(true);
        const { data: sanData } = await supabase
          .from('san')
          .select('*')
          .eq('masan', currentSanId)
          .single();
          
        const { data: vtData } = await supabase.from('vitri').select('*');
        const { data: lsData } = await supabase.from('loaisan').select('*');

        if (sanData) {
          const vt = vtData?.find((v) => Number(v.mavitri || v.MaViTri) === Number(sanData.mavitri || sanData.MaViTri)) || {};
          const ls = lsData?.find((l) => Number(l.maloaisan || l.MaLoaiSan) === Number(sanData.maloaisan || sanData.MaLoaiSan)) || {};
          
          setSanInfo({
            MaSan: sanData.masan || sanData.MaSan,
            TenSan: sanData.tensan || sanData.TenSan,
            MoTa: sanData.mota || sanData.MoTa || 'Sân thể thao chất lượng cao.',
            GiaSan: sanData.giasan || sanData.GiaSan || 200000,
            LoaiSanText: ls.tenloaisan || ls.TenLoaiSan || 'Sân Thể Thao',
            ViTri: {
              DiaChi: vt.diachi || vt.DiaChi || 'Chưa cập nhật địa chỉ',
              Phuong: vt.phuong || vt.Phuong || '',
              Quan: vt.quan || vt.Quan || 'Đà Nẵng',
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
  }, [currentSanId]);

  const fetchBookedSlots = async () => {
    try {
      const { data: datSanData } = await supabase
        .from('datsan')
        .select('madatsan, masan, ngaysudung, trangthai, datsan_khunggio(makhunggio)')
        .eq('masan', currentSanId)
        .eq('ngaysudung', selectedDate);
      setBookedSlotsFromDB(datSanData || []);
    } catch (err) {
      console.error('Lỗi tải lịch cọc:', err);
    }
  };

  useEffect(() => {
    fetchBookedSlots();
    setSelectedSlots([]);
    const channel = supabase
      .channel('detail-realtime-sub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'datsan' }, () => fetchBookedSlots())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSanId, selectedDate]);

  const getCalculatedSlots = () => {
    return MASTER_TIME_SLOTS.map((slot) => {
      const isBookedInDB = bookedSlotsFromDB.some(
        (b) => b.datsan_khunggio?.some((k) => k.makhunggio === slot.id) && b.trangthai !== 'DAHUY'
      );
      return {
        ...slot,
        price: slot.basePrice,
        isBooked: isBookedInDB,
        subText: isBookedInDB ? 'Đã có đội đặt qua hệ thống' : 'Sân mới vừa trống'
      };
    });
  };

  const currentDynamicSlots = getCalculatedSlots();

  const handleToggleSlot = (slot) => {
    const isExist = selectedSlots.some(s => s.id === slot.id);
    if (isExist) {
      setSelectedSlots(selectedSlots.filter(s => s.id !== slot.id));
    } else {
      setSelectedSlots([...selectedSlots, slot].sort((a, b) => a.id - b.id));
    }
  };

  // PHÂN LOẠI MÔN THỂ THAO ĐỂ BẬT DỊCH VỤ CHUẨN NGHIỆP VỤ
  const loaiSanLower = (sanInfo?.LoaiSanText || '').toLowerCase();
  
  const isFootball = loaiSanLower.includes('bóng đá') || loaiSanLower.includes('sân 5') || loaiSanLower.includes('sân 7') || loaiSanLower.includes('sân 11');
  const isBadminton = loaiSanLower.includes('cầu lông');
  const isTennis = loaiSanLower.includes('tennis');
  const isPickleball = loaiSanLower.includes('pickleball') || loaiSanLower.includes('pick');

  // Xác định số lượng áo bib theo từng loại sân bóng đá (Chỉ cấp cho 1 đội)
  let bibCountText = "1 bộ áo bib";
  if (loaiSanLower.includes('sân 11')) {
    bibCountText = "1 bộ (11 áo)";
  } else if (loaiSanLower.includes('sân 7')) {
    bibCountText = "1 bộ (7 áo)";
  } else {
    bibCountText = "1 bộ (5 áo)";
  }

  // TÍNH TIỀN THUÊ SÂN VÀ CÁC DỊCH VỤ DỰA THEO SỐ GIỜ ĐÃ CHỌN
  const totalPitchPrice = selectedSlots.reduce((sum, item) => sum + item.price, 0);
  const totalHours = selectedSlots.length > 0 ? selectedSlots.length : 1;

  // Giá nước uống: Bóng đá & Pickleball = 150k (12 chai); Cầu lông & Tennis = 90k (6 chai)
  const waterPrice = (isFootball || isPickleball) ? 150000 : 90000;
  const priceWater = services.water ? waterPrice : 0;
  
  // Giá áo bib: 50.000 đ
  const priceBibs = (isFootball && services.bibs) ? 50000 : 0;

  // Giá dịch vụ cầu lông: Vợt 80k/cặp/h; Hộp cầu 250k
  const priceRacketBadminton = (isBadminton && services.racketBadminton) ? (80000 * totalHours) : 0;
  const priceShuttlecock = (isBadminton && services.shuttlecock) ? 250000 : 0;

  // Giá dịch vụ Tennis: Vợt 100k/cây/h
  const priceRacketTennis = (isTennis && services.racketTennis) ? (100000 * totalHours) : 0;

  // TỔNG TIỀN THANH TOÁN
  const totalPrice = totalPitchPrice + priceWater + priceBibs + priceRacketBadminton + priceShuttlecock + priceRacketTennis;

  const currentUser = user || JSON.parse(sessionStorage.getItem('datsan_user'));
  const displayName = currentUser?.HoTen || currentUser?.hoten || 'Khách Hàng (Chưa Đăng Nhập)';
  const userRole = currentUser?.VaiTro || currentUser?.vaitro || 'KHACHHANG';

  const handleConfirmBooking = async () => {
    if (selectedSlots.length === 0) return;
    const localUser = currentUser;
    const maKH = localUser ? (localUser.MaNguoiDung || localUser.manguoidung) : 4; 
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
        const itemsToInsert = selectedSlots.map(slot => ({
          madatsan: newBooking.madatsan || newBooking.MaDatSan,
          makhunggio: slot.id,
          giaapdung: slot.price
        }));
        await supabase.from('datsan_khunggio').insert(itemsToInsert);
      }
      alert('Tạo đơn đặt sân thành công!');
      setSelectedSlots([]);
      setServices({
        water: false,
        bibs: false,
        racketBadminton: false,
        shuttlecock: false,
        racketTennis: false
      });
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
              <Zap className="w-3.5 h-3.5 text-amber-300" /> Hotline hỗ trợ 24/7: <b className="text-white">1900 8899</b>
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

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm font-sans">
        <div className="max-w-[1440px] mx-auto px-6 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Link 
              to="/" 
              onClick={() => { if (typeof onBack === 'function') onBack(); }} 
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white shadow-md font-bold text-lg">
                DS
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-emerald-600 leading-none">
                  DatSan<span className="text-amber-500">Online</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">
                  Hệ Sinh Thái Thể Thao VN
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
          
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Tìm theo tên sân, địa chỉ..."
                className="w-full h-11 pl-11 pr-4 rounded-full bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                {userRole === 'CHUSAN' && (
                  <button onClick={() => navigate('/owner')} className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
                    <Shield className="w-4 h-4" /> Quản Lý Sân
                  </button>
                )}
                {userRole === 'ADMIN' && (
                  <button onClick={() => navigate('/admin')} className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
                    <LayoutDashboard className="w-4 h-4" /> Trang Admin
                  </button>
                )}
                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
                </button>
                
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden xl:block text-left text-xs leading-tight">
                      <div className="font-bold text-slate-800">{displayName}</div>
                      <div className="text-[10px] text-emerald-600 font-medium font-mono uppercase">{userRole}</div>
                    </div>
                  </button>
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <button 
                        onClick={() => { setShowDropdown(false); navigate('/profile'); }}
                        className="w-full px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2.5 transition text-left"
                      >
                        <User className="w-4 h-4 text-emerald-600" />
                        <span>Thông tin cá nhân</span>
                      </button>
                      {userRole === 'CHUSAN' && (
                        <button 
                          onClick={() => { setShowDropdown(false); navigate('/owner'); }}
                          className="w-full px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2.5 transition text-left"
                        >
                          <Building2 className="w-4 h-4 text-amber-500" />
                          <span>Bảng quản lý sân</span>
                        </button>
                      )}
                      {userRole === 'ADMIN' && (
                        <button 
                          onClick={() => { setShowDropdown(false); navigate('/admin'); }}
                          className="w-full px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2.5 transition text-left"
                        >
                          <LayoutDashboard className="w-4 h-4 text-purple-600" />
                          <span>Trang quản trị Admin</span>
                        </button>
                      )}
                      <div className="border-t border-slate-100 my-1"></div>
                      <button 
                        onClick={() => {
                          setShowDropdown(false);
                          sessionStorage.removeItem('datsan_user');
                          if (typeof setUser === 'function') setUser(null);
                          navigate('/login');
                        }} 
                        className="w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 font-bold flex items-center gap-2.5 transition text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/login')} 
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-sm transition"
              >
                <LogIn className="w-4 h-4" /> Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-[1440px] mx-auto px-6 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <button onClick={onBack || (() => navigate('/'))} className="hover:text-emerald-600 font-bold flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Trang Chủ
            </button> 
            <ChevronRight className="w-3 h-3" />
            <span>Đà Nẵng</span> <ChevronRight className="w-3 h-3" />
            <span>Quận {sanInfo?.ViTri.Quan}</span> <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 font-bold">{sanInfo?.TenSan}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">SÂN MỚI 2026</span>
          <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">TIÊU CHUẨN THI ĐẤU</span>
          <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase flex items-center gap-1">
            <Video className="w-3 h-3" /> CÓ CAMERA QUAY TRẬN ĐẤU
          </span>
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
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {sanInfo?.ViTri.DiaChi}, P. {sanInfo?.ViTri.Phuong}, Q. {sanInfo?.ViTri.Quan}, TP. Đà Nẵng
              </span>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 relative h-[380px] rounded-2xl overflow-hidden shadow-sm bg-slate-100">
                <img src={sanInfo?.Image} alt="Main" className="w-full h-full object-cover" />
              </div>
              <div className="grid grid-rows-3 gap-2 h-[380px]">
                <div className="rounded-xl overflow-hidden bg-slate-100 relative">
                  <img src="https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=400&q=80" alt="Sub 1" className="w-full h-full object-cover" />
                </div>
                <div className="rounded-xl overflow-hidden bg-slate-100 relative">
                  <img src="https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=400&q=80" alt="Sub 2" className="w-full h-full object-cover" />
                </div>
                <div className="rounded-xl overflow-hidden bg-slate-100 relative">
                  <img src="https://images.unsplash.com/photo-1626248801379-51a0748a5f96?auto=format&fit=crop&w=400&q=80" alt="Sub 3" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Bảng Khung Giờ Thi Đấu Trực Quan</h3>
                  <p className="text-xs text-slate-400">Có thể bấm chọn nhiều ca liên tiếp để đặt 2-3 tiếng.</p>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Realtime Supabase
                </span>
              </div>

              {/* CHỌN NGÀY ĐÁ */}
              <div className="mb-5">
                <div className="text-xs font-bold uppercase text-slate-400 mb-2">CHỌN NGÀY ĐÁ</div>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { day: 'HÔM NAY', date: '03/11', full: '2026-11-03', label: 'Thứ Ba' },
                    { day: 'NGÀY MAI', date: '04/11', full: '2026-11-04', label: 'Thứ Tư' },
                    { day: 'NGÀY KỊA', date: '05/11', full: '2026-11-05', label: 'Thứ Năm' },
                    { day: 'THỨ SÁU', date: '06/11', full: '2026-11-06', label: 'Thứ Sáu' },
                    { day: 'THỨ BẢY', date: '07/11', full: '2026-11-07', label: 'Thứ Bảy' },
                    { day: 'CHỦ NHẬT', date: '08/11', full: '2026-11-08', label: 'Chủ Nhật' }
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

              {/* PHÂN LOẠI SÂN TỪ CSDL */}
              <div className="mb-6 flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-400">Loại sân:</span>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                  {sanInfo?.LoaiSanText}
                </span>
              </div>

              {/* GRID KHUNG GIỜ */}
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

            {/* DỊCH VỤ CỘNG THÊM (CHUẨN ĐÚNG NGHIỆP VỤ BÁO GIÁ THEO MÔN) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-extrabold text-base text-slate-900 mb-1">Dịch Vụ Cộng Thêm Phục Vụ Trận Đấu (Tùy chọn)</h3>
              <p className="text-xs text-slate-400 mb-4">Các gói dịch vụ đi kèm chuẩn theo môn {sanInfo?.LoaiSanText}.</p>
              
              <div className="space-y-3">
                {/* 1. BÓNG ĐÁ */}
                {isFootball && (
                  <>
                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={services.water} 
                          onChange={(e) => setServices({ ...services, water: e.target.checked })} 
                          className="w-4 h-4 accent-emerald-600 rounded" 
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-800">Thùng nước uống 12 chai (ướp lạnh sẵn)</div>
                          <div className="text-[11px] text-slate-400">Nước ướp lạnh mang tận sân trước 15 phút giờ thi đấu</div>
                        </div>
                      </div>
                      <span className="font-black text-xs text-emerald-700">+150.000 đ</span>
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
                          <div className="font-bold text-xs text-slate-800">Thuê {bibCountText} thi đấu</div>
                          <div className="text-[11px] text-slate-400">Áo giặt sạch sẽ, cấp đủ số lượng cho 1 đội bóng</div>
                        </div>
                      </div>
                      <span className="font-black text-xs text-emerald-700">+50.000 đ</span>
                    </label>
                  </>
                )}

                {/* 2. CẦU LÔNG */}
                {isBadminton && (
                  <>
                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={services.water} 
                          onChange={(e) => setServices({ ...services, water: e.target.checked })} 
                          className="w-4 h-4 accent-emerald-600 rounded" 
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-800">Block nước uống 6 chai (ướp lạnh sẵn)</div>
                          <div className="text-[11px] text-slate-400">Phù hợp cho nhóm thi đấu cầu lông</div>
                        </div>
                      </div>
                      <span className="font-black text-xs text-emerald-700">+90.000 đ</span>
                    </label>

                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={services.racketBadminton} 
                          onChange={(e) => setServices({ ...services, racketBadminton: e.target.checked })} 
                          className="w-4 h-4 accent-emerald-600 rounded" 
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-800">Thuê 1 cặp vợt cầu lông cao cấp</div>
                          <div className="text-[11px] text-slate-400">Tính giá 80.000 đ / 1 cặp / 1 giờ</div>
                        </div>
                      </div>
                      <span className="font-black text-xs text-emerald-700">+{ (80000 * totalHours).toLocaleString('vi-VN') } đ</span>
                    </label>

                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={services.shuttlecock} 
                          onChange={(e) => setServices({ ...services, shuttlecock: e.target.checked })} 
                          className="w-4 h-4 accent-emerald-600 rounded" 
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-800">Hộp cầu thi đấu mới (12 quả bóc tem tại sân)</div>
                          <div className="text-[11px] text-slate-400">Cầu bền, đường bay chuẩn</div>
                        </div>
                      </div>
                      <span className="font-black text-xs text-emerald-700">+250.000 đ</span>
                    </label>
                  </>
                )}

                {/* 3. TENNIS */}
                {isTennis && (
                  <>
                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={services.water} 
                          onChange={(e) => setServices({ ...services, water: e.target.checked })} 
                          className="w-4 h-4 accent-emerald-600 rounded" 
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-800">Block nước uống 6 chai (ướp lạnh sẵn)</div>
                          <div className="text-[11px] text-slate-400">Nước ướp lạnh sẵn tại sân</div>
                        </div>
                      </div>
                      <span className="font-black text-xs text-emerald-700">+90.000 đ</span>
                    </label>

                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={services.racketTennis} 
                          onChange={(e) => setServices({ ...services, racketTennis: e.target.checked })} 
                          className="w-4 h-4 accent-emerald-600 rounded" 
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-800">Thuê 1 cây vợt Tennis chuyên nghiệp</div>
                          <div className="text-[11px] text-slate-400">Tính giá 100.000 đ / 1 cây / 1 giờ</div>
                        </div>
                      </div>
                      <span className="font-black text-xs text-emerald-700">+{ (100000 * totalHours).toLocaleString('vi-VN') } đ</span>
                    </label>

                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Bóng Tennis đã được miễn phí bao gồm sẵn khi thuê sân!</span>
                    </div>
                  </>
                )}

                {/* 4. PICKLEBALL */}
                {isPickleball && (
                  <>
                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={services.water} 
                          onChange={(e) => setServices({ ...services, water: e.target.checked })} 
                          className="w-4 h-4 accent-emerald-600 rounded" 
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-800">Thùng nước uống 12 chai (ướp lạnh sẵn)</div>
                          <div className="text-[11px] text-slate-400">Ướp lạnh sẵn mang tận sân cho nhóm thi đấu</div>
                        </div>
                      </div>
                      <span className="font-black text-xs text-emerald-700">+150.000 đ</span>
                    </label>

                    <div className="p-3 rounded-xl bg-slate-100 text-xs text-slate-500">
                      Sân Pickleball hiện không hỗ trợ dịch vụ cho thuê vợt và bóng. Quý khách vui lòng tự chuẩn bị dụng cụ.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* CỘT TÍNH TIỀN BÊN PHẢI */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
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
                        <span className="font-extrabold text-slate-900 text-right">{sanInfo?.LoaiSanText}<br /><span className="text-[10px] font-normal text-slate-400">{sanInfo?.TenSan}</span></span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ngày sử dụng:</span>
                        <span className="font-extrabold text-slate-900">{selectedDate}</span>
                      </div>
                      
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
                    
                    {/* BẢNG BÓC TÁCH CHI TIẾT TỔNG TIỀN */}
                    <div className="space-y-2 text-xs border-b border-slate-100 pb-4 mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tổng tiền thuê sân:</span>
                        <span className="font-extrabold">{totalPitchPrice.toLocaleString('vi-VN')} đ</span>
                      </div>
                      {services.water && (
                        <div className="flex justify-between text-slate-600">
                          <span>Nước uống ({(isFootball || isPickleball) ? 'Thùng 12 chai' : 'Block 6 chai'}):</span>
                          <span className="font-bold">+{waterPrice.toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                      {isFootball && services.bibs && (
                        <div className="flex justify-between text-slate-600">
                          <span>Thuê {bibCountText}:</span>
                          <span className="font-bold">+50.000 đ</span>
                        </div>
                      )}
                      {isBadminton && services.racketBadminton && (
                        <div className="flex justify-between text-slate-600">
                          <span>Thuê 1 cặp vợt ({totalHours}h):</span>
                          <span className="font-bold">+{(80000 * totalHours).toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                      {isBadminton && services.shuttlecock && (
                        <div className="flex justify-between text-slate-600">
                          <span>Hộp cầu thi đấu mới:</span>
                          <span className="font-bold">+250.000 đ</span>
                        </div>
                      )}
                      {isTennis && services.racketTennis && (
                        <div className="flex justify-between text-slate-600">
                          <span>Thuê 1 cây vợt Tennis ({totalHours}h):</span>
                          <span className="font-bold">+{(100000 * totalHours).toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
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
                      className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 transition flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? 'ĐANG LƯU CSDL...' : 'XÁC NHẬN ĐẶT SÂN & GIỮ CHỖ'} <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <AlertCircle className="w-5 h-5 text-slate-400 mx-auto" />
                    <h4 className="font-bold text-slate-800 text-sm">Chưa Chọn Khung Giờ</h4>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}