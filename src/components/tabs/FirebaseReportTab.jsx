import { useState, useEffect, useMemo } from 'react';
import { ref, get, update, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { toast } from 'react-toastify';
import { useReportData } from '../../hooks/useReportData';

export function FirebaseReportTab({ filters, userRole, userTeam, userEmail }) {
  // Use hook to get data from API
  const { masterData } = useReportData(userRole, userTeam, userEmail);
  
  const [firebaseReports, setFirebaseReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [editingReport, setEditingReport] = useState(null);
  const [deletingReport, setDeletingReport] = useState(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null); // Track which report's status dropdown is open
  
  // Dropdown data from database
  const [products, setProducts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [markets, setMarkets] = useState([]);
  
  // Custom input states
  const [showCustomProduct, setShowCustomProduct] = useState(false);
  const [showCustomTeam, setShowCustomTeam] = useState(false);
  const [showCustomMarket, setShowCustomMarket] = useState(false);
  const [customProduct, setCustomProduct] = useState('');
  const [customTeam, setCustomTeam] = useState('');
  const [customMarket, setCustomMarket] = useState('');

  // Check if user can edit status
  const canEditStatus = userRole === 'admin' || userRole === 'leader';

  // Fetch Firebase reports
  const fetchFirebaseReports = async () => {
    try {
      setLoading(true);
      const reportsRef = ref(database, 'reports');
      const snapshot = await get(reportsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const reportsArray = Object.entries(data).map(([id, report]) => ({
          id,
          ...report
        }));
        setFirebaseReports(reportsArray);
      } else {
        setFirebaseReports([]);
      }
    } catch (err) {
      console.error('Error fetching Firebase reports:', err);
      toast.error('Lỗi khi tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirebaseReports();
    loadProductsFromMasterData();
    loadTeamsFromHumanResources();
    loadMarketsFromMasterData();
  }, [masterData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openStatusDropdown && !event.target.closest('.relative')) {
        setOpenStatusDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openStatusDropdown]);

  // Load unique products from masterData (API data via hook)
  const loadProductsFromMasterData = () => {
    try {
      const productsSet = new Set();
      
      // Load from masterData (API data from hook)
      masterData.forEach(item => {
        if (item.product && String(item.product).trim()) {
          productsSet.add(String(item.product).trim());
        }
      });
      
      // Also load from Firebase reports as supplementary
      firebaseReports.forEach(item => {
        if (item.product && String(item.product).trim()) {
          productsSet.add(String(item.product).trim());
        }
      });
      
      setProducts(Array.from(productsSet).sort());
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  // Load unique teams from human_resources
  const loadTeamsFromHumanResources = async () => {
    try {
      const hrRef = ref(database, 'human_resources');
      const snapshot = await get(hrRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const uniqueTeams = [...new Set(
          Object.values(data)
            .map(item => item.Team)
            .filter(Boolean)
        )];
        setTeams(uniqueTeams.sort());
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  // Load unique markets from masterData (API data via hook)
  const loadMarketsFromMasterData = () => {
    try {
      const marketsSet = new Set();
      
      // Load from masterData (API data from hook)
      masterData.forEach(item => {
        if (item.market && String(item.market).trim()) {
          marketsSet.add(String(item.market).trim());
        }
      });
      
      // Also load from Firebase reports as supplementary
      firebaseReports.forEach(item => {
        if (item.market && String(item.market).trim()) {
          marketsSet.add(String(item.market).trim());
        }
      });
      
      setMarkets(Array.from(marketsSet).sort());
    } catch (error) {
      console.error('Error loading markets:', error);
    }
  };

  // Update report status
  const handleUpdateStatus = async () => {
    if (!editingStatus || !newStatus) return;

    try {
      const reportRef = ref(database, `reports/${editingStatus.id}`);
      await update(reportRef, { status: newStatus });
      
      toast.success('Cập nhật trạng thái thành công');
      
      // Update local state
      setFirebaseReports(prev => prev.map(report => 
        report.id === editingStatus.id 
          ? { ...report, status: newStatus }
          : report
      ));
      
      // Close modal
      setEditingStatus(null);
      setNewStatus('');
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  // Quick update status directly from dropdown
  const handleQuickStatusChange = async (reportId, newStatus) => {
    try {
      const reportRef = ref(database, `reports/${reportId}`);
      await update(reportRef, { status: newStatus });
      
      toast.success('Cập nhật trạng thái thành công');
      
      // Update local state
      setFirebaseReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus }
          : report
      ));
      
      // Close dropdown
      setOpenStatusDropdown(null);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  // Toggle status dropdown
  const toggleStatusDropdown = (reportId) => {
    setOpenStatusDropdown(openStatusDropdown === reportId ? null : reportId);
  };

  // Open edit status modal
  const openEditStatus = (report) => {
    setEditingStatus(report);
    setNewStatus(report.status || 'pending');
  };

  // Close edit status modal
  const closeEditStatus = () => {
    setEditingStatus(null);
    setNewStatus('');
  };

  // Open edit report modal
  const openEditReport = (report) => {
    setEditingReport({...report});
    // Reset custom input states
    setShowCustomProduct(false);
    setShowCustomTeam(false);
    setShowCustomMarket(false);
    setCustomProduct('');
    setCustomTeam('');
    setCustomMarket('');
  };

  // Close edit report modal
  const closeEditReport = () => {
    setEditingReport(null);
    setShowCustomProduct(false);
    setShowCustomTeam(false);
    setShowCustomMarket(false);
    setCustomProduct('');
    setCustomTeam('');
    setCustomMarket('');
  };

  // Update report
  const handleUpdateReport = async () => {
    if (!editingReport) return;

    try {
      // Use custom values if provided
      const finalProduct = showCustomProduct ? customProduct : editingReport.product;
      const finalTeam = showCustomTeam ? customTeam : editingReport.team;
      const finalMarket = showCustomMarket ? customMarket : editingReport.market;

      const reportRef = ref(database, `reports/${editingReport.id}`);
      const updateData = {
        name: editingReport.name,
        email: editingReport.email,
        date: editingReport.date,
        shift: editingReport.shift,
        product: finalProduct,
        market: finalMarket,
        tkqc: editingReport.tkqc,
        cpqc: Number(editingReport.cpqc) || 0,
        mess_cmt: Number(editingReport.mess_cmt) || 0,
        orders: Number(editingReport.orders) || 0,
        revenue: Number(editingReport.revenue) || 0,
        team: finalTeam
      };
      
      await update(reportRef, updateData);
      
      toast.success('Cập nhật báo cáo thành công');
      
      // Update local state
      setFirebaseReports(prev => prev.map(report => 
        report.id === editingReport.id 
          ? { ...report, ...updateData }
          : report
      ));
      
      closeEditReport();
      await fetchFirebaseReports();
    } catch (err) {
      console.error('Error updating report:', err);
      toast.error('Lỗi khi cập nhật báo cáo');
    }
  };

  // Open delete confirmation modal
  const openDeleteConfirm = (report) => {
    setDeletingReport(report);
  };

  // Close delete confirmation modal
  const closeDeleteConfirm = () => {
    setDeletingReport(null);
  };

  // Delete report
  const handleDeleteReport = async () => {
    if (!deletingReport) return;

    try {
      const reportRef = ref(database, `reports/${deletingReport.id}`);
      await remove(reportRef); // Use remove() to delete
      
      toast.success('Xóa báo cáo thành công');
      
      // Update local state
      setFirebaseReports(prev => prev.filter(report => report.id !== deletingReport.id));
      closeDeleteConfirm();
    } catch (err) {
      console.error('Error deleting report:', err);
      toast.error('Lỗi khi xóa báo cáo');
    }
  };

  // Filter Firebase reports
  const filteredFirebaseReports = useMemo(() => {
    let filtered = [...firebaseReports];

    // Apply role-based filtering
    if (userRole === 'admin') {
      // Admin sees all
    } else if (userRole === 'leader' && userTeam) {
      // Leader sees their team's reports
      filtered = filtered.filter(r => r.team === userTeam);
    } else if (userEmail) {
      // Regular user sees only their reports
      filtered = filtered.filter(r => r.email === userEmail);
    }

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
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter(report => {
        if (!report.date) return false;
        const reportDate = new Date(report.date);
        
        if (filters.startDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          if (reportDate < start) return false;
        }
        
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          if (reportDate > end) return false;
        }
        
        return true;
      });
    }

    // Product filter
    if (filters.products && filters.products.length > 0) {
      filtered = filtered.filter(report => 
        filters.products.includes(report.product)
      );
    }

    // Shift filter
    if (filters.shifts && filters.shifts.length > 0) {
      filtered = filtered.filter(report => 
        filters.shifts.includes(report.shift)
      );
    }

    // Market filter
    if (filters.markets && filters.markets.length > 0) {
      filtered = filtered.filter(report => 
        filters.markets.includes(report.market)
      );
    }

    // Team filter
    if (filters.teams && filters.teams.length > 0) {
      filtered = filtered.filter(report => 
        filters.teams.includes(report.team)
      );
    }

    return filtered;
  }, [firebaseReports, filters, userRole, userTeam, userEmail]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải báo cáo Marketing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="flex items-center justify-between mb-6 px-6 pt-6">
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
        <>
          <div className="mb-4 text-sm text-gray-600 px-6">
            Hiển thị: <span className="font-semibold text-primary">{filteredFirebaseReports.length}</span> / {firebaseReports.length} báo cáo
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">STT</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Tên</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Email</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Ngày</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Ca</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Sản phẩm</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Thị trường</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">TKQC</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">CPQC</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Mess/Cmt</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Số đơn</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Doanh số</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Trạng thái</th>
                  {canEditStatus && (
                    <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">Hành động</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFirebaseReports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{index + 1}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{report.name}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-600 border border-gray-300">{report.email}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                      {formatDate(report.date)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{report.shift}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{report.product}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{report.market}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-600 border border-gray-300">{report.tkqc}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-900 border border-gray-300">
                      {report.cpqc?.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-900 border border-gray-300">
                      {report.mess_cmt?.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-900 border border-gray-300">
                      {report.orders?.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-semibold text-right text-primary border border-gray-300">
                      {report.revenue?.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium border border-gray-300 text-center">
                      <div className="relative inline-block">
                        {canEditStatus ? (
                          <>
                            <button
                              onClick={() => toggleStatusDropdown(report.id)}
                              className={`px-2 py-1 text-xs rounded-full cursor-pointer hover:opacity-80 transition ${
                                report.status === 'synced' 
                                  ? 'bg-green-100 text-green-800' 
                                  : report.status === 'error' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                              title="Click để thay đổi trạng thái"
                            >
                              {report.status === 'synced' ? '✓ Đã sync' : report.status === 'error' ? '✗ Lỗi' : 'Chờ xử lý'} ▼
                            </button>
                            
                            {openStatusDropdown === report.id && (
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[120px]">
                                {report.status !== 'pending' && (
                                  <button
                                    onClick={() => handleQuickStatusChange(report.id, 'pending')}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition flex items-center gap-2"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                    Chờ xử lý
                                  </button>
                                )}
                                {report.status !== 'synced' && (
                                  <button
                                    onClick={() => handleQuickStatusChange(report.id, 'synced')}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition flex items-center gap-2"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Đã sync
                                  </button>
                                )}
                                {report.status !== 'error' && (
                                  <button
                                    onClick={() => handleQuickStatusChange(report.id, 'error')}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition flex items-center gap-2"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Lỗi
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            report.status === 'synced' 
                              ? 'bg-green-100 text-green-800' 
                              : report.status === 'error' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {report.status === 'synced' ? '✓ Đã sync' : report.status === 'error' ? '✗ Lỗi' : 'Chờ xử lý'}
                          </span>
                        )}
                      </div>
                    </td>
                    {canEditStatus && (
                      <td className="px-2 py-2 whitespace-nowrap text-sm font-medium border border-gray-300 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => openEditReport(report)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs"
                            title="Sửa báo cáo"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(report)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                            title="Xóa báo cáo"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredFirebaseReports.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Không có dữ liệu phù hợp với bộ lọc</p>
            </div>
          )}
        </>
      )}

      {/* Edit Status Modal */}
      {editingStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              Cập nhật trạng thái báo cáo
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Báo cáo của: <span className="font-semibold">{editingStatus.name}</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Ngày: <span className="font-semibold">{formatDate(editingStatus.date)}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Sản phẩm: <span className="font-semibold">{editingStatus.product}</span>
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái mới
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Chờ xử lý</option>
                <option value="synced">Đã sync</option>
                <option value="error">Lỗi</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpdateStatus}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Lưu
              </button>
              <button
                onClick={closeEditStatus}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {editingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-lg sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white">✏️ Chỉnh sửa báo cáo Marketing</h3>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tên */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingReport.name || ''}
                    onChange={(e) => setEditingReport({...editingReport, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập tên"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editingReport.email || ''}
                    onChange={(e) => setEditingReport({...editingReport, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập email"
                  />
                </div>

                {/* Ngày */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editingReport.date || ''}
                    onChange={(e) => setEditingReport({...editingReport, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Ca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ca <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingReport.shift || ''}
                    onChange={(e) => setEditingReport({...editingReport, shift: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn ca --</option>
                    <option value="Giữa ca">Giữa ca</option>
                    <option value="Hết ca">Hết ca</option>
                  </select>
                </div>

                {/* Sản phẩm */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sản phẩm <span className="text-red-500">*</span>
                  </label>
                  {showCustomProduct ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customProduct}
                        onChange={(e) => setCustomProduct(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập sản phẩm mới"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomProduct(false);
                          setCustomProduct('');
                        }}
                        className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={editingReport.product || ''}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setShowCustomProduct(true);
                          setEditingReport({...editingReport, product: ''});
                        } else {
                          setEditingReport({...editingReport, product: e.target.value});
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Chọn sản phẩm --</option>
                      {products.map(product => (
                        <option key={product} value={product}>{product}</option>
                      ))}
                      <option value="__custom__">➕ Thêm mới</option>
                    </select>
                  )}
                </div>

                {/* Thị trường */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thị trường <span className="text-red-500">*</span>
                  </label>
                  {showCustomMarket ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customMarket}
                        onChange={(e) => setCustomMarket(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập thị trường mới"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomMarket(false);
                          setCustomMarket('');
                        }}
                        className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={editingReport.market || ''}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setShowCustomMarket(true);
                          setEditingReport({...editingReport, market: ''});
                        } else {
                          setEditingReport({...editingReport, market: e.target.value});
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Chọn thị trường --</option>
                      {markets.map(market => (
                        <option key={market} value={market}>{market}</option>
                      ))}
                      <option value="__custom__">➕ Thêm mới</option>
                    </select>
                  )}
                </div>

                {/* TKQC */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TKQC <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingReport.tkqc || ''}
                    onChange={(e) => setEditingReport({...editingReport, tkqc: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập TKQC"
                  />
                </div>

                {/* Team */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team
                  </label>
                  {showCustomTeam ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customTeam}
                        onChange={(e) => setCustomTeam(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập team mới"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomTeam(false);
                          setCustomTeam('');
                        }}
                        className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={editingReport.team || ''}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setShowCustomTeam(true);
                          setEditingReport({...editingReport, team: ''});
                        } else {
                          setEditingReport({...editingReport, team: e.target.value});
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Chọn team --</option>
                      {teams.map(team => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                      <option value="__custom__">➕ Thêm mới</option>
                    </select>
                  )}
                </div>

                {/* CPQC */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chi phí QC (đ)
                  </label>
                  <input
                    type="number"
                    value={editingReport.cpqc || 0}
                    onChange={(e) => setEditingReport({...editingReport, cpqc: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                {/* Mess/Cmt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mess/Comment
                  </label>
                  <input
                    type="number"
                    value={editingReport.mess_cmt || 0}
                    onChange={(e) => setEditingReport({...editingReport, mess_cmt: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                {/* Số đơn */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số đơn
                  </label>
                  <input
                    type="number"
                    value={editingReport.orders || 0}
                    onChange={(e) => setEditingReport({...editingReport, orders: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                {/* Doanh số */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doanh số (đ)
                  </label>
                  <input
                    type="number"
                    value={editingReport.revenue || 0}
                    onChange={(e) => setEditingReport({...editingReport, revenue: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Required fields note */}
              <p className="text-sm text-gray-500 mt-4">
                <span className="text-red-500">*</span> Các trường bắt buộc
              </p>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={closeEditReport}
                className="px-5 py-2.5 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
              >
                ✗ Hủy
              </button>
              <button
                onClick={handleUpdateReport}
                className="px-5 py-2.5 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
              >
                ✓ Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold text-white">⚠️ Xác nhận xóa báo cáo</h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Bạn có chắc chắn muốn xóa báo cáo này không?
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                <p className="text-sm">
                  <span className="font-semibold text-gray-700">Tên:</span>{' '}
                  <span className="text-gray-900">{deletingReport.name}</span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-gray-700">Email:</span>{' '}
                  <span className="text-gray-900">{deletingReport.email}</span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-gray-700">Ngày:</span>{' '}
                  <span className="text-gray-900">{formatDate(deletingReport.date)}</span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-gray-700">Sản phẩm:</span>{' '}
                  <span className="text-gray-900">{deletingReport.product}</span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-gray-700">Doanh số:</span>{' '}
                  <span className="text-primary font-semibold">{deletingReport.revenue?.toLocaleString('vi-VN')}đ</span>
                </p>
              </div>

              <p className="text-red-600 font-medium text-sm mt-4">
                ⚠️ Hành động này không thể hoàn tác!
              </p>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={closeDeleteConfirm}
                className="px-5 py-2.5 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
              >
                ✗ Hủy
              </button>
              <button
                onClick={handleDeleteReport}
                className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                🗑️ Xóa báo cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
