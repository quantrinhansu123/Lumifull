import { useState, useEffect } from 'react';
import { database } from '../firebase/config';
import { ref, push, get } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ReportForm() {
  // Changed to array to support multiple rows
  const [formRows, setFormRows] = useState([{
    name: '',
    email: '',
    date: new Date().toISOString().split('T')[0],
    shift: '',
    product: '',
    market: '',
    tkqc: '',
    cpqc: '',
    mess_cmt: '',
    orders: '',
    revenue: '',
    team: '',
    id_ns: '',
    branch: ''
  }]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});

  // Format number with thousand separators (German format: 1.000.000)
  const formatNumberInput = (value) => {
    // Remove all non-digit characters
    const cleanValue = value.replace(/[^0-9]/g, '');
    // Format with thousand separators if there's a value
    return cleanValue ? new Intl.NumberFormat('de-DE').format(cleanValue) : '';
  };

  // Clean formatted number back to plain number for storage
  const cleanNumberInput = (value) => {
    return value.replace(/[^0-9]/g, '');
  };

  // Load user info when component mounts
  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const username = localStorage.getItem('username');
      const userEmail = localStorage.getItem('userEmail');
      const userTeam = localStorage.getItem('userTeam');

      if (!userId) {
        return;
      }

      // Get full user info from Firebase
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Auto-fill first row with user info
        setFormRows([{
          name: userData.name || username || '',
          email: userData.email || userEmail || '',
          date: new Date().toISOString().split('T')[0],
          shift: '',
          product: '',
          market: '',
          tkqc: '',
          cpqc: '',
          mess_cmt: '',
          orders: '',
          revenue: '',
          team: userData.team || userTeam || '',
          id_ns: userData.id_ns || '',
          branch: userData.branch || ''
        }]);
      } else {
        // Fallback to localStorage if Firebase data not available
        setFormRows([{
          name: username || '',
          email: userEmail || '',
          date: new Date().toISOString().split('T')[0],
          shift: '',
          product: '',
          market: '',
          tkqc: '',
          cpqc: '',
          mess_cmt: '',
          orders: '',
          revenue: '',
          team: userTeam || '',
          id_ns: '',
          branch: ''
        }]);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      // Still try to use localStorage as fallback
      setFormRows([{
        name: localStorage.getItem('username') || '',
        email: localStorage.getItem('userEmail') || '',
        date: new Date().toISOString().split('T')[0],
        shift: '',
        product: '',
        market: '',
        tkqc: '',
        cpqc: '',
        mess_cmt: '',
        orders: '',
        revenue: '',
        team: localStorage.getItem('userTeam') || '',
        id_ns: '',
        branch: ''
      }]);
    }
  };

  const handleChange = (e, rowIndex) => {
    const { name, value } = e.target;
    
    // Number fields that should be formatted
    const numberFields = ['cpqc', 'mess_cmt', 'orders', 'revenue'];
    
    const newRows = [...formRows];
    if (numberFields.includes(name)) {
      // Format the number as user types
      const formattedValue = formatNumberInput(value);
      newRows[rowIndex] = {
        ...newRows[rowIndex],
        [name]: formattedValue
      };
    } else {
      newRows[rowIndex] = {
        ...newRows[rowIndex],
        [name]: value
      };
    }
    setFormRows(newRows);
    
    // Clear error for this field when user starts typing
    const errorKey = `${rowIndex}-${name}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    formRows.forEach((row, index) => {
      if (!row.name.trim()) newErrors[`${index}-name`] = 'Vui lòng nhập tên';
      if (!row.email.trim()) {
        newErrors[`${index}-email`] = 'Vui lòng nhập email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        newErrors[`${index}-email`] = 'Email không hợp lệ';
      }
      if (!row.date) newErrors[`${index}-date`] = 'Vui lòng chọn ngày';
      if (!row.shift) newErrors[`${index}-shift`] = 'Vui lòng chọn ca';
      if (!row.product.trim()) newErrors[`${index}-product`] = 'Vui lòng nhập sản phẩm';
      if (!row.market.trim()) newErrors[`${index}-market`] = 'Vui lòng nhập thị trường';
      if (!row.tkqc.trim()) newErrors[`${index}-tkqc`] = 'Vui lòng nhập TKQC';
      if (!row.cpqc) newErrors[`${index}-cpqc`] = 'Vui lòng nhập CPQC';
      if (!row.mess_cmt) newErrors[`${index}-mess_cmt`] = 'Vui lòng nhập số Mess/Cmt';
      if (!row.orders) newErrors[`${index}-orders`] = 'Vui lòng nhập số đơn';
      if (!row.revenue) newErrors[`${index}-revenue`] = 'Vui lòng nhập doanh số';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc', {
        position: "top-right",
        autoClose: 4000,
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Submit all rows to Firebase
      const reportsRef = ref(database, 'reports');
      
      for (const row of formRows) {
        const reportData = {
          name: row.name.trim(),
          email: row.email.trim(),
          date: row.date,
          shift: row.shift,
          product: row.product.trim(),
          market: row.market.trim(),
          tkqc: row.tkqc.trim(),
          cpqc: parseFloat(cleanNumberInput(row.cpqc)) || 0,
          mess_cmt: parseInt(cleanNumberInput(row.mess_cmt)) || 0,
          orders: parseInt(cleanNumberInput(row.orders)) || 0,
          revenue: parseFloat(cleanNumberInput(row.revenue)) || 0,
          team: row.team || '',
          id_ns: row.id_ns || '',
          branch: row.branch || '',
          timestamp: new Date().toISOString(),
          status: 'pending'
        };

        await push(reportsRef, reportData);
      }

      toast.success(`✅ Đã lưu thành công ${formRows.length} báo cáo!`, {
        position: "top-right",
        autoClose: 3000,
      });

      // Reset to single row with user info
      const userId = localStorage.getItem('userId');
      const username = localStorage.getItem('username');
      const userEmail = localStorage.getItem('userEmail');
      const userTeam = localStorage.getItem('userTeam');
      
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      const userData = snapshot.exists() ? snapshot.val() : {};

      setFormRows([{
        name: userData.name || username || '',
        email: userData.email || userEmail || '',
        date: new Date().toISOString().split('T')[0],
        shift: '',
        product: '',
        market: '',
        tkqc: '',
        cpqc: '',
        mess_cmt: '',
        orders: '',
        revenue: '',
        team: userData.team || userTeam || '',
        id_ns: userData.id_ns || '',
        branch: userData.branch || ''
      }]);

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('❌ Có lỗi xảy ra: ' + (error.message || 'Vui lòng thử lại.'), {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[95vw] mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-b-4 border-primary">
          <div className="flex items-center">
            <img 
              src="https://www.appsheet.com/template/gettablefileurl?appName=Appsheet-325045268&tableName=Kho%20%E1%BA%A3nh&fileName=Kho%20%E1%BA%A3nh_Images%2Ff930e667.%E1%BA%A2nh.025539.jpg"
              alt="LumiGlobal Logo" 
              className="h-16 mr-6"
            />
            <h1 className="text-3xl font-bold text-primary">
              Báo Cáo LumiGlobal (Báo cáo MKT)
            </h1>
          </div>
        </div>

        {/* Status Message */}
        {message.text && (
          <div className={`mb-4 p-3 rounded-md font-bold text-center ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800' 
              : message.type === 'warning'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <p>{message.text}</p>
          </div>
        )}

        {/* Add Row Button */}
        <button
          type="button"
          onClick={() => {
            // Add a new row with user info from last row
            const lastRow = formRows[formRows.length - 1];
            const newRow = {
              name: lastRow.name,
              email: lastRow.email,
              date: new Date().toISOString().split('T')[0],
              shift: lastRow.shift,
              product: lastRow.product,
              market: lastRow.market,
              tkqc: lastRow.tkqc,
              cpqc: '',
              mess_cmt: '',
              orders: '',
              revenue: '',
              team: lastRow.team,
              id_ns: lastRow.id_ns,
              branch: lastRow.branch
            };
            setFormRows([...formRows, newRow]);
            setMessage({ type: 'success', text: `Đã thêm dòng ${formRows.length + 1}` });
            setTimeout(() => setMessage({ type: '', text: '' }), 2000);
          }}
          className="w-full mb-4 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md transition-all shadow-md text-lg"
        >
          ➕ Thêm dòng mới
        </button>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg">
          <div className="overflow-x-auto border border-gray-300 rounded-md">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    #
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    Tên
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    Email
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    Ngày
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    Ca
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    Sản phẩm
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    Thị trường
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    TKQC
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    CPQC
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    Số Mess/Cmt
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    Số đơn
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-left font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    Doanh số
                  </th>
                  <th className="bg-primary text-white px-4 py-3 text-center font-medium border border-gray-300 whitespace-nowrap sticky top-0 z-10">
                    Xóa
                  </th>
                </tr>
              </thead>
              <tbody>
                {formRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-100">
                    {/* Row Number */}
                    <td className="border border-gray-300 p-3 text-center font-bold">
                      {rowIndex + 1}
                    </td>

                    {/* Name */}
                    <td className="border border-gray-300 p-3">
                      <input
                        type="text"
                        name="name"
                        value={row.name}
                        onChange={(e) => handleChange(e, rowIndex)}
                        disabled
                        className={`w-full min-w-[150px] px-3 py-2 border ${errors[`${rowIndex}-name`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md bg-gray-100 text-gray-700 cursor-not-allowed transition-all`}
                        placeholder="Tự động"
                      />
                    </td>

                    {/* Email */}
                    <td className="border border-gray-300 p-3">
                      <input
                        type="email"
                        name="email"
                        value={row.email}
                        onChange={(e) => handleChange(e, rowIndex)}
                        disabled
                        className={`w-full min-w-[150px] px-3 py-2 border ${errors[`${rowIndex}-email`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md bg-gray-100 text-gray-700 cursor-not-allowed transition-all`}
                        placeholder="Tự động"
                      />
                    </td>

                    {/* Date */}
                    <td className="border border-gray-300 p-3">
                      <input
                        type="date"
                        name="date"
                        value={row.date}
                        onChange={(e) => handleChange(e, rowIndex)}
                        className={`w-full min-w-[150px] px-3 py-2 border ${errors[`${rowIndex}-date`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      />
                    </td>

                    {/* Shift */}
                    <td className="border border-gray-300 p-3">
                      <select
                        name="shift"
                        value={row.shift}
                        onChange={(e) => handleChange(e, rowIndex)}
                        className={`w-full min-w-[150px] px-3 py-2 border ${errors[`${rowIndex}-shift`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      >
                        <option value="">-- Chọn ca --</option>
                        <option value="Hết ca">Hết ca</option>
                        <option value="Giữa ca">Giữa ca</option>
                      </select>
                    </td>

                    {/* Product */}
                    <td className="border border-gray-300 p-3">
                      <select
                        name="product"
                        value={row.product}
                        onChange={(e) => handleChange(e, rowIndex)}
                        className={`w-full min-w-[150px] px-3 py-2 border ${errors[`${rowIndex}-product`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        <option value="Gel Dạ Dày">Gel Dạ Dày</option>
                        <option value="Gel Trĩ">Gel Trĩ</option>
                        <option value="ComboGold24k">ComboGold24k</option>
                        <option value="Fitgum CAFE 20X">Fitgum CAFE 20X</option>
                        <option value="Bonavita Coffee">Bonavita Coffee</option>
                        <option value="Kem Body">Kem Body</option>
                        <option value="Bakuchiol Retinol">Bakuchiol Retinol</option>
                        <option value="Serum sâm">Serum sâm</option>
                        <option value="Glutathione Collagen">Glutathione Collagen</option>
                        <option value="Glutathione Collagen NEW">Glutathione Collagen NEW</option>
                        <option value="DG">DG</option>
                        <option value="Nám DR Hancy">Nám DR Hancy</option>
                        <option value="Kẹo Táo">Kẹo Táo</option>
                        <option value="Gel Xương Khớp">Gel Xương Khớp</option>
                        <option value="Gel XK Thái">Gel XK Thái</option>
                        <option value="Gel XK Phi">Gel XK Phi</option>
                        <option value="Dán Kinoki">Dán Kinoki</option>
                        <option value="Sữa tắm CUISHIFAN">Sữa tắm CUISHIFAN</option>
                      </select>
                    </td>

                    {/* Market */}
                    <td className="border border-gray-300 p-3">
                      <select
                        name="market"
                        value={row.market}
                        onChange={(e) => handleChange(e, rowIndex)}
                        className={`w-full min-w-[150px] px-3 py-2 border ${errors[`${rowIndex}-market`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      >
                        <option value="">-- Chọn thị trường --</option>
                        <option value="Nhật Bản">Nhật Bản</option>
                        <option value="Hàn Quốc">Hàn Quốc</option>
                        <option value="Canada">Canada</option>
                        <option value="US">US</option>
                        <option value="Úc">Úc</option>
                        <option value="Anh">Anh</option>
                      </select>
                    </td>

                    {/* TKQC */}
                    <td className="border border-gray-300 p-3">
                      <input
                        type="text"
                        name="tkqc"
                        value={row.tkqc}
                        onChange={(e) => handleChange(e, rowIndex)}
                        className={`w-full min-w-[150px] px-3 py-2 border ${errors[`${rowIndex}-tkqc`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                        placeholder="Nhập TKQC"
                        autoComplete="off"
                      />
                    </td>

                    {/* CPQC */}
                    <td className="border border-gray-300 p-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        name="cpqc"
                        value={row.cpqc}
                        onChange={(e) => handleChange(e, rowIndex)}
                        className={`w-full min-w-[150px] px-3 py-2 border ${errors[`${rowIndex}-cpqc`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                        placeholder="Chỉ nhập số nguyên"
                        autoComplete="off"
                      />
                    </td>

                    {/* Messages/Comments */}
                    <td className="border border-gray-300 p-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        name="mess_cmt"
                        value={row.mess_cmt}
                        onChange={(e) => handleChange(e, rowIndex)}
                        className={`w-full min-w-[150px] px-3 py-2 border ${errors[`${rowIndex}-mess_cmt`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                        placeholder="Chỉ nhập số nguyên"
                        autoComplete="off"
                      />
                    </td>

                    {/* Orders */}
                    <td className="border border-gray-300 p-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        name="orders"
                        value={row.orders}
                        onChange={(e) => handleChange(e, rowIndex)}
                        className={`w-full min-w-[150px] px-3 py-2 border ${errors[`${rowIndex}-orders`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                        placeholder="Chỉ nhập số nguyên"
                        autoComplete="off"
                      />
                    </td>

                    {/* Revenue */}
                    <td className="border border-gray-300 p-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        name="revenue"
                        value={row.revenue}
                        onChange={(e) => handleChange(e, rowIndex)}
                        className={`w-full min-w-[150px] px-3 py-2 border ${errors[`${rowIndex}-revenue`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                        placeholder="Chỉ nhập số nguyên"
                        autoComplete="off"
                      />
                    </td>

                    {/* Delete Button */}
                    <td className="border border-gray-300 p-3 text-center">
                      {formRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newRows = formRows.filter((_, index) => index !== rowIndex);
                            setFormRows(newRows);
                            // Clear errors for deleted row
                            const newErrors = {};
                            Object.keys(errors).forEach(key => {
                              const [errRowIndex] = key.split('-');
                              if (parseInt(errRowIndex) !== rowIndex) {
                                newErrors[key] = errors[key];
                              }
                            });
                            setErrors(newErrors);
                            setMessage({ type: 'success', text: `Đã xóa dòng ${rowIndex + 1}` });
                            setTimeout(() => setMessage({ type: '', text: '' }), 2000);
                          }}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all"
                        >
                          ❌
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Hidden fields for first row */}
          <input type="hidden" name="id_ns" value={formRows[0]?.id_ns || ''} />
          <input type="hidden" name="branch" value={formRows[0]?.branch || ''} />
          <input type="hidden" name="team" value={formRows[0]?.team || ''} />

          {/* Submit Button */}
          <div className="p-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-6 rounded-md font-bold text-lg text-white transition-all shadow-md ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700 hover:shadow-lg'
              }`}
            >
              {loading ? 'Đang gửi...' : '🚀 Gửi báo cáo'}
            </button>
          </div>
        </form>
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

export default ReportForm;
