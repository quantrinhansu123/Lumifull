import { useEffect, useState } from 'react';

function Home() {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('vi-VN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    setCurrentDate(formattedDate);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-center justify-center mb-6">
          <img 
            src="https://www.appsheet.com/template/gettablefileurl?appName=Appsheet-325045268&tableName=Kho%20%E1%BA%A3nh&fileName=Kho%20%E1%BA%A3nh_Images%2Ff930e667.%E1%BA%A2nh.025539.jpg"
            alt="Company Logo"
            className="h-20 w-20 rounded-full shadow-lg mr-4"
          />
          <div>
            <h1 className="text-4xl font-bold text-primary">
              Báo cáo chi phí tổng hợp
            </h1>
            <p className="text-gray-600 mt-2">{currentDate}</p>
          </div>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Chào mừng đến với Hệ thống Báo cáo Marketing
        </h2>
        <p className="text-gray-600 mb-4">
          Hệ thống này giúp bạn theo dõi và quản lý các chỉ số marketing hiệu quả, 
          bao gồm chi phí quảng cáo, số lượng đơn hàng, doanh số và các KPI quan trọng khác.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-primary">
            <h3 className="text-lg font-semibold text-primary mb-2">
              📊 Báo cáo Chi tiết
            </h3>
            <p className="text-gray-600 text-sm">
              Theo dõi chi phí quảng cáo, số tin nhắn, số đơn và doanh số theo từng nhân viên marketing
            </p>
          </div>
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-blue-600 mb-2">
              🎯 Báo cáo KPI
            </h3>
            <p className="text-gray-600 text-sm">
              Đánh giá hiệu suất làm việc so với các chỉ tiêu KPI đã đặt ra
            </p>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-500">
            <h3 className="text-lg font-semibold text-yellow-600 mb-2">
              📈 Hiệu quả MKT
            </h3>
            <p className="text-gray-600 text-sm">
              Phân tích hiệu quả marketing theo sản phẩm và thị trường với biểu đồ trực quan
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Tính năng chính
        </h2>
        <ul className="space-y-3">
          <li className="flex items-start">
            <span className="text-primary text-xl mr-3">✓</span>
            <div>
              <strong className="text-gray-800">Bộ lọc linh hoạt:</strong>
              <span className="text-gray-600"> Lọc dữ liệu theo ngày, sản phẩm, ca làm việc, team và thị trường</span>
            </div>
          </li>
          <li className="flex items-start">
            <span className="text-primary text-xl mr-3">✓</span>
            <div>
              <strong className="text-gray-800">Báo cáo theo thời gian thực:</strong>
              <span className="text-gray-600"> Cập nhật dữ liệu tự động từ hệ thống</span>
            </div>
          </li>
          <li className="flex items-start">
            <span className="text-primary text-xl mr-3">✓</span>
            <div>
              <strong className="text-gray-800">Biểu đồ trực quan:</strong>
              <span className="text-gray-600"> Hiển thị dữ liệu dưới dạng biểu đồ dễ hiểu</span>
            </div>
          </li>
          <li className="flex items-start">
            <span className="text-primary text-xl mr-3">✓</span>
            <div>
              <strong className="text-gray-800">Xuất báo cáo:</strong>
              <span className="text-gray-600"> Tải xuống và chia sẻ báo cáo dễ dàng</span>
            </div>
          </li>
          <li className="flex items-start">
            <span className="text-primary text-xl mr-3">✓</span>
            <div>
              <strong className="text-gray-800">Gửi báo cáo mới:</strong>
              <span className="text-gray-600"> Nộp báo cáo marketing tự động lưu vào Firebase và Google Sheets</span>
            </div>
          </li>
        </ul>
      </div>

      {/* CTA Section */}
      <div className="mt-8 bg-gradient-to-r from-primary to-secondary rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Bắt đầu ngay hôm nay!
        </h2>
        <p className="text-white mb-6">
          Xem bảng báo cáo hoặc gửi báo cáo mới của bạn
        </p>
        <div className="flex justify-center gap-4">
          <a 
            href="/dashboard" 
            className="inline-block bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition shadow-md"
          >
            📊 Xem bảng báo cáo
          </a>
          <a 
            href="/report" 
            className="inline-block bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition shadow-md"
          >
            ✍️ Gửi báo cáo mới
          </a>
        </div>
      </div>
    </div>
  );
}

export default Home;
