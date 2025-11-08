import { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, get, update, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

function ReportDashboard() {
  const [masterData, setMasterData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [firebaseReports, setFirebaseReports] = useState([]);
  const [filteredFirebaseReports, setFilteredFirebaseReports] = useState([]);
  const [f3Data, setF3Data] = useState([]);
  const [filteredF3Data, setFilteredF3Data] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('detailed');
  const [error, setError] = useState(null);
  const [userTeam, setUserTeam] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [userEmail, setUserEmail] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Show 50 items per page
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    products: [],
    shifts: [],
    markets: [],
    teams: [],
    searchText: '', // Added for firebase reports search
  });

  const [availableFilters, setAvailableFilters] = useState({
    products: [],
    shifts: ['Giữa ca', 'Hết ca'],
    markets: [],
    teams: [],
  });

  // API Configuration
  const API_URL = 'https://n-api-gamma.vercel.app/report/generate?tableName=Báo cáo MKT';

  useEffect(() => {
    // Load user team, role and email from localStorage
    const team = localStorage.getItem('userTeam') || '';
    const role = localStorage.getItem('userRole') || 'user';
    const email = localStorage.getItem('userEmail') || '';
    setUserTeam(team);
    setUserRole(role);
    setUserEmail(email);

    // Set default dates (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setFilters(prev => ({
      ...prev,
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
    }));

    // Fetch data from API
    fetchAndProcessData();
    fetchFirebaseReports();
    fetchF3Data();
    
    // Fetch users if admin or leader
    if (role === 'admin' || role === 'leader') {
      fetchUsers();
    }
  }, []);

  const fetchAndProcessData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Process data from API (matching the structure from viewNsMoiNhanh.html)
      const processedData = result.data
        .filter(r => r["Tên"] && String(r["Tên"]).trim() !== '')
        .map(r => {
          const dsChot = Number(r["Doanh số"]) || 0;
          const dsSauHoanHuy = Number(r["DS sau hoàn hủy"]) || 0;
          
          return {
            id: r["id_NS"] || '',
            name: (r["Tên"] || 'N/A').trim(),
            email: (r["Email"] || '').trim(),
            date: new Date(r["Ngày"]),
            shift: (r["ca"] || 'N/A').trim(),
            product: (r["Sản_phẩm"] || 'N/A').trim(),
            market: (r["Thị_trường"] || 'N/A').trim(),
            team: (r["Team"] || 'Khác').trim(),
            cpqc: Number(r["CPQC"]) || 0,
            mess_cmt: Number(r["Số_Mess_Cmt"]) || 0,
            orders: Number(r["Số đơn"]) || 0,
            revenue: dsChot,
            // Dữ liệu bổ sung
            soDonHuy: Number(r["Số đơn hoàn hủy"]) || 0,
            doanhSoHuy: dsChot - dsSauHoanHuy,
            dsSauHoanHuy: dsSauHoanHuy,
            dsSauShip: Number(r["Doanh số sau ship"]) || 0,
            dsThanhCong: Number(r["Doanh số TC"]) || 0,
            kpiValue: Number(r["KPIs"]) || 0,
            // Dữ liệu thực tế
            soDonThucTe: Number(r["Số đơn thực tế"]) || 0,
            dsChotThucTe: Number(r["Doanh thu chốt thực tế"]) || 0,
            dsHoanHuyThucTe: Number(r["Doanh số hoàn hủy thực tế"]) || 0,
            soDonHuyThucTe: Number(r["Số đơn hoàn hủy thực tế"]) || 0,
            dsSauHoanHuyThucTe: Number(r["Doanh số sau hoàn hủy thực tế"]) || 0,
            dsThanhCongThucTe: Number(r["Doanh số đi thực tế"]) || 0,
          };
        });

      setMasterData(processedData);
      
      // Extract unique values for filters
      const products = [...new Set(processedData.map(r => r.product).filter(Boolean))];
      const markets = [...new Set(processedData.map(r => r.market).filter(Boolean))];
      const teams = [...new Set(processedData.map(r => r.team).filter(Boolean))];
      
      setAvailableFilters(prev => ({
        ...prev,
        products: products.sort(),
        markets: markets.sort(),
        teams: teams.sort(),
      }));
      
      setFilteredData(processedData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Không thể tải dữ liệu từ API. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFirebaseReports = async () => {
    try {
      const reportsRef = ref(database, 'reports');
      const snapshot = await get(reportsRef);

      if (snapshot.exists()) {
        const reportsData = snapshot.val();
        const reportsArray = Object.entries(reportsData).map(([id, data]) => ({
          id,
          ...data,
          date: new Date(data.date),
          timestamp: data.timestamp || data.createdAt
        }));

        // Sort by date descending (newest first)
        reportsArray.sort((a, b) => b.date - a.date);

        setFirebaseReports(reportsArray);
        setFilteredFirebaseReports(reportsArray);
        console.log('Loaded Firebase reports:', reportsArray.length);
      } else {
        setFirebaseReports([]);
        setFilteredFirebaseReports([]);
        console.log('No reports in Firebase');
      }
    } catch (error) {
      console.error('Error loading Firebase reports:', error);
    }
  };

  const fetchF3Data = async () => {
    try {
      setLoading(true);
      
      const f3Ref = ref(database, 'f3_data');
      const snapshot = await get(f3Ref);

      if (snapshot.exists()) {
        const f3DataObj = snapshot.val();
        const totalKeys = Object.keys(f3DataObj).length;
        
        // Convert to array efficiently
        const f3Array = Object.entries(f3DataObj)
          .filter(([_, data]) => data) // Skip null/undefined
          .map(([id, data]) => ({
            id,
            ...data,
            'Ngày lên đơn': data['Ngày lên đơn'] ? new Date(data['Ngày lên đơn']) : null,
            'Thời gian lên đơn': data['Thời gian lên đơn'] ? new Date(data['Thời gian lên đơn']) : null,
          }));

        // Sort by timestamp or date
        f3Array.sort((a, b) => {
          const dateA = a['Thời gian lên đơn'] || a['Ngày lên đơn'] || new Date(0);
          const dateB = b['Thời gian lên đơn'] || b['Ngày lên đơn'] || new Date(0);
          return dateB - dateA;
        });

        setF3Data(f3Array);
        setFilteredF3Data(f3Array);
                
        if (f3Array.length < totalKeys) {
          console.warn(`⚠️ Skipped ${totalKeys - f3Array.length} invalid records`);
        }
      } else {
        setF3Data([]);
        setFilteredF3Data([]);
        toast.warning('Không có dữ liệu F3 trong Firebase', {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('❌ Error loading F3 data:', error);
      toast.error('Lỗi khi tải dữ liệu F3: ' + error.message, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersRef = ref(database, 'human_resources');
      const snapshot = await get(usersRef);

      
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        console.log('Raw Firebase data:', usersData);
        
        const usersArray = Object.entries(usersData).map(([firebaseKey, data]) => ({
          firebaseKey, // This is the actual Firebase key for updates/deletes
          ...data // This spreads all fields including 'id' field if it exists
        }));

        console.log('Processed users array:', usersArray);

        // Sort by name (Họ Và Tên)
        usersArray.sort((a, b) => (a['Họ Và Tên'] || '').localeCompare(b['Họ Và Tên'] || ''));

        // Filter by team for leader role
        let filteredArray = usersArray;
        if (userRole === 'leader' && userTeam) {
          filteredArray = usersArray.filter(user => user.Team === userTeam);
        }

        setUsers(usersArray);
        setFilteredUsers(filteredArray);
      } else {
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Lỗi khi tải danh sách nhân sự: ' + error.message, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      const userRef = ref(database, `human_resources/${userId}`);
      await update(userRef, updates);
      
      // Refresh users list
      await fetchUsers();
      setEditingUser(null);
      toast.success('Cập nhật nhân viên thành công!', {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Lỗi khi cập nhật: ' + error.message, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      return;
    }

    try {
      const userRef = ref(database, `human_resources/${userId}`);
      await remove(userRef);
      
      // Refresh users list
      await fetchUsers();
      toast.success('Xóa nhân viên thành công!', {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Lỗi khi xóa: ' + error.message, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  // Memoize filtered F3 data for better performance
  const filteredF3DataMemo = useMemo(() => {
    let filtered = [...f3Data];

    // Search by text (Name, Email, Team, Mã đơn hàng, etc.)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(item => 
        (item['Name*'] && item['Name*'].toLowerCase().includes(searchLower)) ||
        (item['Nhân viên Marketing'] && item['Nhân viên Marketing'].toLowerCase().includes(searchLower)) ||
        (item['Nhân viên Sale'] && item['Nhân viên Sale'].toLowerCase().includes(searchLower)) ||
        (item['Mã đơn hàng'] && item['Mã đơn hàng'].toLowerCase().includes(searchLower)) ||
        (item['Team'] && item['Team'].toLowerCase().includes(searchLower))
      );
    }

    // Date filter by Ngày lên đơn
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(item => {
        const itemDate = item['Ngày lên đơn'] || item['Thời gian lên đơn'];
        if (!itemDate) return true;
        return itemDate >= startDate;
      });
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => {
        const itemDate = item['Ngày lên đơn'] || item['Thời gian lên đơn'];
        if (!itemDate) return true;
        return itemDate <= endDate;
      });
    }

    // Shift filter by Ca
    if (filters.shifts.length > 0) {
      filtered = filtered.filter(item => filters.shifts.includes(item['Ca']));
    }

    // Team filter
    if (filters.teams.length > 0 && userRole === 'admin') {
      filtered = filtered.filter(item => item['Team'] && filters.teams.includes(item['Team']));
    }

    // Access control: Only leader and admin can view F3 data
    const allowedRoles = ['admin', 'leader'];
    if (!allowedRoles.includes(userRole)) {
      filtered = [];
    }

    return filtered;
  }, [filters, f3Data, userRole]);

  // Update filteredF3Data when memo changes
  useEffect(() => {
    setFilteredF3Data(filteredF3DataMemo);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [filteredF3DataMemo]);

  // Paginated F3 data for rendering
  const paginatedF3Data = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredF3DataMemo.slice(startIndex, endIndex);
  }, [filteredF3DataMemo, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredF3DataMemo.length / itemsPerPage);
  }, [filteredF3DataMemo.length, itemsPerPage]);

  // Clear filters when switching to F3 tab
  useEffect(() => {
    if (activeTab === 'f3') {
      setFilters({
        startDate: '',
        endDate: '',
        products: [],
        shifts: [],
        markets: [],
        teams: [],
        searchText: '',
      });
    }
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [filters, masterData, userTeam, userRole, userEmail]);

  useEffect(() => {
    applyFirebaseFilters();
  }, [filters, firebaseReports, userTeam, userRole, userEmail]);

  const applyFirebaseFilters = () => {
    let filtered = [...firebaseReports];

    // Search by text (name, email, TKQC)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(report => 
        (report.name && report.name.toLowerCase().includes(searchLower)) ||
        (report.email && report.email.toLowerCase().includes(searchLower)) ||
        (report.tkqc && report.tkqc.toLowerCase().includes(searchLower))
      );
    }

    // Date filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(report => {
        const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
        return reportDate >= startDate;
      });
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(report => {
        const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
        return reportDate <= endDate;
      });
    }

    // Product filter
    if (filters.products.length > 0) {
      filtered = filtered.filter(report => filters.products.includes(report.product));
    }

    // Market filter
    if (filters.markets.length > 0) {
      filtered = filtered.filter(report => filters.markets.includes(report.market));
    }

    // Shift filter
    if (filters.shifts.length > 0) {
      filtered = filtered.filter(report => filters.shifts.includes(report.shift));
    }

    // Access control:
    // - Admin: Xem tất cả
    // - Leader: Xem theo team
    // - User: Chỉ xem của bản thân
    if (userRole === 'admin') {
      // Admin sees all - no filter
    } else if (userRole === 'leader' && userTeam) {
      // Leader sees their team's reports
      filtered = filtered.filter(report => report.team === userTeam);
    } else if (userEmail) {
      // Regular user sees only their own reports
      filtered = filtered.filter(report => report.email === userEmail);
    }

    setFilteredFirebaseReports(filtered);
  };

  const applyFilters = () => {
    let filtered = [...masterData];

    // Access control:
    // - Admin: Xem tất cả
    // - Leader: Xem theo team
    // - User: Chỉ xem của bản thân
    if (userRole === 'admin') {
      // Admin sees all - no filter
    } else if (userRole === 'leader' && userTeam) {
      // Leader sees their team's reports
      filtered = filtered.filter(r => r.team === userTeam);
    } else if (userEmail) {
      // Regular user sees only their own reports
      filtered = filtered.filter(r => r.email === userEmail);
    }

    // Date filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(r => r.date >= startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => r.date <= endDate);
    }

    // Product filter
    if (filters.products.length > 0) {
      filtered = filtered.filter(r => filters.products.includes(r.product));
    }

    // Shift filter
    if (filters.shifts.length > 0) {
      filtered = filtered.filter(r => filters.shifts.includes(r.shift));
    }

    // Market filter
    if (filters.markets.length > 0) {
      filtered = filtered.filter(r => filters.markets.includes(r.market));
    }

    // Team filter (only applicable for admin)
    if (filters.teams.length > 0 && userRole === 'admin') {
      filtered = filtered.filter(r => r.team && filters.teams.includes(r.team));
    }

    setFilteredData(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      if (Array.isArray(prev[filterType])) {
        const newValues = prev[filterType].includes(value)
          ? prev[filterType].filter(v => v !== value)
          : [...prev[filterType], value];
        return { ...prev, [filterType]: newValues };
      }
      return { ...prev, [filterType]: value };
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('vi-VN').format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const generateSummaryData = () => {
    const summaryMap = {};
    
    filteredData.forEach(record => {
      const key = record.name;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          name: record.name,
          email: record.email,
          team: record.team,
          mess: 0,
          cpqc: 0,
          orders: 0,
          revenue: 0,
          ordersReal: 0,
          revenueReal: 0,
          // KPI fields
          soDonHuy: 0,
          soDonHuyThucTe: 0,
          doanhSoHuy: 0,
          dsHoanHuyThucTe: 0,
          dsSauHoanHuy: 0,
          dsSauShip: 0,
          dsThanhCong: 0,
          dsThanhCongThucTe: 0,
          kpiValue: 0,
        };
      }
      
      summaryMap[key].mess += record.mess_cmt || 0;
      summaryMap[key].cpqc += record.cpqc || 0;
      summaryMap[key].orders += record.orders || 0;
      summaryMap[key].revenue += record.revenue || 0;
      summaryMap[key].ordersReal += record.soDonThucTe || 0;
      summaryMap[key].revenueReal += record.dsChotThucTe || 0;
      
      // KPI aggregations
      summaryMap[key].soDonHuy += record.soDonHuy || 0;
      summaryMap[key].soDonHuyThucTe += record.soDonHuyThucTe || 0;
      summaryMap[key].doanhSoHuy += record.doanhSoHuy || 0;
      summaryMap[key].dsHoanHuyThucTe += record.dsHoanHuyThucTe || 0;
      summaryMap[key].dsSauHoanHuy += record.dsSauHoanHuy || 0;
      summaryMap[key].dsSauShip += record.dsSauShip || 0;
      summaryMap[key].dsThanhCong += record.dsThanhCong || 0;
      summaryMap[key].dsThanhCongThucTe += record.dsThanhCongThucTe || 0;
      summaryMap[key].kpiValue += record.kpiValue || 0;
    });

    return Object.values(summaryMap);
  };

  const generateMarketData = () => {
    // Group by product and market
    const marketMap = {};
    
    filteredData.forEach(record => {
      const key = `${record.product}|||${record.market}`;
      if (!marketMap[key]) {
        marketMap[key] = {
          product: record.product,
          market: record.market,
          cpqc: 0,
          orders: 0,
          revenue: 0,
          mess: 0,
        };
      }
      
      marketMap[key].cpqc += record.cpqc || 0;
      marketMap[key].orders += record.orders || 0;
      marketMap[key].revenue += record.revenue || 0;
      marketMap[key].mess += record.mess_cmt || 0;
    });

    return Object.values(marketMap);
  };

  const marketData = generateMarketData();
  
  // Phân loại theo nhóm thị trường
  const MARKET_GROUPS = {
    'Châu Á': ['Hàn Quốc', 'Nhật Bản', 'VN'],
    'Ngoài Châu Á': ['Úc', 'US', 'Canada']
  };

  const getMarketGroup = (market) => {
    for (const [group, markets] of Object.entries(MARKET_GROUPS)) {
      if (markets.some(m => market?.toLowerCase().includes(m.toLowerCase()))) {
        return group;
      }
    }
    return 'Khác';
  };

  const asiaMarketData = marketData.filter(d => getMarketGroup(d.market) === 'Châu Á');
  const nonAsiaMarketData = marketData.filter(d => getMarketGroup(d.market) === 'Ngoài Châu Á');

  // Prepare chart data
  const CHART_COLORS = [
    '#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', '#009688',
    '#FF9800', '#795548', '#607D8B', '#E91E63', '#3F51B5', '#8BC34A'
  ];

  const prepareChartData = () => {
    // Group by product
    const productMap = {};
    marketData.forEach(data => {
      if (!productMap[data.product]) {
        productMap[data.product] = {
          cpqc: 0,
          orders: 0,
          revenue: 0,
          mess: 0,
          dsSauHoanHuy: 0,
        };
      }
      productMap[data.product].cpqc += data.cpqc;
      productMap[data.product].orders += data.orders;
      productMap[data.product].revenue += data.revenue;
      productMap[data.product].mess += data.mess;
    });

    // Sort by revenue descending
    const sortedProducts = Object.entries(productMap)
      .sort((a, b) => b[1].revenue - a[1].revenue);

    const products = sortedProducts.map(([name]) => name);
    const cpqcData = sortedProducts.map(([, data]) => data.cpqc);
    const ordersData = sortedProducts.map(([, data]) => data.orders);
    const revenueData = sortedProducts.map(([, data]) => data.revenue);
    const messData = sortedProducts.map(([, data]) => data.mess);
    const cpsData = sortedProducts.map(([, data]) => data.orders > 0 ? data.cpqc / data.orders : 0);
    const closingRateData = sortedProducts.map(([, data]) => data.mess > 0 ? (data.orders / data.mess) * 100 : 0);

    return { products, cpqcData, ordersData, revenueData, messData, cpsData, closingRateData };
  };

  const chartData = marketData.length > 0 ? prepareChartData() : { 
    products: [], cpqcData: [], ordersData: [], revenueData: [], messData: [], cpsData: [], closingRateData: []
  };

  // Format số ngắn gọn (tỷ, triệu)
  const formatShort = (value) => {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + ' tỷ';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + ' tr';
    if (value >= 1000) return (value / 1000).toFixed(1) + ' k';
    return value.toFixed(0);
  };

  // Common horizontal bar chart options
  const horizontalBarOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        display: true,
        anchor: 'end',
        align: 'end',
        formatter: (value) => formatShort(value),
        color: '#333',
        font: {
          weight: 'bold',
          size: 11,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          display: false,
        },
        ticks: {
          display: false,
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: 'Roboto, Arial, sans-serif',
            size: 11,
          },
          padding: 10,
          boxWidth: 15,
        },
      },
      datalabels: {
        display: true,
        formatter: (value, ctx) => {
          const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
          const percentage = ((value / sum) * 100).toFixed(2) + '%';
          return percentage;
        },
        color: '#fff',
        font: {
          weight: 'bold',
          size: 12,
        },
      },
    },
  };

  const summaryData = generateSummaryData();

  const totals = summaryData.reduce((acc, curr) => ({
    mess: acc.mess + curr.mess,
    cpqc: acc.cpqc + curr.cpqc,
    orders: acc.orders + curr.orders,
    revenue: acc.revenue + curr.revenue,
    ordersReal: acc.ordersReal + curr.ordersReal,
    revenueReal: acc.revenueReal + curr.revenueReal,
    // KPI totals
    soDonHuy: acc.soDonHuy + curr.soDonHuy,
    soDonHuyThucTe: acc.soDonHuyThucTe + curr.soDonHuyThucTe,
    doanhSoHuy: acc.doanhSoHuy + curr.doanhSoHuy,
    dsHoanHuyThucTe: acc.dsHoanHuyThucTe + curr.dsHoanHuyThucTe,
    dsSauHoanHuy: acc.dsSauHoanHuy + curr.dsSauHoanHuy,
    dsSauShip: acc.dsSauShip + curr.dsSauShip,
    dsThanhCong: acc.dsThanhCong + curr.dsThanhCong,
    dsThanhCongThucTe: acc.dsThanhCongThucTe + curr.dsThanhCongThucTe,
    kpiValue: acc.kpiValue + curr.kpiValue,
  }), { 
    mess: 0, cpqc: 0, orders: 0, revenue: 0, ordersReal: 0, revenueReal: 0,
    soDonHuy: 0, soDonHuyThucTe: 0, doanhSoHuy: 0, dsHoanHuyThucTe: 0,
    dsSauHoanHuy: 0, dsSauShip: 0, dsThanhCong: 0, dsThanhCongThucTe: 0, kpiValue: 0
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu từ API...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lỗi tải dữ liệu</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAndProcessData}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center">
          <img 
            src="https://www.appsheet.com/template/gettablefileurl?appName=Appsheet-325045268&tableName=Kho%20%E1%BA%A3nh&fileName=Kho%20%E1%BA%A3nh_Images%2Ff930e667.%E1%BA%A2nh.025539.jpg"
            alt="Logo"
            className="h-16 w-16 rounded-full shadow-lg mr-4"
          />
          <div>
            <h1 className="text-3xl font-bold text-primary">DỮ LIỆU CHI PHÍ ADS</h1>
            <p className="text-gray-600">Báo cáo chi phí tổng hợp</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('detailed')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                activeTab === 'detailed'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Báo cáo chi tiết
            </button>
            <button
              onClick={() => setActiveTab('kpi')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                activeTab === 'kpi'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Báo cáo KPI
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                activeTab === 'market'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Hiệu quả MKT
            </button>
            <button
              onClick={() => setActiveTab('firebase')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                activeTab === 'firebase'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Báo cáo Marketing
            </button>
            {(userRole === 'admin' || userRole === 'leader') && (
              <button
                onClick={() => setActiveTab('f3')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                  activeTab === 'f3'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Báo cáo F3
              </button>
            )}
            {(userRole === 'admin' || userRole === 'leader') && (
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition ${
                  activeTab === 'users'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Quản lý Nhân sự
              </button>
            )}
          </nav>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h3 className="text-lg font-bold text-primary mb-4">Bộ lọc</h3>
            
            {/* Search Text - Only for Firebase tab */}
            {activeTab === 'firebase' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm (Tên/Email/TKQC):
                </label>
                <input
                  type="text"
                  value={filters.searchText}
                  onChange={(e) => handleFilterChange('searchText', e.target.value)}
                  placeholder="Nhập từ khóa..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}

            {/* Date Filters */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Từ ngày:
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đến ngày:
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Product Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-2">Sản phẩm</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableFilters.products.map(product => (
                  <label key={product} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.products.includes(product)}
                      onChange={() => handleFilterChange('products', product)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700">{product}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Shift Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-2">Ca</h4>
              <div className="space-y-2">
                {availableFilters.shifts.map(shift => (
                  <label key={shift} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.shifts.includes(shift)}
                      onChange={() => handleFilterChange('shifts', shift)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700">{shift}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Market Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-2">Thị trường</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableFilters.markets.map(market => (
                  <label key={market} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.markets.includes(market)}
                      onChange={() => handleFilterChange('markets', market)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700">{market}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Team Filter - Admin only */}
            {userRole === 'admin' && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Team</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableFilters.teams.map(team => (
                    <label key={team} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.teams.includes(team)}
                        onChange={() => handleFilterChange('teams', team)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">{team}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === 'detailed' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">STT</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Team</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Marketing</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Số Mess</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">CPQC</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Số Đơn</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-blue-100 uppercase tracking-wider border border-gray-400">Số Đơn (TT)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Doanh số</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-blue-100 uppercase tracking-wider border border-gray-400">DS (TT)</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Tỉ lệ chốt</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-blue-100 uppercase tracking-wider border border-gray-400">TL chốt (TT)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">CPS</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-400">%CP/DS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Total Row */}
                    <tr className="bg-primary text-white font-bold">
                      <td className="px-6 py-4 whitespace-nowrap border border-gray-400" colSpan="3">TỔNG CỘNG</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatNumber(totals.mess)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatCurrency(totals.cpqc)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatNumber(totals.orders)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatNumber(totals.ordersReal)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatCurrency(totals.revenue)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatCurrency(totals.revenueReal)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-400">
                        {formatPercent(totals.mess ? totals.orders / totals.mess : 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-400">
                        {formatPercent(totals.mess ? totals.ordersReal / totals.mess : 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">
                        {formatCurrency(totals.orders ? totals.cpqc / totals.orders : 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-400">
                        {formatPercent(totals.revenue ? totals.cpqc / totals.revenue : 0)}
                      </td>
                    </tr>

                    {/* Data Rows */}
                    {summaryData.map((row, index) => {
                      const closingRate = row.mess ? row.orders / row.mess : 0;
                      const closingRateReal = row.mess ? row.ordersReal / row.mess : 0;
                      const cps = row.orders ? row.cpqc / row.orders : 0;
                      const cpds = row.revenue ? row.cpqc / row.revenue : 0;
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{row.team}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{row.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatNumber(row.mess)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(row.cpqc)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatNumber(row.orders)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right border border-gray-300">{formatNumber(row.ordersReal)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(row.revenue)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right border border-gray-300">{formatCurrency(row.revenueReal)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-center border border-gray-300 ${
                            closingRate > 0.1 ? 'bg-green-100 text-green-800' : closingRate > 0.05 ? 'bg-yellow-100 text-yellow-800' : ''
                          }`}>
                            {formatPercent(closingRate)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-center border border-gray-300 ${
                            closingRateReal > 0.1 ? 'bg-green-100 text-green-800' : closingRateReal > 0.05 ? 'bg-yellow-100 text-yellow-800' : ''
                          }`}>
                            {formatPercent(closingRateReal)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(cps)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-center border border-gray-300 ${
                            cpds > 0.33 ? 'bg-yellow-100 text-yellow-800' : ''
                          }`}>
                            {formatPercent(cpds)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {summaryData.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Không có dữ liệu phù hợp với bộ lọc</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'kpi' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">STT</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Team</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Marketing</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">CPQC</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">DS chốt</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-blue-100 uppercase tracking-wider border border-gray-400">DS chốt (TT)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Số đơn hủy</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-blue-100 uppercase tracking-wider border border-gray-400">Số đơn hủy (TT)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">DS hủy</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-blue-100 uppercase tracking-wider border border-gray-400">DS hủy (TT)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">DS sau ship</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-blue-100 uppercase tracking-wider border border-gray-400">DS TC (TT)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">DS TC</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-400">%CP/DS</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-400">% KPI</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Total Row */}
                    <tr className="bg-primary text-white font-bold">
                      <td className="px-6 py-4 whitespace-nowrap border border-gray-400" colSpan="3">TỔNG CỘNG</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatCurrency(totals.cpqc)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatCurrency(totals.revenue)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatCurrency(totals.revenueReal)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatNumber(totals.soDonHuy)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatNumber(totals.soDonHuyThucTe)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatCurrency(totals.doanhSoHuy)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatCurrency(totals.dsHoanHuyThucTe)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatCurrency(totals.dsSauShip)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatCurrency(totals.dsThanhCongThucTe)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right border border-gray-400">{formatCurrency(totals.dsThanhCong)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-400">
                        {formatPercent(totals.dsSauShip ? totals.cpqc / totals.dsSauShip : 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center border border-gray-400">
                        {formatPercent(totals.kpiValue ? totals.dsSauShip / totals.kpiValue : 0)}
                      </td>
                    </tr>

                    {/* Data Rows */}
                    {summaryData.map((row, index) => {
                      const cpds = row.dsSauShip ? row.cpqc / row.dsSauShip : 0;
                      const kpiPercent = row.kpiValue ? row.dsSauShip / row.kpiValue : 0;
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{row.team}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{row.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(row.cpqc)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(row.revenue)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right border border-gray-300">{formatCurrency(row.revenueReal)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatNumber(row.soDonHuy)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right border border-gray-300">{formatNumber(row.soDonHuyThucTe)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(row.doanhSoHuy)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right border border-gray-300">{formatCurrency(row.dsHoanHuyThucTe)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(row.dsSauShip)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right border border-gray-300">{formatCurrency(row.dsThanhCongThucTe)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(row.dsThanhCong)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-center border border-gray-300 ${
                            cpds > 0.33 ? 'bg-yellow-100 text-yellow-800' : ''
                          }`}>
                            {formatPercent(cpds)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-center border border-gray-300 ${
                            kpiPercent >= 1 ? 'bg-green-100 text-green-800' : kpiPercent >= 0.8 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {formatPercent(kpiPercent)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {summaryData.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Không có dữ liệu phù hợp với bộ lọc</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'market' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <h2 className="text-2xl font-bold text-gray-800">THỐNG KÊ HIỆU QUẢ MARKETING THEO SẢN PHẨM & THỊ TRƯỜNG</h2>
                <p className="text-gray-600 mt-2">
                  {filters.startDate && filters.endDate && 
                    `Từ ${formatDate(filters.startDate)} đến ${formatDate(filters.endDate)}`
                  }
                </p>
              </div>

              {/* Thị trường ngoài Châu Á */}
              {nonAsiaMarketData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-primary px-6 py-4">
                    <h3 className="text-xl font-bold text-white">
                      THỊ TRƯỜNG NGOÀI CHÂU Á
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Sản phẩm</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Thị trường</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">CPQC</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Số đơn</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Doanh số</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Tỉ lệ chốt</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">CPS</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {nonAsiaMarketData.map((data, index) => {
                          const closingRate = data.mess ? data.orders / data.mess : 0;
                          const cps = data.orders ? data.cpqc / data.orders : 0;
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{data.product}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{data.market}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(data.cpqc)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatNumber(data.orders)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(data.revenue)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-center border border-gray-300 ${
                                closingRate > 0.1 ? 'bg-green-100 text-green-800' : closingRate > 0.05 ? 'bg-yellow-100 text-yellow-800' : ''
                              }`}>
                                {formatPercent(closingRate)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right border border-gray-300 ${
                                cps > 100000 ? 'bg-yellow-100 text-yellow-800' : cps > 50000 ? 'bg-green-100 text-green-800' : ''
                              }`}>
                                {formatCurrency(cps)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Thị trường Châu Á */}
              {asiaMarketData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-primary px-6 py-4">
                    <h3 className="text-xl font-bold text-white">
                      THỊ TRƯỜNG CHÂU Á
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Sản phẩm</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Thị trường</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">CPQC</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Số đơn</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Doanh số</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Tỉ lệ chốt</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">CPS</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {asiaMarketData.map((data, index) => {
                          const closingRate = data.mess ? data.orders / data.mess : 0;
                          const cps = data.orders ? data.cpqc / data.orders : 0;
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{data.product}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{data.market}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(data.cpqc)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatNumber(data.orders)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(data.revenue)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-center border border-gray-300 ${
                                closingRate > 0.1 ? 'bg-green-100 text-green-800' : closingRate > 0.05 ? 'bg-yellow-100 text-yellow-800' : ''
                              }`}>
                                {formatPercent(closingRate)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right border border-gray-300 ${
                                cps > 100000 ? 'bg-yellow-100 text-yellow-800' : cps > 50000 ? 'bg-green-100 text-green-800' : ''
                              }`}>
                                {formatCurrency(cps)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tổng hợp tất cả thị trường */}
              {marketData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-primary px-6 py-4">
                    <h3 className="text-xl font-bold text-white">
                      TỔNG HỢP TẤT CẢ THỊ TRƯỜNG
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Sản phẩm</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Thị trường</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">CPQC</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Số đơn</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Doanh số</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-400">Tỉ lệ chốt</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-400">CPS</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {marketData.map((data, index) => {
                          const closingRate = data.mess ? data.orders / data.mess : 0;
                          const cps = data.orders ? data.cpqc / data.orders : 0;
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{data.product}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{data.market}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(data.cpqc)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatNumber(data.orders)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border border-gray-300">{formatCurrency(data.revenue)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-center border border-gray-300 ${
                                closingRate > 0.1 ? 'bg-green-100 text-green-800' : closingRate > 0.05 ? 'bg-yellow-100 text-yellow-800' : ''
                              }`}>
                                {formatPercent(closingRate)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right border border-gray-300 ${
                                cps > 100000 ? 'bg-yellow-100 text-yellow-800' : cps > 50000 ? 'bg-green-100 text-green-800' : ''
                              }`}>
                                {formatCurrency(cps)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {marketData.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <p className="text-gray-500 text-lg">Không có dữ liệu phù hợp với bộ lọc</p>
                </div>
              )}

              {/* Biểu đồ trực quan */}
              {marketData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-primary px-6 py-4">
                    <h3 className="text-xl font-bold text-white">
                      BIỂU ĐỒ TRỰC QUAN
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Doanh số sau HH (TT) theo SP */}
                      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                        <h4 className="text-center font-semibold text-gray-700 mb-4 text-sm">Doanh số sau HH (TT) theo SP</h4>
                        <div style={{ height: '300px' }}>
                          <Bar 
                          data={{
                            labels: chartData.products,
                            datasets: [{
                              data: chartData.revenueData,
                              backgroundColor: chartData.products.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                              borderRadius: 4,
                            }]
                          }}
                          options={horizontalBarOptions}
                        />
                      </div>
                    </div>

                      {/* Doanh số Chốt (TT) theo SP */}
                      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                        <h4 className="text-center font-semibold text-gray-700 mb-4 text-sm">Doanh số Chốt (TT) theo SP</h4>
                        <div style={{ height: '300px' }}>
                          <Bar 
                          data={{
                            labels: chartData.products,
                            datasets: [{
                              data: chartData.revenueData,
                              backgroundColor: chartData.products.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                              borderRadius: 4,
                            }]
                          }}
                          options={horizontalBarOptions}
                        />
                      </div>
                    </div>

                      {/* Chi phí Quảng cáo theo SP */}
                      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                        <h4 className="text-center font-semibold text-gray-700 mb-4 text-sm">Chi phí Quảng cáo theo SP</h4>
                        <div style={{ height: '300px' }}>
                          <Bar 
                          data={{
                            labels: chartData.products,
                            datasets: [{
                              data: chartData.cpqcData,
                              backgroundColor: chartData.products.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                              borderRadius: 4,
                            }]
                          }}
                          options={horizontalBarOptions}
                        />
                      </div>
                    </div>

                      {/* Chi phí trên đơn (CPS) theo SP */}
                      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                        <h4 className="text-center font-semibold text-gray-700 mb-4 text-sm">Chi phí trên đơn (CPS) theo SP</h4>
                        <div style={{ height: '300px' }}>
                          <Bar 
                          data={{
                            labels: chartData.products,
                            datasets: [{
                              data: chartData.cpsData,
                              backgroundColor: chartData.products.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                              borderRadius: 4,
                            }]
                          }}
                          options={horizontalBarOptions}
                        />
                      </div>
                    </div>

                      {/* Tỉ lệ chốt (%) theo SP - Pie Chart */}
                      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                        <h4 className="text-center font-semibold text-gray-700 mb-4 text-sm">Tỉ lệ chốt (%) theo SP</h4>
                        <div style={{ height: '300px' }}>
                          <Pie 
                          data={{
                            labels: chartData.products,
                            datasets: [{
                              data: chartData.closingRateData,
                              backgroundColor: chartData.products.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                              borderWidth: 2,
                              borderColor: '#fff',
                            }]
                          }}
                          options={pieOptions}
                        />
                      </div>
                    </div>

                      {/* Số đơn theo SP */}
                      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                        <h4 className="text-center font-semibold text-gray-700 mb-4 text-sm">Số đơn theo SP</h4>
                        <div style={{ height: '300px' }}>
                          <Bar 
                          data={{
                            labels: chartData.products,
                            datasets: [{
                              data: chartData.ordersData,
                              backgroundColor: chartData.products.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                              borderRadius: 4,
                            }]
                          }}
                          options={horizontalBarOptions}
                        />
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              )}

              {marketData.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <p className="text-gray-500 text-lg">Không có dữ liệu phù hợp với bộ lọc</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Firebase Reports */}
          {activeTab === 'firebase' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-primary">Báo cáo Marketing</h2>
                <button
                  onClick={fetchFirebaseReports}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition"
                >
                  ↻ Refresh
                </button>
              </div>

              {firebaseReports.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Chưa có báo cáo</p>
                  <p className="text-gray-400 text-sm mt-2">Hãy gửi báo cáo mới từ form "Gửi báo cáo"</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="mb-4 text-sm text-gray-600">
                    Hiển thị: <span className="font-semibold text-primary">{filteredFirebaseReports.length}</span> / {firebaseReports.length} báo cáo
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-primary">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">STT</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Tên</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Ngày</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Ca</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Sản phẩm</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Thị trường</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">TKQC</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-300">CPQC</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Mess/Cmt</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Số đơn</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Doanh số</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredFirebaseReports.map((report, index) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{index + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{report.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-300">{report.email}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                            {formatDate(report.date)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{report.shift}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{report.product}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{report.market}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-300">{report.tkqc}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border border-gray-300">
                            {report.cpqc?.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border border-gray-300">
                            {report.mess_cmt?.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border border-gray-300">
                            {report.orders?.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-primary border border-gray-300">
                            {report.revenue?.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm border border-gray-300">
                            {report.status === 'synced' ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✓ Đã sync</span>
                            ) : report.status === 'error' ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">✗ Lỗi</span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Chờ xử lý</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Báo cáo F3 Tab */}
          {activeTab === 'f3' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-primary">Báo cáo F3</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Hiển thị <span className="font-semibold text-blue-600">{filteredF3Data.length.toLocaleString('vi-VN')}</span> / <span className="font-semibold">{f3Data.length.toLocaleString('vi-VN')}</span> bản ghi
                    {filteredF3Data.length < f3Data.length && (
                      <span className="text-orange-600 ml-2">(đang áp dụng bộ lọc)</span>
                    )}
                  </p>
                </div>
                {(filters.startDate || filters.endDate || filters.searchText || filters.shifts.length > 0 || filters.teams.length > 0) && (
                  <button
                    onClick={() => {
                      setFilters({
                        startDate: '',
                        endDate: '',
                        products: [],
                        shifts: [],
                        markets: [],
                        teams: [],
                        searchText: '',
                      });
                      toast.info('Đã xóa tất cả bộ lọc', {
                        position: "top-right",
                        autoClose: 2000,
                      });
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Xóa bộ lọc
                  </button>
                )}
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90 mb-1">Tổng đơn hàng</p>
                      <p className="text-3xl font-bold">{filteredF3Data.length}</p>
                    </div>
                    <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90 mb-1">Tổng doanh thu (VNĐ)</p>
                      <p className="text-2xl font-bold">
                        {filteredF3Data.reduce((sum, item) => sum + (item['Tổng tiền VNĐ'] || 0), 0).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90 mb-1">Đơn hợp lệ</p>
                      <p className="text-3xl font-bold">
                        {filteredF3Data.filter(item => item['Trạng thái đơn'] === 'Đơn hợp lệ').length}
                      </p>
                    </div>
                    <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90 mb-1">Giá trị TB/Đơn</p>
                      <p className="text-2xl font-bold">
                        {filteredF3Data.length > 0 
                          ? (filteredF3Data.reduce((sum, item) => sum + (item['Tổng tiền VNĐ'] || 0), 0) / filteredF3Data.length).toLocaleString('vi-VN', {maximumFractionDigits: 0})
                          : 0
                        }
                      </p>
                    </div>
                    <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* F3 Data Table */}
              {filteredF3Data.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Không có dữ liệu F3</p>
                </div>
              ) : (
                <div className="overflow-x-auto shadow-md rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">STT</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Mã đơn hàng</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Tên khách hàng</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Điện thoại</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Địa chỉ</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Mặt hàng</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Số lượng</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Giá bán</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Tổng tiền VNĐ</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">NV Marketing</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">NV Sale</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Team</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Ca</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Ngày lên đơn</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Trạng thái đơn</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Hình thức TT</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedF3Data.map((item, index) => {
                        const globalIndex = (currentPage - 1) * itemsPerPage + index;
                        return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{globalIndex + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{item['Mã đơn hàng'] || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{item['Name*'] || item['Tên lên đơn'] || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{item['Phone*'] || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                            {[item['Add'], item['City'], item['State']].filter(Boolean).join(', ') || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{item['Mặt hàng'] || item['Tên mặt hàng 1'] || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{item['Số lượng mặt hàng 1'] || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                            ${item['Giá bán'] || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600 border border-gray-300">
                            {(item['Tổng tiền VNĐ'] || 0).toLocaleString('vi-VN')}₫
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{item['Nhân viên Marketing'] || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{item['Nhân viên Sale'] || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{item['Team'] || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{item['Ca'] || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                            {item['Ngày lên đơn'] ? new Date(item['Ngày lên đơn']).toLocaleDateString('vi-VN') : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm border border-gray-300">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item['Trạng thái đơn'] === 'Đơn hợp lệ' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item['Trạng thái đơn'] || 'Chưa xác định'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{item['Hình thức thanh toán'] || '-'}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {filteredF3Data.length > itemsPerPage && (
                <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Hiển thị <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> đến{' '}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredF3Data.length)}</span> trong tổng số{' '}
                        <span className="font-medium">{filteredF3Data.length.toLocaleString('vi-VN')}</span> bản ghi
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        {/* Page numbers */}
                        {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = idx + 1;
                          } else if (currentPage <= 3) {
                            pageNum = idx + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + idx;
                          } else {
                            pageNum = currentPage - 2 + idx;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quản lý Nhân sự Tab */}
          {activeTab === 'users' && (
            <div>
              <h2 className="text-2xl font-bold text-primary mb-6">Quản lý Nhân sự</h2>
              
              {/* User Management Table */}
              {users.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Không có dữ liệu nhân sự</p>
                </div>
              ) : (
                <div className="overflow-x-auto shadow-md rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">STT</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Họ và Tên</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Bộ phận</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Team</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Vị trí</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Chi nhánh</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Ca</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider border border-gray-300">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user, index) => (
                        <tr key={user.firebaseKey || user.id} className="hover:bg-gray-50">
                          {editingUser && editingUser.firebaseKey === user.firebaseKey && userRole === 'admin' ? (
                            // Edit mode (only for admin)
                            <>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{index + 1}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm border border-gray-300">
                                <input
                                  type="text"
                                  value={editingUser['Họ Và Tên'] || ''}
                                  onChange={(e) => setEditingUser({...editingUser, 'Họ Và Tên': e.target.value})}
                                  className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm border border-gray-300">
                                <input
                                  type="email"
                                  value={editingUser.email || ''}
                                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                  className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm border border-gray-300">
                                <input
                                  type="text"
                                  value={editingUser['Bộ phận'] || ''}
                                  onChange={(e) => setEditingUser({...editingUser, 'Bộ phận': e.target.value})}
                                  className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm border border-gray-300">
                                <input
                                  type="text"
                                  value={editingUser.Team || ''}
                                  onChange={(e) => setEditingUser({...editingUser, Team: e.target.value})}
                                  className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm border border-gray-300">
                                <input
                                  type="text"
                                  value={editingUser['Vị trí'] || ''}
                                  onChange={(e) => setEditingUser({...editingUser, 'Vị trí': e.target.value})}
                                  className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm border border-gray-300">
                                <input
                                  type="text"
                                  value={editingUser['chi nhánh'] || ''}
                                  onChange={(e) => setEditingUser({...editingUser, 'chi nhánh': e.target.value})}
                                  className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm border border-gray-300">
                                <input
                                  type="text"
                                  value={editingUser.Ca || ''}
                                  onChange={(e) => setEditingUser({...editingUser, Ca: e.target.value})}
                                  className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center text-sm border border-gray-300">
                                <button
                                  onClick={async () => {
                                    await handleUpdateUser(user.firebaseKey, {
                                      'Họ Và Tên': editingUser['Họ Và Tên'],
                                      email: editingUser.email,
                                      'Bộ phận': editingUser['Bộ phận'],
                                      Team: editingUser.Team,
                                      'Vị trí': editingUser['Vị trí'],
                                      'chi nhánh': editingUser['chi nhánh'],
                                      Ca: editingUser.Ca,
                                      id: editingUser.id // Keep original id field
                                    });
                                    setEditingUser(null);
                                  }}
                                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 mr-2"
                                >
                                  ✓ Lưu
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                  ✗ Hủy
                                </button>
                              </td>
                            </>
                          ) : (
                            // View mode
                            <>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{index + 1}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{user['Họ Và Tên'] || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 border border-gray-300">{user.email || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{user['Bộ phận'] || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{user.Team || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{user['Vị trí'] || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{user['chi nhánh'] || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border border-gray-300">{user.Ca || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-center text-sm border border-gray-300">
                                {userRole === 'admin' ? (
                                  <>
                                    <button
                                      onClick={() => setEditingUser({...user})}
                                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                                      title="Sửa"
                                    >
                                      ✏️ Sửa
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(user.firebaseKey)}
                                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                      title="Xóa"
                                    >
                                      🗑️ Xóa
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-gray-400">Chỉ xem</span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}

export default ReportDashboard;
