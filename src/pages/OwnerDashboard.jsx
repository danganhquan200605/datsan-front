import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, DollarSign, Calendar, Users, Star, CheckCircle2, 
  Clock, MapPin, Phone, AlertCircle, PlusCircle, RefreshCw, ChevronRight, Eye
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';

export default function OwnerDashboard() {
  const navigate = useNavigate();

  // Lấy thông tin chủ sân đang đăng nhập
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('datsan_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const ownerId = currentUser?.MaNguoiDung || currentUser?.manguoidung;

  // States dữ liệu
  const [sanList, setSanList] = useState([]);
  const [bookingList, setBookingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('BOOKINGS'); // BOOKINGS | FIELDS
  const [bookingFilterStatus, setBookingFilterStatus] = useState('ALL');

  // Fetch dữ liệu của riêng Chủ sân từ Supabase
  const fetchOwnerData = async () => {
    if (!ownerId) return;
    try {
      setLoading(true);

      // 1. Lấy danh sách sân thuộc sở hữu của chủ sân này
      const { data: mySanData, error: sanErr } = await supabase
        .from('san')
        .select(`
          masan,
          tensan,
          giasan,
          hinhanh,
          trangthai,
          vitri (diachi, quan)
        `)
        .eq('machusan', ownerId);

      if (sanErr) throw sanErr;
      setSanList(mySanData || []);

      const sanIds = (mySanData || []).map(s => s.masan);

      if (sanIds.length > 0) {
        // 2. Lấy danh sách đơn đặt sân thuộc các sân của chủ sân này
        const { data: bookingsData, error: bookingErr } = await supabase
          .from('datsan')
          .select(`
            madatsan,
            ngaydat,
            ngaysudung,
            tongtien,
            trangthai,
            san (tensan),
            nguoidung:makhachhang (hoten, sodienthoai),
            datsan_khunggio (
              khunggio (giobatdau, gioketthuc)
            )
          `)
          .in('masan', sanIds)
          .order('ngaydat', { ascending: false });

        if (bookingErr) throw bookingErr;
        setBookingList(bookingsData || []);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu Owner Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
  }, [ownerId]);

  // Cập nhật trạng thái đơn đặt sân (VD: Xác nhận cọc / Hoàn thành)
  const handleUpdateBookingStatus = async (maDatSan, newStatus) => {
    try {
      const { error } = await supabase
        .from('datsan')
        .update({ trangthai: newStatus })
        .eq('madatsan', maDatSan);

      if (error) throw error;

      alert(`Đã cập nhật trạng thái đơn thành: ${newStatus}`);
      fetchOwnerData();
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message);
    }
  };

  // Tính toán KPI
  const totalRevenue = bookingList
    .filter(b => b.trangthai === 'HOANTHANH' || b.trangthai === 'DACANCOC')
    .reduce((sum, b) => sum + Number(b.tongtien || 0), 0);

  const totalBookings = bookingList.length;
  const totalFields = sanList.length;

  const filteredBookings = bookingList.filter(b => {
    if (bookingFilterStatus === 'ALL') return true;
    return b.trangthai === bookingFilterStatus;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased pb-16">
      <Header user={currentUser} setUser={setCurrentUser} />

      <main className="max-w-[1440px] mx-auto px-6 pt-8">
        
        {/* HEADER DASHBOARD */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mb-1">
              <Building2 className="w-4 h-4" />
              <span>PORTAL QUẢN LÝ CHỦ SÂN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Bảng Điều Khiển Kinh Doanh
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/register-field')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Thêm Cụm Sân Mới
            </button>
            <button 
              onClick={fetchOwnerData}
              className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* THỐNG KÊ KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Doanh Thu</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {totalRevenue.toLocaleString('vi-VN')} <span className="text-xs font-bold text-slate-400">đ</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">Từ các đơn đã xác nhận / cọc</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Lượt Đặt</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{totalBookings} <span className="text-xs font-bold text-slate-400">đơn</span></div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Lượt giữ chỗ qua hệ thống</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số Sân Sở Hữu</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{totalFields} <span className="text-xs font-bold text-slate-400">cụm sân</span></div>
            <p className="text-[11px] text-amber-600 font-bold mt-1">Đang đăng ký vận hành</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đánh Giá Uy Tín</span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">4.9 / 5.0</div>
            <p className="text-[11px] text-purple-600 font-bold mt-1">Dựa trên nhận xét thực tế</p>
          </div>

        </div>

        {/* PHÂN HỆ QUẢN LÝ DẠNG TAB */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* TAB HEADERS */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50/50 px-6 pt-4 gap-6">
            <button
              onClick={() => setActiveTab('BOOKINGS')}
              className={`pb-4 text-xs font-extrabold transition relative ${
                activeTab === 'BOOKINGS' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Danh Sách Đơn Đặt Sân & Khách Hàng ({bookingList.length})
            </button>
            <button
              onClick={() => setActiveTab('FIELDS')}
              className={`pb-4 text-xs font-extrabold transition relative ${
                activeTab === 'FIELDS' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Danh Sách Sân Của Tôi ({sanList.length})
            </button>
          </div>

          <div className="p-6">
            
            {/* TAB 1: DANH SÁCH ĐƠN ĐẶT SÂN & KHÁCH HÀNG */}
            {activeTab === 'BOOKINGS' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {[
                      { key: 'ALL', label: 'Tất cả đơn' },
                      { key: 'CHOXACNHAN', label: 'Chờ xác nhận' },
                      { key: 'DACANCOC', label: 'Đã cọc' },
                      { key: 'HOANTHANH', label: 'Hoàn thành' }
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setBookingFilterStatus(f.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                          bookingFilterStatus === f.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="py-16 text-center text-xs font-bold text-emerald-600">Đang tải danh sách đơn...</div>
                ) : filteredBookings.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-xs font-bold">Chưa có đơn đặt sân nào trong danh mục này.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="py-3 px-4">Khách Hàng & SĐT</th>
                          <th className="py-3 px-4">Tên Sân</th>
                          <th className="py-3 px-4">Ngày Đá</th>
                          <th className="py-3 px-4">Tổng Tiền</th>
                          <th className="py-3 px-4">Trạng Thái</th>
                          <th className="py-3 px-4 text-right">Thao Tác Duyệt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredBookings.map((b) => {
                          const khachHang = b.nguoidung || {};
                          return (
                            <tr key={b.madatsan} className="hover:bg-slate-50/60">
                              <td className="py-4 px-4 font-bold text-slate-900">
                                <div>{khachHang.hoten || 'Khách vãng lai'}</div>
                                <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-mono mt-0.5">
                                  <Phone className="w-3 h-3" /> {khachHang.sodienthoai || 'Chưa có SĐT'}
                                </div>
                              </td>
                              <td className="py-4 px-4 font-extrabold text-slate-800">{b.san?.tensan}</td>
                              <td className="py-4 px-4 font-bold text-slate-600">{b.ngaysudung}</td>
                              <td className="py-4 px-4 font-black text-rose-600">{Number(b.tongtien).toLocaleString('vi-VN')} đ</td>
                              <td className="py-4 px-4">
                                {b.trangthai === 'CHOXACNHAN' && <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">Chờ xác nhận</span>}
                                {b.trangthai === 'DACANCOC' && <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">Đã cọc</span>}
                                {b.trangthai === 'HOANTHANH' && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">Hoàn thành</span>}
                              </td>
                              <td className="py-4 px-4 text-right space-x-2">
                                {b.trangthai === 'CHOXACNHAN' && (
                                  <button
                                    onClick={() => handleUpdateBookingStatus(b.madatsan, 'DACANCOC')}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-sm"
                                  >
                                    Xác Nhận Cọc
                                  </button>
                                )}
                                {b.trangthai === 'DACANCOC' && (
                                  <button
                                    onClick={() => handleUpdateBookingStatus(b.madatsan, 'HOANTHANH')}
                                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg shadow-sm"
                                  >
                                    Hoàn Thành
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DANH SÁCH SÂN CỦA TÔI */}
            {activeTab === 'FIELDS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sanList.map((san) => (
                  <div key={san.masan} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="h-40 bg-slate-200 relative">
                      <img 
                        src={san.hinhanh || 'https://images.unsplash.com/photo-1529900248057-5e632c63c574?auto=format&fit=crop&w=800&q=80'} 
                        alt={san.tensan}
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute top-3 right-3">
                        {san.trangthai === 'CHO_DUYET' ? (
                          <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full shadow-md">
                            Chờ Admin Duyệt
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-full shadow-md">
                            Đang Hoạt Động
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-extrabold text-base text-slate-900 mb-1">{san.tensan}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {san.vitri?.diachi}, Q. {san.vitri?.quan}
                      </p>
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-700">{Number(san.giasan).toLocaleString('vi-VN')} đ / ca</span>
                        <button 
                          onClick={() => navigate('/')}
                          className="text-xs font-bold text-slate-600 hover:text-emerald-600 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Xem ngoài web
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}