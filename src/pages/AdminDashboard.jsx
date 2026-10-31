import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Users, Building2, CheckCircle2, XCircle, 
  RefreshCw, MapPin, Tag, UserCheck, Search, DollarSign, Eye, X, Award, CheckSquare
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('datsan_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('PENDING_FIELDS'); // PENDING_FIELDS | ALL_FIELDS | USERS
  const [userRoleFilter, setUserRoleFilter] = useState('ALL'); // ALL | KHACHHANG | CHUSAN
  const [loading, setLoading] = useState(true);

  // States Dữ Liệu
  const [sanList, setSanList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [totalSystemRevenue, setTotalSystemRevenue] = useState(0);

  // States Tìm Kiếm & Modal
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFieldDetail, setSelectedFieldDetail] = useState(null); // Modal Xem Chi Tiết Sân
  const [ownerFieldsModal, setOwnerFieldsModal] = useState({ show: false, ownerName: '', fields: [] }); // Modal Sân của Chủ Sân

  // Tải dữ liệu Admin từ Supabase
  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // 1. Tải danh sách tất cả các sân
      const { data: fieldsData, error: fieldsErr } = await supabase
        .from('san')
        .select(`
          masan, tensan, giasan, hinhanh, hinhanh_phu, trangthai, mota, huyhieu, tienich, machusan,
          vitri (diachi, quan, phuong, thanhpho),
          nguoidung:machusan (hoten, sodienthoai, email)
        `)
        .order('masan', { ascending: false });

      if (fieldsErr) throw fieldsErr;
      setSanList(fieldsData || []);

      // 2. Tải danh sách người dùng
      const { data: usersData, error: usersErr } = await supabase
        .from('nguoidung')
        .select('*')
        .order('manguoidung', { ascending: false });

      if (usersErr) throw usersErr;
      setUserList(usersData || []);

      // 3. Đếm tổng số đơn đặt sân & tính doanh thu sàn
      const { data: bookingData, count, error: bookingErr } = await supabase
        .from('datsan')
        .select('giatien', { count: 'exact' });

      if (!bookingErr && bookingData) {
        setBookingCount(count || 0);
        const revenue = bookingData.reduce((sum, item) => sum + Number(item.giatien || 0), 0);
        setTotalSystemRevenue(revenue);
      }

    } catch (err) {
      console.error('Lỗi tải dữ liệu Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Xử lý Duyệt / Khóa sân bãi
  const handleUpdateFieldStatus = async (maSan, newStatus) => {
    try {
      const { error } = await supabase
        .from('san')
        .update({ trangthai: newStatus })
        .eq('masan', maSan);

      if (error) throw error;

      alert(`Đã cập nhật trạng thái sân thành: ${newStatus}`);
      if (selectedFieldDetail?.masan === maSan) {
        setSelectedFieldDetail(prev => ({ ...prev, trangthai: newStatus }));
      }
      fetchAdminData();
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message);
    }
  };

  // Xử lý Đổi Vai Trò Người Dùng
  const handleUpdateUserRole = async (maNguoiDung, newRole) => {
    try {
      const { error } = await supabase
        .from('nguoidung')
        .update({ vaitro: newRole })
        .eq('manguoidung', maNguoiDung);

      if (error) throw error;

      alert(`Đã đổi vai trò tài khoản thành: ${newRole}`);
      fetchAdminData();
    } catch (err) {
      alert('Lỗi đổi vai trò: ' + err.message);
    }
  };

  // Mở modal xem danh sách sân của 1 chủ sân
  const handleViewOwnerFields = (ownerId, ownerName) => {
    const fields = sanList.filter(s => s.machusan === ownerId);
    setOwnerFieldsModal({
      show: true,
      ownerName: ownerName || 'Chủ Sân',
      fields: fields
    });
  };

  // Lọc sân chờ duyệt & đang hoạt động
  const pendingFields = sanList.filter(s => s.trangthai === 'CHO_DUYET');
  const activeFields = sanList.filter(s => s.trangthai === 'HOATDONG');

  // Lọc người dùng theo từ khóa tìm kiếm & Tab phân loại
  const filteredUsers = userList.filter(u => {
    const roleMatch = userRoleFilter === 'ALL' || u.vaitro === userRoleFilter;
    const nameMatch = (u.hoten || '').toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = (u.sodienthoai || '').includes(searchTerm);
    return roleMatch && (nameMatch || emailMatch || phoneMatch);
  });

  // Lọc tất cả sân theo từ khóa tìm kiếm
  const filteredFields = sanList.filter(s => 
    (s.tensan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.nguoidung?.hoten || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased pb-16">
      <Header user={currentUser} setUser={setCurrentUser} />

      <main className="max-w-[1440px] mx-auto px-6 pt-8">
        
        {/* HEADER ADMIN */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>HỆ THỐNG QUẢN TRỊ TỐI CAO (SUPER ADMIN)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Trung Tâm Kiểm Duyệt & Quản Lý System
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchAdminData}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Làm mới dữ liệu
            </button>
          </div>
        </div>

        {/* THỐNG KÊ KPI SYSTEM + DOANH THU SÀN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cụm Sân Chờ Duyệt</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                {pendingFields.length}
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600">{pendingFields.length} <span className="text-xs text-slate-400">hồ sơ</span></div>
            <p className="text-[11px] text-slate-500 mt-1">Yêu cầu từ chủ sân mới</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sân Đang Vận Hành</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                {activeFields.length}
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700">{activeFields.length} <span className="text-xs text-slate-400">cụm sân</span></div>
            <p className="text-[11px] text-slate-500 mt-1">Đã duyệt hoạt động</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Người Dùng</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                {userList.length}
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{userList.length} <span className="text-xs text-slate-400">tài khoản</span></div>
            <p className="text-[11px] text-slate-500 mt-1">Khách hàng, Chủ sân & Admin</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lượt Đặt Toàn Sàn</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                {bookingCount}
              </div>
            </div>
            <div className="text-2xl font-black text-purple-700">{bookingCount} <span className="text-xs text-slate-400">lượt</span></div>
            <p className="text-[11px] text-slate-500 mt-1">Giao dịch thành công</p>
          </div>

          {/* Ô THỐNG KÊ DOANH THU ADMIN/HOA HỒNG SÀN */}
          <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl p-5 shadow-md border border-emerald-900 col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Doanh Thu Thu Từ Chủ Sân</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-amber-400">
              {(totalSystemRevenue * 0.1).toLocaleString('vi-VN')} đ
            </div>
            <p className="text-[10px] text-emerald-200/80 mt-1">
              Phí hoa hồng dịch vụ 10% (Tổng GD: {totalSystemRevenue.toLocaleString('vi-VN')} đ)
            </p>
          </div>
        </div>

        {/* MAIN CONTAINER TABS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 pt-4 gap-4">
            
            {/* TABS CHÍNH */}
            <div className="flex items-center gap-6 overflow-x-auto">
              <button
                onClick={() => { setActiveTab('PENDING_FIELDS'); setSearchTerm(''); }}
                className={`pb-4 text-xs font-extrabold transition relative whitespace-nowrap ${
                  activeTab === 'PENDING_FIELDS' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hồ Sơ Sân Chờ Duyệt ({pendingFields.length})
              </button>

              <button
                onClick={() => { setActiveTab('ALL_FIELDS'); setSearchTerm(''); }}
                className={`pb-4 text-xs font-extrabold transition relative whitespace-nowrap ${
                  activeTab === 'ALL_FIELDS' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tất Cả Cụm Sân ({sanList.length})
              </button>

              <button
                onClick={() => { setActiveTab('USERS'); setSearchTerm(''); }}
                className={`pb-4 text-xs font-extrabold transition relative whitespace-nowrap ${
                  activeTab === 'USERS' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Quản Lý Người Dùng ({userList.length})
              </button>
            </div>

            {/* Ô TÌM KIẾM NẠP TẠI TRANG ADMIN */}
            {(activeTab === 'ALL_FIELDS' || activeTab === 'USERS') && (
              <div className="pb-3 sm:pb-4 w-full sm:w-72">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={activeTab === 'USERS' ? "Tìm theo tên, email, SĐT..." : "Tìm tên sân, chủ sân..."}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition shadow-sm"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            
            {/* TAB 1: SÂN CHỜ DUYỆT */}
            {activeTab === 'PENDING_FIELDS' && (
              <div>
                {loading ? (
                  <div className="py-12 text-center text-xs font-bold text-emerald-600">Đang tải dữ liệu hồ sơ...</div>
                ) : pendingFields.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-60" />
                    <p className="text-xs font-bold text-slate-600">Hiện tại không có hồ sơ sân nào cần duyệt!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingFields.map((san) => (
                      <div key={san.masan} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full">
                              CHỜ ADMIN DUYỆT
                            </span>
                            <span className="text-xs font-black text-rose-600">
                              {Number(san.giasan).toLocaleString('vi-VN')}đ / 1h
                            </span>
                          </div>

                          <div className="flex gap-4 mb-3">
                            <img 
                              src={san.hinhanh || 'https://images.unsplash.com/photo-1529900248057-5e632c63c574?auto=format&fit=crop&w=800&q=80'} 
                              alt={san.tensan}
                              className="w-24 h-24 object-cover rounded-xl border border-slate-200 shrink-0" 
                            />
                            <div>
                              <h4 className="font-extrabold text-base text-slate-900">{san.tensan}</h4>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <MapPin className="w-3.5 h-3.5" /> {san.vitri?.diachi}, Q. {san.vitri?.quan}
                              </p>
                              <p className="text-xs text-slate-600 mt-2 font-medium">
                                Chủ sân: <b className="text-slate-900">{san.nguoidung?.hoten || 'Chưa cập nhật'}</b> ({san.nguoidung?.sodienthoai})
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {Array.isArray(san.huyhieu) && san.huyhieu.map((h, i) => (
                              <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleUpdateFieldStatus(san.masan, 'TU_CHOI')}
                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition flex items-center gap-1"
                          >
                            <XCircle className="w-4 h-4" /> Từ Chối
                          </button>
                          <button
                            onClick={() => handleUpdateFieldStatus(san.masan, 'HOATDONG')}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Duyệt Sân Hoạt Động
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TẤT CẢ CỤM SÂN (CLICK SÂN HIỆN MODAL DẠNG BẢNG CHI TIẾT) */}
            {activeTab === 'ALL_FIELDS' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Tên Sân Bãi</th>
                      <th className="py-3 px-4">Địa Chỉ</th>
                      <th className="py-3 px-4">Chủ Sân</th>
                      <th className="py-3 px-4">Giá / 1h</th>
                      <th className="py-3 px-4">Trạng Thái</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFields.map((san) => (
                      <tr 
                        key={san.masan} 
                        className="hover:bg-slate-50/90 cursor-pointer transition"
                        onClick={() => setSelectedFieldDetail(san)} // CLICK VÀO HÀNG ĐỂ HIỆN MODAL BẢNG CHI TIẾT
                      >
                        <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
                          <img src={san.hinhanh} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                          <span className="hover:text-emerald-700 font-extrabold flex items-center gap-1.5">
                            {san.tensan} <Eye className="w-3.5 h-3.5 text-slate-400 inline" />
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-600">{san.vitri?.diachi}, Q. {san.vitri?.quan}</td>
                        <td className="py-4 px-4 font-semibold text-slate-800">{san.nguoidung?.hoten || 'Khách hàng'}</td>
                        <td className="py-4 px-4 font-black text-rose-600">{Number(san.giasan).toLocaleString('vi-VN')} đ</td>
                        <td className="py-4 px-4">
                          {san.trangthai === 'HOATDONG' && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">Đang hoạt động</span>}
                          {san.trangthai === 'CHO_DUYET' && <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">Chờ duyệt</span>}
                          {san.trangthai === 'TU_CHOI' && <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">Đã khóa / Từ chối</span>}
                        </td>
                        <td className="py-4 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                          {san.trangthai !== 'HOATDONG' ? (
                            <button
                              onClick={() => handleUpdateFieldStatus(san.masan, 'HOATDONG')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-sm"
                            >
                              Kích Hoạt
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateFieldStatus(san.masan, 'TU_CHOI')}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg shadow-sm"
                            >
                              Khóa Sân
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: QUẢN LÝ NGƯỜI DÙNG (PHÂN 2 BÊN KHÁCH HÀNG & CHỦ SÂN + THÊM CỘT SỐ SÂN) */}
            {activeTab === 'USERS' && (
              <div>
                {/* SUB FILTER PHÂN CHIA 2 BÊN KHÁCH HÀNG / CHỦ SÂN */}
                <div className="flex items-center gap-2 mb-4 bg-slate-100 p-1.5 rounded-xl w-fit">
                  <button
                    onClick={() => setUserRoleFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      userRoleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất Cả ({userList.length})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('KHACHHANG')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      userRoleFilter === 'KHACHHANG' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bên Khách Hàng ({userList.filter(u => u.vaitro === 'KHACHHANG').length})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('CHUSAN')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      userRoleFilter === 'CHUSAN' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bên Chủ Sân ({userList.filter(u => u.vaitro === 'CHUSAN').length})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Họ Và Tên</th>
                        <th className="py-3 px-4">Email / SĐT</th>
                        <th className="py-3 px-4">Vai Trò</th>
                        <th className="py-3 px-4 text-center">Số Sân Đang Đăng Ký</th>
                        <th className="py-3 px-4 text-right">Phân Quyền Vai Trò</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const ownerFields = sanList.filter(s => s.machusan === u.manguoidung);
                        const fieldCount = ownerFields.length;

                        return (
                          <tr key={u.manguoidung} className="hover:bg-slate-50/60">
                            <td className="py-4 px-4 font-bold text-slate-900">{u.hoten}</td>
                            <td className="py-4 px-4 text-slate-600">
                              {u.email} <br/>
                              <span className="text-[11px] text-emerald-700 font-mono font-bold">{u.sodienthoai}</span>
                            </td>
                            <td className="py-4 px-4">
                              {u.vaitro === 'ADMIN' && <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full">ADMIN</span>}
                              {u.vaitro === 'CHUSAN' && <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full">CHỦ SÂN</span>}
                              {u.vaitro === 'KHACHHANG' && <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full">KHÁCH HÀNG</span>}
                            </td>

                            {/* CỘT SỐ LƯỢNG SÂN ĐĂNG KÝ (NHẤP VÀO HIỆN SÂN) */}
                            <td className="py-4 px-4 text-center">
                              {u.vaitro === 'CHUSAN' ? (
                                <button
                                  onClick={() => handleViewOwnerFields(u.manguoidung, u.hoten)}
                                  className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black rounded-xl border border-amber-200 transition inline-flex items-center gap-1.5"
                                  title="Bấm để xem danh sách sân"
                                >
                                  <Building2 className="w-3.5 h-3.5" />
                                  <span>{fieldCount} sân</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 font-medium">0</span>
                              )}
                            </td>

                            <td className="py-4 px-4 text-right space-x-2">
                              <button
                                onClick={() => handleUpdateUserRole(u.manguoidung, 'KHACHHANG')}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg"
                              >
                                Khách Hàng
                              </button>
                              <button
                                onClick={() => handleUpdateUserRole(u.manguoidung, 'CHUSAN')}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg"
                              >
                                Chủ Sân
                              </button>
                              <button
                                onClick={() => handleUpdateUserRole(u.manguoidung, 'ADMIN')}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg"
                              >
                                Admin
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* ==================== MODAL 1: BẢNG CHI TIẾT SÂN (KHÔNG CHUYỂN TRANG) ==================== */}
      {selectedFieldDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            
            <button 
              onClick={() => setSelectedFieldDetail(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-full uppercase">
                Bảng Chi Tiết Cụm Sân
              </span>
              <span className={`px-3 py-1 text-[11px] font-black rounded-full ${
                selectedFieldDetail.trangthai === 'HOATDONG' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}>
                {selectedFieldDetail.trangthai === 'HOATDONG' ? 'Đang Hoạt Động' : 'Chờ / Khóa'}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">{selectedFieldDetail.tensan}</h3>
            
            <p className="text-xs text-slate-500 flex items-center gap-1 mb-6 font-medium">
              <MapPin className="w-4 h-4 text-emerald-600" /> 
              {selectedFieldDetail.vitri?.diachi}, P. {selectedFieldDetail.vitri?.phuong || 'Trung tâm'}, Q. {selectedFieldDetail.vitri?.quan}, TP. Đà Nẵng
            </p>

            {/* BỘ 4 HÌNH ẢNH SÂN BÃI DẠNG BẢNG */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <img 
                src={selectedFieldDetail.hinhanh} 
                alt="Main" 
                className="col-span-2 h-36 w-full object-cover rounded-2xl border border-slate-200 shadow-sm" 
              />
              {Array.isArray(selectedFieldDetail.hinhanh_phu) && selectedFieldDetail.hinhanh_phu.map((img, idx) => (
                <img 
                  key={idx} 
                  src={img} 
                  alt={`Sub ${idx}`} 
                  className="h-36 w-full object-cover rounded-2xl border border-slate-200 shadow-sm" 
                />
              ))}
            </div>

            {/* BẢNG THÔNG TIN CHI TIẾT */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6 text-xs">
              <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200 p-3">
                <span className="font-bold text-slate-500">Giá Thuê Mặc Định:</span>
                <span className="font-black text-rose-600 text-sm">{Number(selectedFieldDetail.giasan).toLocaleString('vi-VN')} đ / 1h</span>
              </div>
              <div className="grid grid-cols-2 p-3 border-b border-slate-100">
                <span className="font-bold text-slate-500">Chủ Sân Sở Hữu:</span>
                <span className="font-extrabold text-slate-800">{selectedFieldDetail.nguoidung?.hoten} ({selectedFieldDetail.nguoidung?.sodienthoai})</span>
              </div>
              <div className="grid grid-cols-2 bg-slate-50 p-3 border-b border-slate-100">
                <span className="font-bold text-slate-500">Huy Hiệu Nổi Bật:</span>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(selectedFieldDetail.huyhieu) && selectedFieldDetail.huyhieu.map((h, i) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 p-3 border-b border-slate-100">
                <span className="font-bold text-slate-500">Tiện Ích Tiêu Chuẩn:</span>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(selectedFieldDetail.tienich) && selectedFieldDetail.tienich.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-slate-50">
                <span className="font-bold text-slate-500 block mb-1">Mô Tả & Quy Định:</span>
                <p className="text-slate-700 leading-relaxed font-medium">{selectedFieldDetail.mota}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {selectedFieldDetail.trangthai !== 'HOATDONG' ? (
                <button
                  onClick={() => handleUpdateFieldStatus(selectedFieldDetail.masan, 'HOATDONG')}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                >
                  Duyệt Kích Hoạt Sân
                </button>
              ) : (
                <button
                  onClick={() => handleUpdateFieldStatus(selectedFieldDetail.masan, 'TU_CHOI')}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                >
                  Tạm Khóa Sân
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ==================== MODAL 2: XEM DANH SÁCH SÂN THUỘC SỞ HỮU CỦA CHỦ SÂN ==================== */}
      {ownerFieldsModal.show && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200">
            
            <button 
              onClick={() => setOwnerFieldsModal({ show: false, ownerName: '', fields: [] })}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              Danh Sách Sân Của: <span className="text-amber-600">{ownerFieldsModal.ownerName}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">Tổng số: {ownerFieldsModal.fields.length} cụm sân đang đăng ký trên hệ thống</p>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {ownerFieldsModal.fields.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">Chủ sân này chưa đăng ký cụm sân nào.</p>
              ) : (
                ownerFieldsModal.fields.map(field => (
                  <div key={field.masan} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={field.hinhanh} alt="" className="w-12 h-12 object-cover rounded-xl border border-slate-200" />
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900">{field.tensan}</h4>
                        <p className="text-[11px] text-slate-500">{field.vitri?.diachi}, Q. {field.vitri?.quan}</p>
                        <span className="text-[11px] font-black text-rose-600">{Number(field.giasan).toLocaleString('vi-VN')} đ / 1h</span>
                      </div>
                    </div>
                    <div>
                      {field.trangthai === 'HOATDONG' && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">Đang chạy</span>}
                      {field.trangthai === 'CHO_DUYET' && <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">Chờ duyệt</span>}
                      {field.trangthai === 'TU_CHOI' && <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">Đã khóa</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}