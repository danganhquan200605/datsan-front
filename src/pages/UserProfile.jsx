import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, Mail, Shield, Calendar, Clock, MapPin, 
  Star, CheckCircle2, AlertCircle, XCircle, ChevronLeft, 
  Edit3, Save, MessageSquare, ExternalLink, Award, ArrowRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';

export default function UserProfile() {
  const navigate = useNavigate();

  // 1. Lấy thông tin user hiện tại từ LocalStorage / State
  const [user, setUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('datsan_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  // 2. Profile Form State
  const [hoTen, setHoTen] = useState(user?.HoTen || user?.hoten || '');
  const [email, setEmail] = useState(user?.Email || user?.email || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // 3. Booking History & Reviews State
  const [bookingList, setBookingList] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  // 4. Rating Modal State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedBookingForRating, setSelectedBookingForRating] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [evaluatedBookings, setEvaluatedBookings] = useState([]);

  // Tải danh sách đơn đặt sân từ Supabase
  const fetchUserBookings = async () => {
    if (!user?.MaNguoiDung && !user?.manguoidung) return;
    const userId = user.MaNguoiDung || user.manguoidung;

    try {
      setLoadingBookings(true);
      const { data: bookingsData, error } = await supabase
        .from('datsan')
        .select(`
          madatsan,
          ngaydat,
          ngaysudung,
          tongtien,
          trangthai,
          san (
            masan,
            tensan,
            giasan,
            hinhanh,
            vitri (diachi, quan)
          ),
          datsan_khunggio (
            makhunggio,
            khunggio (giobatdau, gioketthuc)
          )
        `)
        .eq('makhachhang', userId)
        .order('ngaydat', { ascending: false });

      if (error) throw error;

      if (bookingsData) {
        setBookingList(bookingsData);
      }

      const { data: reviewsData } = await supabase
        .from('danhgia')
        .select('madatsan')
        .eq('makhachhang', userId);

      if (reviewsData) {
        setEvaluatedBookings(reviewsData.map(r => r.madatsan));
      }

    } catch (err) {
      console.error('Lỗi lấy lịch sử đặt sân:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchUserBookings();
  }, []);

  // Xử lý Cập nhật thông tin cá nhân
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const userId = user.MaNguoiDung || user.manguoidung;
    if (!userId) return;

    try {
      setIsUpdatingUser(true);
      const { error } = await supabase
        .from('nguoidung')
        .update({
          hoten: hoTen,
          email: email
        })
        .eq('manguoidung', userId);

      if (error) throw error;

      const updatedUser = {
        ...user,
        HoTen: hoTen,
        hoten: hoTen,
        Email: email,
        email: email
      };
      setUser(updatedUser);
      sessionStorage.setItem('datsan_user', JSON.stringify(updatedUser));

      setIsEditingProfile(false);
      alert('Cập nhật thông tin cá nhân thành công!');
    } catch (err) {
      alert('Lỗi khi cập nhật thông tin: ' + err.message);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Xử lý Gửi Đánh Giá Sân
  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!selectedBookingForRating) return;
    const userId = user.MaNguoiDung || user.manguoidung;
    const maDatSan = selectedBookingForRating.madatsan;

    try {
      setIsSubmittingRating(true);
      const { error } = await supabase
        .from('danhgia')
        .insert([
          {
            madatsan: maDatSan,
            makhachhang: userId,
            sosao: ratingStars,
            noidung: ratingComment
          }
        ]);

      if (error) throw error;

      alert('Cảm ơn bạn đã gửi đánh giá!');
      setEvaluatedBookings((prev) => [...prev, maDatSan]);
      setShowRatingModal(false);
      setSelectedBookingForRating(null);
      setRatingComment('');
      setRatingStars(5);
    } catch (err) {
      alert('Lỗi khi gửi đánh giá: ' + (err.message || 'Mỗi đơn đặt sân chỉ được đánh giá 1 lần.'));
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const filteredBookings = bookingList.filter((b) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'CHOXACNHAN') return b.trangthai === 'CHOXACNHAN';
    if (activeTab === 'HOANTHANH') return b.trangthai === 'HOANTHANH' || b.trangthai === 'DACANCOC';
    if (activeTab === 'DAHUY') return b.trangthai === 'DAHUY';
    return true;
  });

  const getStatusBadge = (trangThai) => {
    switch (trangThai) {
      case 'HOANTHANH':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành</span>;
      case 'DACANCOC':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đã cọc</span>;
      case 'CHOXACNHAN':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Chờ xác nhận</span>;
      case 'DAHUY':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-full inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Đã hủy</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-full">{trangThai}</span>;
    }
  };

  const userRole = user?.VaiTro || user?.vaitro || 'KHACHHANG';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased pb-16">
      <Header user={user} setUser={setUser} />

      <main className="max-w-[1200px] mx-auto px-4 pt-6">
        {/* Nút quay lại trang chủ bằng useNavigate */}
        <button 
          onClick={() => navigate('/')} 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700 transition mb-6 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại trang chủ
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CỘT TRÁI: THÔNG TIN TÀI KHOẢN */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-600 absolute top-0 left-0 right-0"></div>
              
              <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-black text-2xl border-4 border-white shadow-md mb-3">
                  {(hoTen || 'U').charAt(0).toUpperCase()}
                </div>
                <h2 className="text-lg font-black text-slate-900">{hoTen || 'Khách hàng'}</h2>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold mt-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  {userRole === 'CHUSAN' ? 'Chủ Sân Thể Thao' : userRole === 'ADMIN' ? 'Quản Trị Viên' : 'Khách Hàng'}
                </div>
              </div>

              {/* Form Thông tin */}
              <form onSubmit={handleUpdateProfile} className="pt-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Thông Tin Cá Nhân</span>
                  {!isEditingProfile && (
                    <button 
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Họ và tên
                  </label>
                  {isEditingProfile ? (
                    <input 
                      type="text" 
                      value={hoTen}
                      onChange={(e) => setHoTen(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
                      required
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-transparent">
                      {hoTen || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Số điện thoại (Tài khoản OTP)
                  </label>
                  <div className="px-3.5 py-2.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed border border-slate-200 flex justify-between items-center">
                    <span>{user?.Sdt || user?.sodienthoai || user?.TenDangNhap}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">Đã xác thực</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Email liên hệ
                  </label>
                  {isEditingProfile ? (
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Nhập email..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-transparent">
                      {email || 'Chưa có email'}
                    </div>
                  )}
                </div>

                {isEditingProfile && (
                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsEditingProfile(false)}
                      className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Hủy
                    </button>
                    <button 
                      type="submit" 
                      disabled={isUpdatingUser}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" /> Lưu lại
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Khối Đăng ký làm Chủ Sân - ĐÃ SỬA MÀU SẮC SẮC NÉT VÀ CHUYỂN ROUTE CHUẨN XÁC */}
            {userRole === 'KHACHHANG' && (
              <div className="bg-[#064e3b] text-white rounded-2xl p-6 shadow-xl border border-emerald-900 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-emerald-500/30 rounded-xl flex items-center justify-center mb-3 text-amber-300 border border-emerald-400/40">
                    <Award className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-base text-white mb-1.5">Bạn có sân thể thao?</h3>
                  <p className="text-xs text-emerald-100/90 font-medium leading-relaxed mb-5">
                    Đăng ký làm Chủ Sân để quản lý lịch đặt, nhận cọc tự động và gia tăng doanh thu hàng tháng.
                  </p>
                  <button 
                    onClick={() => navigate('/register-field')}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                  >
                    <span>Đăng Ký Làm Chủ Sân ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: LỊCH SỬ ĐẶT SÂN & ĐÁNH GIÁ */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[500px]">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Lịch Sử Đặt Sân</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Theo dõi danh sách sân đã cọc và thực hiện đánh giá sau khi sử dụng</p>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-2 my-5 overflow-x-auto pb-1">
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'CHOXACNHAN', label: 'Chờ xác nhận' },
                  { key: 'HOANTHANH', label: 'Đã cọc / Hoàn thành' },
                  { key: 'DAHUY', label: 'Đã hủy' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      activeTab === tab.key 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Danh sách đơn đặt sân */}
              {loadingBookings ? (
                <div className="py-20 text-center text-xs font-bold text-emerald-600">
                  Đang tải lịch sử đặt sân...
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-bold">Chưa có đơn đặt sân nào thuộc mục này.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((item) => {
                    const sanInfo = item.san || {};
                    const viTriInfo = sanInfo.vitri || {};
                    const isEvaluated = evaluatedBookings.includes(item.madatsan);
                    const isCompleted = item.trangthai === 'HOANTHANH' || item.trangthai === 'DACANCOC';

                    return (
                      <div key={item.madatsan} className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                              <img 
                                src={sanInfo.hinhanh || 'https://images.unsplash.com/photo-1529900248057-5e632c63c574?auto=format&fit=crop&w=800&q=80'} 
                                alt={sanInfo.tensan}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-900">{sanInfo.tensan || 'Sân Thể Thao'}</h4>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" /> {viTriInfo.diachi || 'Đà Nẵng'}, Q. {viTriInfo.quan || 'Hải Châu'}
                              </p>
                            </div>
                          </div>
                          <div>{getStatusBadge(item.trangthai)}</div>
                        </div>

                        <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Ngày thi đấu</span>
                            <span className="font-extrabold text-slate-800">{item.ngaysudung}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng tiền</span>
                            <span className="font-black text-emerald-700">{Number(item.tongtien).toLocaleString('vi-VN')} đ</span>
                          </div>
                          <div className="col-span-2 sm:col-span-1 flex items-center justify-start sm:justify-end">
                            {isCompleted && (
                              isEvaluated ? (
                                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Đã đánh giá
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedBookingForRating(item);
                                    setShowRatingModal(true);
                                  }}
                                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1"
                                >
                                  <Star className="w-3.5 h-3.5" /> Viết Đánh Giá
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* MODAL ĐÁNH GIÁ SÂN */}
      {showRatingModal && selectedBookingForRating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowRatingModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Đánh Giá Chất Lượng Sân</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedBookingForRating.san?.tensan} • Ngày {selectedBookingForRating.ngaysudung}
              </p>
            </div>

            <form onSubmit={handleSubmitRating} className="space-y-4">
              <div className="flex justify-center items-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className="p-1 transition hover:scale-110"
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        star <= ratingStars 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'text-slate-200'
                      }`} 
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bình luận / Góp ý</label>
                <textarea 
                  rows={4}
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm thực tế về mặt sân, ánh sáng, dịch vụ..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 transition"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowRatingModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingRating}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition"
                >
                  {isSubmittingRating ? 'Đang gửi...' : 'Gửi Đánh Giá'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}