import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, ChevronLeft, ArrowRight, ShieldCheck, Sparkles, 
  Image as ImageIcon, Tag, CheckSquare, Upload, Loader2, X
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';

export default function RegisterField() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('datsan_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [loaiSanList, setLoaiSanList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingState, setUploadingState] = useState({ main: false, sub1: false, sub2: false, sub3: false });

  // Form State Cơ Bản
  const [tenSan, setTenSan] = useState('');
  const [maLoaiSan, setMaLoaiSan] = useState('');
  const [giaSan, setGiaSan] = useState('');
  const [moTa, setMoTa] = useState('');

  // Form State 4 Hình Ảnh (Chứa URL sau khi upload)
  const [hinhanhMain, setHinhanhMain] = useState('');
  const [hinhanhSub1, setHinhanhSub1] = useState('');
  const [hinhanhSub2, setHinhanhSub2] = useState('');
  const [hinhanhSub3, setHinhanhSub3] = useState('');

  // Form State Badges & Tiện Ích
  const [selectedBadges, setSelectedBadges] = useState(['Cỏ mới 2026', 'Chuẩn FIFA']);
  const [selectedAmenities, setSelectedAmenities] = useState(['Đèn LED 1000W', 'Bãi đỗ ô tô & Xe máy', 'Tắm nóng lạnh']);
  
  // Vị trí State
  const [diaChi, setDiaChi] = useState('');
  const [phuong, setPhuong] = useState('');
  const [quan, setQuan] = useState('Hải Châu');

  const AVAILABLE_BADGES = [
    'Cỏ mới 2026', 'Chuẩn FIFA', 'Có Camera quay trận đấu', 'Được đặt nhiều nhất tuần', 'Sân trong nhà', 'Có mái che'
  ];

  const AVAILABLE_AMENITIES = [
    'Đèn LED 1000W', 'Bãi đỗ ô tô & Xe máy', 'Tắm nóng lạnh', 'Căn tin & Nước uống', 'Cho thuê giày & Áo bít', 'Trọng tài chuyên nghiệp'
  ];

  useEffect(() => {
    const fetchLoaiSan = async () => {
      const { data } = await supabase.from('loaisan').select('*');
      if (data && data.length > 0) {
        setLoaiSanList(data);
        setMaLoaiSan(data[0].maloaisan || data[0].MaLoaiSan);
      }
    };
    fetchLoaiSan();
  }, []);

  // HÀM XỬ LÝ UPLOAD FILE LÊN SUPABASE STORAGE
  const handleFileUpload = async (event, keyName, setUrlState) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadingState(prev => ({ ...prev, [keyName]: true }));

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `fields/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('san-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('san-images')
        .getPublicUrl(filePath);

      setUrlState(publicUrlData.publicUrl);

    } catch (err) {
      console.error('Lỗi tải ảnh:', err);
      alert('Lỗi tải ảnh lên: ' + (err.message || 'Không thể upload'));
    } finally {
      setUploadingState(prev => ({ ...prev, [keyName]: false }));
    }
  };

  const toggleBadge = (badge) => {
    setSelectedBadges(prev => 
      prev.includes(badge) ? prev.filter(b => b !== badge) : [...prev, badge]
    );
  };

  const toggleAmenity = (amenity) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Vui lòng đăng nhập trước khi thực hiện đăng ký sân!");
      return;
    }

    const rawGiaSan = Number(giaSan);
    if (!rawGiaSan || rawGiaSan <= 0) {
      alert("Vui lòng nhập giá thuê hợp lệ!");
      return;
    }

    const userId = currentUser.MaNguoiDung || currentUser.manguoidung;

    try {
      setIsSubmitting(true);

      const { data: newViTri, error: vtErr } = await supabase
        .from('vitri')
        .insert([
          {
            diachi: diaChi,
            phuong: phuong || 'Trung tâm',
            quan: quan,
            thanhpho: 'Đà Nẵng'
          }
        ])
        .select()
        .single();

      if (vtErr) throw vtErr;
      const maViTri = newViTri.mavitri || newViTri.MaViTri;

      const mainImg = hinhanhMain || 'https://images.unsplash.com/photo-1529900248057-5e632c63c574?auto=format&fit=crop&w=800&q=80';
      const subImgs = [hinhanhSub1, hinhanhSub2, hinhanhSub3].filter(Boolean);

      // Thêm thông tin sân (tương thích cả khi DB chưa có các cột mở rộng)
      const insertPayload = {
        machusan: userId,
        maloaisan: Number(maLoaiSan),
        mavitri: maViTri,
        tensan: tenSan,
        mota: moTa || 'Sân bóng chất lượng cao, hệ thống đèn chiếu sáng hiện đại.',
        giasan: rawGiaSan,
        hinhanh: mainImg,
        trangthai: 'CHO_DUYET'
      };

      // Đẩy thêm các trường mở rộng nếu người dùng chọn
      if (subImgs.length > 0) insertPayload.hinhanh_phu = subImgs;
      if (selectedBadges.length > 0) insertPayload.huyhieu = selectedBadges;
      if (selectedAmenities.length > 0) insertPayload.tienich = selectedAmenities;

      const { data: newSan, error: sanErr } = await supabase
        .from('san')
        .insert([insertPayload])
        .select()
        .single();

      if (sanErr) throw sanErr;
      const maSanCreated = newSan.masan || newSan.MaSan;

      const defaultSlots = [
        { giobatdau: '16:00:00', gioketthuc: '17:30:00' },
        { giobatdau: '17:30:00', gioketthuc: '19:00:00' },
        { giobatdau: '19:00:00', gioketthuc: '20:30:00' },
        { giobatdau: '20:30:00', gioketthuc: '22:00:00' }
      ];

      const slotsToInsert = defaultSlots.map(s => ({
        masan: maSanCreated,
        giobatdau: s.giobatdau,
        gioketthuc: s.gioketthuc,
        trangthai: 'TRONG'
      }));

      await supabase.from('khunggio').insert(slotsToInsert);

      const { error: roleErr } = await supabase
        .from('nguoidung')
        .update({ vaitro: 'CHUSAN' })
        .eq('manguoidung', userId);

      if (roleErr) throw roleErr;

      const updatedUser = { ...currentUser, VaiTro: 'CHUSAN', vaitro: 'CHUSAN' };
      setCurrentUser(updatedUser);
      sessionStorage.setItem('datsan_user', JSON.stringify(updatedUser));

      alert('Đăng ký cụm sân toàn diện thành công!');
      navigate('/owner');

    } catch (err) {
      console.error('Lỗi khi đăng ký sân:', err);
      alert('Đăng ký thất bại: ' + (err.message || 'Lỗi hệ thống'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased pb-16">
      <Header user={currentUser} setUser={setCurrentUser} />

      <main className="max-w-[960px] mx-auto px-4 pt-6">
        <button 
          onClick={() => navigate('/')} 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700 transition mb-6 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại trang chủ
        </button>

        <div className="bg-[#064e3b] text-white rounded-3xl p-8 mb-8 shadow-xl relative overflow-hidden border border-emerald-900">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/40">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Nâng tầm kinh doanh thể thao cùng DatSanOnline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2.5 drop-shadow-sm">
              Đăng Ký Cụm Sân Thể Thao Mới
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm font-semibold max-w-xl leading-relaxed">
              Tải trực tiếp hình ảnh từ thiết bị của bạn để kết nối với hàng ngàn khách hàng tại TP. Đà Nẵng.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
          
          {/* MỤC 1: THÔNG TIN CƠ BẢN */}
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-emerald-600" /> 1. Thông Tin Cơ Bản Sân
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tên Cụm Sân Thi Đấu *</label>
                <input 
                  type="text" 
                  value={tenSan}
                  onChange={(e) => setTenSan(e.target.value)}
                  placeholder="Ví dụ: Cụm Sân Bóng Đá Arena Tuyên Sơn"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Bộ Môn Thể Thao *</label>
                <select 
                  value={maLoaiSan}
                  onChange={(e) => setMaLoaiSan(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
                  required
                >
                  {loaiSanList.map(ls => (
                    <option key={ls.maloaisan || ls.MaLoaiSan} value={ls.maloaisan || ls.MaLoaiSan}>
                      {ls.tenloaisan || ls.TenLoaiSan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Giá Thuê Mặc Định (VNĐ / 1h) *</label>
                <div className="relative flex items-center">
                  <input 
                    type="number" 
                    step="10000"
                    value={giaSan}
                    onChange={(e) => setGiaSan(e.target.value)}
                    placeholder=""
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-rose-600 focus:outline-none focus:border-emerald-500 transition"
                    required
                  />
                  <span className="absolute right-4 text-xs font-black text-rose-600">đ</span>
                </div>
                {giaSan !== '' && (
                  <p className="text-[11px] text-slate-500 font-semibold mt-1.5">
                    Định dạng hiển thị: <b className="text-emerald-700 font-extrabold">{Number(giaSan).toLocaleString('vi-VN')}đ / 1h</b>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* MỤC 2: HUY HIỆU & TIỆN ÍCH */}
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Tag className="w-4 h-4 text-emerald-600" /> 2. Huy Hiệu Nổi Bật & Tiện Ích Sân Bãi
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Chọn Huy Hiệu Nhãn Nổi Bật (Badges):</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_BADGES.map(badge => {
                    const isSelected = selectedBadges.includes(badge);
                    return (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => toggleBadge(badge)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          isSelected 
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                        <span>{badge}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Chọn Danh Sách Tiện Ích Sân Bãi (Amenities):</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_AMENITIES.map(amenity => {
                    const isSelected = selectedAmenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          isSelected 
                            ? 'bg-amber-500 text-white shadow-sm' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                        <span>{amenity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* MỤC 3: UPLOAD HÌNH ẢNH CÓ NÚT XÓA ẢNH ĐẨY NHẦM */}
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <ImageIcon className="w-4 h-4 text-emerald-600" /> 3. Tải Ảnh Trực Tiếp Từ Máy (1 Ảnh Chính + 3 Ảnh Phụ)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Ảnh chính */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tải Ảnh Banner Chính *</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-500 p-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 transition">
                    {uploadingState.main ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Upload className="w-4 h-4 text-emerald-600" />}
                    <span>{uploadingState.main ? 'Đang tải lên...' : 'Chọn file ảnh từ máy...'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileUpload(e, 'main', setHinhanhMain)} 
                      className="hidden" 
                    />
                  </label>
                  {hinhanhMain && (
                    <div className="relative group">
                      <img src={hinhanhMain} alt="Main Preview" className="w-14 h-14 object-cover rounded-xl border border-slate-200" />
                      <button 
                        type="button" 
                        onClick={() => setHinhanhMain('')}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 transition"
                        title="Xóa ảnh này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Ảnh phụ 1 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ảnh Chi Tiết 1</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer bg-slate-50 border border-dashed border-slate-300 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                    {uploadingState.sub1 ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <Upload className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{uploadingState.sub1 ? 'Đang tải...' : 'Tải ảnh 1'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileUpload(e, 'sub1', setHinhanhSub1)} 
                      className="hidden" 
                    />
                  </label>
                  {hinhanhSub1 && (
                    <div className="relative">
                      <img src={hinhanhSub1} alt="Sub1" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                      <button 
                        type="button" 
                        onClick={() => setHinhanhSub1('')}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Ảnh phụ 2 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ảnh Chi Tiết 2</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer bg-slate-50 border border-dashed border-slate-300 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                    {uploadingState.sub2 ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <Upload className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{uploadingState.sub2 ? 'Đang tải...' : 'Tải ảnh 2'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileUpload(e, 'sub2', setHinhanhSub2)} 
                      className="hidden" 
                    />
                  </label>
                  {hinhanhSub2 && (
                    <div className="relative">
                      <img src={hinhanhSub2} alt="Sub2" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                      <button 
                        type="button" 
                        onClick={() => setHinhanhSub2('')}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Ảnh phụ 3 */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ảnh Chi Tiết 3</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer bg-slate-50 border border-dashed border-slate-300 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                    {uploadingState.sub3 ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <Upload className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{uploadingState.sub3 ? 'Đang tải...' : 'Tải ảnh 3'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileUpload(e, 'sub3', setHinhanhSub3)} 
                      className="hidden" 
                    />
                  </label>
                  {hinhanhSub3 && (
                    <div className="relative">
                      <img src={hinhanhSub3} alt="Sub3" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                      <button 
                        type="button" 
                        onClick={() => setHinhanhSub3('')}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mô Tả & Chi Tiết Tiện Ích Khác</label>
                <textarea 
                  rows={3}
                  value={moTa}
                  onChange={(e) => setMoTa(e.target.value)}
                  placeholder="Mô tả về chất lượng cỏ, dịch vụ căn tin, quy định đặt cọc sân..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          {/* MỤC 4: VỊ TRÍ VẬN HÀNH */}
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-emerald-600" /> 4. Vị Trí Vận Hành
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Quận Huyện *</label>
                <select 
                  value={quan}
                  onChange={(e) => setQuan(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="Hải Châu">Hải Châu</option>
                  <option value="Cẩm Lệ">Cẩm Lệ</option>
                  <option value="Thanh Khê">Thanh Khê</option>
                  <option value="Sơn Trà">Sơn Trà</option>
                  <option value="Ngũ Hành Sơn">Ngũ Hành Sơn</option>
                  <option value="Liên Chiểu">Liên Chiểu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Phường / Xã</label>
                <input 
                  type="text" 
                  value={phuong}
                  onChange={(e) => setPhuong(e.target.value)}
                  placeholder="Ví dụ: Thạch Thang"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Địa Chỉ Chi Tiết *</label>
                <input 
                  type="text" 
                  value={diaChi}
                  onChange={(e) => setDiaChi(e.target.value)}
                  placeholder="Ví dụ: 20 Lê Duẩn"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Hình ảnh sẽ được tải trực tiếp lên hệ thống Supabase `san-images`.</span>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang gửi hồ sơ...' : 'Hoàn Tất Đăng Ký Sân'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}