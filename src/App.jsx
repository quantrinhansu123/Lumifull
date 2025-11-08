import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Home from './components/Home';
import ReportForm from './components/ReportForm';
import ReportDashboard from './components/ReportDashboard';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import ProtectedRoute from './components/ProtectedRoute';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const username = localStorage.getItem('username') || 'User';

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userTeam');
    navigate('/login');
  };

  // Don't show navigation on login page
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <nav className="bg-primary shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <img 
              src="https://www.appsheet.com/template/gettablefileurl?appName=Appsheet-325045268&tableName=Kho%20%E1%BA%A3nh&fileName=Kho%20%E1%BA%A3nh_Images%2Ff930e667.%E1%BA%A2nh.025539.jpg"
              alt="Logo"
              className="h-10 w-10 rounded-full shadow-md"
            />
            <span className="text-white text-xl font-bold">Marketing Report</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              to="/home" 
              className="text-white hover:bg-green-700 px-3 py-2 rounded-md text-sm font-medium transition"
            >
              Trang chủ
            </Link>
            <Link 
              to="/dashboard" 
              className="text-white hover:bg-green-700 px-3 py-2 rounded-md text-sm font-medium transition"
            >
              Bảng báo cáo
            </Link>
            <Link 
              to="/report" 
              className="text-white hover:bg-green-700 px-3 py-2 rounded-md text-sm font-medium transition"
            >
              Gửi báo cáo
            </Link>
            
            {isAuthenticated && (
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-green-600">
                <Link
                  to="/profile"
                  className="text-white hover:bg-green-700 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  👤 {username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-white hover:bg-red-600 bg-red-500 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        {/* Routes */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><ReportDashboard /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportForm /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
