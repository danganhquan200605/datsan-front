import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import toàn bộ 9 trang giao diện chính
import Home from './pages/Home';
import FieldDetail from './pages/FieldDetail';
import Checkout from './pages/Checkout';
import Ticket from './pages/Ticket';
import Login from './pages/Login';
import Matchmaking from './pages/Matchmaking';
import UserProfile from './pages/UserProfile';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. Luồng Khách Hàng (Customer Flow) */}
        <Route path="/" element={<Home />} />
        <Route path="/field/:id" element={<FieldDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/ticket/:id" element={<Ticket />} />
        <Route path="/login" element={<Login />} />
        <Route path="/matchmaking" element={<Matchmaking />} />
        <Route path="/profile/*" element={<UserProfile />} />

        {/* 2. Luồng Của Chủ Sân (Field Owner Portal) */}
        <Route path="/owner/*" element={<OwnerDashboard />} />

        {/* 3. Luồng Quản Trị Hệ Thống (Super Admin Portal) */}
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;