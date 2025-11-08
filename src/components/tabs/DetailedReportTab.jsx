import { useMemo, useState } from 'react';

export function DetailedReportTab({ data }) {
  // Pagination state for summary table
  const [summaryPage, setSummaryPage] = useState(1);
  // Pagination state for each daily table
  const [dailyPages, setDailyPages] = useState({});
  const itemsPerPage = 10;
  const maxDailyTables = 7;
  // Helper functions
  const formatNumber = (num) => {
    return num ? num.toLocaleString('vi-VN') : '0';
  };

  const formatCurrency = (num) => {
    return num ? num.toLocaleString('vi-VN') + 'đ' : '0đ';
  };

  const formatPercent = (num) => {
    return (num * 100).toFixed(2) + '%';
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Calculate summary data
  const summaryData = useMemo(() => {
    const grouped = {};
    
    data.forEach(item => {
      const key = `${item.team}_${item.name}`;
      if (!grouped[key]) {
        grouped[key] = {
          team: item.team,
          name: item.name,
          mess: 0,
          cpqc: 0,
          orders: 0,
          ordersReal: 0,
          revenue: 0,
          revenueReal: 0
        };
      }
      
      grouped[key].mess += item.mess_cmt || 0;
      grouped[key].cpqc += item.cpqc || 0;
      grouped[key].orders += item.orders || 0;
      grouped[key].ordersReal += item.soDonThucTe || 0;
      grouped[key].revenue += item.revenue || 0;
      grouped[key].revenueReal += item.dsChotThucTe || 0;
    });
    
    return Object.values(grouped);
  }, [data]);

  // Group data by date for daily breakdown
  const dailyBreakdown = useMemo(() => {
    const grouped = {};
    
    data.forEach(item => {
      const dateKey = formatDate(item.date);
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: item.date,
          dateStr: dateKey,
          items: []
        };
      }
      grouped[dateKey].items.push(item);
    });
    
    // Sort by date descending
    return Object.values(grouped).sort((a, b) => b.date - a.date);
  }, [data]);

  // Calculate totals
  const totals = useMemo(() => {
    return summaryData.reduce((acc, row) => ({
      mess: acc.mess + row.mess,
      cpqc: acc.cpqc + row.cpqc,
      orders: acc.orders + row.orders,
      ordersReal: acc.ordersReal + row.ordersReal,
      revenue: acc.revenue + row.revenue,
      revenueReal: acc.revenueReal + row.revenueReal
    }), {
      mess: 0,
      cpqc: 0,
      orders: 0,
      ordersReal: 0,
      revenue: 0,
      revenueReal: 0
    });
  }, [summaryData]);

  return (
    <div className="space-y-6">
      {/* Summary Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <h3 className="bg-primary text-white text-lg font-bold px-4 py-3">
          BÁO CÁO TỔNG HỢP
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-secondary">
              <tr>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">STT</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Team</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Marketing</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Số Mess</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">CPQC</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Số Đơn</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-blue-100 uppercase border border-gray-400 whitespace-nowrap">Số Đơn (TT)</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Doanh số</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-blue-100 uppercase border border-gray-400 whitespace-nowrap">DS (TT)</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Tỉ lệ chốt</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-blue-100 uppercase border border-gray-400 whitespace-nowrap">TL chốt (TT)</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Giá Mess</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">CPS</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">%CP/DS</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Giá TB Đơn</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Total Row */}
              <tr className="bg-primary text-white font-bold">
                <td className="px-2 py-2 text-xs border border-gray-400" colSpan="3">TỔNG CỘNG</td>
                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(totals.mess)}</td>
                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.cpqc)}</td>
                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(totals.orders)}</td>
                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(totals.ordersReal)}</td>
                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.revenue)}</td>
                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.revenueReal)}</td>
                <td className="px-2 py-2 text-xs text-center border border-gray-400">
                  {formatPercent(totals.mess ? totals.orders / totals.mess : 0)}
                </td>
                <td className="px-2 py-2 text-xs text-center border border-gray-400">
                  {formatPercent(totals.mess ? totals.ordersReal / totals.mess : 0)}
                </td>
                <td className="px-2 py-2 text-xs text-right border border-gray-400">
                  {formatCurrency(totals.mess ? totals.cpqc / totals.mess : 0)}
                </td>
                <td className="px-2 py-2 text-xs text-right border border-gray-400">
                  {formatCurrency(totals.orders ? totals.cpqc / totals.orders : 0)}
                </td>
                <td className="px-2 py-2 text-xs text-center border border-gray-400">
                  {formatPercent(totals.revenue ? totals.cpqc / totals.revenue : 0)}
                </td>
                <td className="px-2 py-2 text-xs text-right border border-gray-400">
                  {formatCurrency(totals.orders ? totals.revenue / totals.orders : 0)}
                </td>
              </tr>

              {/* Data Rows - Paginated */}
              {(() => {
                const startIndex = (summaryPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedData = summaryData.slice(startIndex, endIndex);

                return paginatedData.map((row, pageIndex) => {
                  const actualIndex = startIndex + pageIndex;
                  const closingRate = row.mess ? row.orders / row.mess : 0;
                  const closingRateReal = row.mess ? row.ordersReal / row.mess : 0;
                  const giaMess = row.mess ? row.cpqc / row.mess : 0;
                  const cps = row.orders ? row.cpqc / row.orders : 0;
                  const cpds = row.revenue ? row.cpqc / row.revenue : 0;
                  const giaTBDon = row.orders ? row.revenue / row.orders : 0;
                  
                  return (
                    <tr key={actualIndex} className="hover:bg-gray-50">
                      <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{actualIndex + 1}</td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{row.team}</td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{row.name}</td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatNumber(row.mess)}</td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(row.cpqc)}</td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatNumber(row.orders)}</td>
                      <td className="px-2 py-2 text-xs font-medium text-blue-600 text-right border border-gray-300 whitespace-nowrap">{formatNumber(row.ordersReal)}</td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(row.revenue)}</td>
                      <td className="px-2 py-2 text-xs font-medium text-blue-600 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(row.revenueReal)}</td>
                      <td className={`px-2 py-2 text-xs font-medium text-center border border-gray-300 whitespace-nowrap ${
                        closingRate > 0.1 ? 'bg-green-100 text-green-800' : closingRate > 0.05 ? 'bg-yellow-100 text-yellow-800' : ''
                      }`}>
                        {formatPercent(closingRate)}
                      </td>
                      <td className={`px-2 py-2 text-xs font-medium text-center border border-gray-300 whitespace-nowrap ${
                        closingRateReal > 0.1 ? 'bg-green-100 text-green-800' : closingRateReal > 0.05 ? 'bg-yellow-100 text-yellow-800' : ''
                      }`}>
                        {formatPercent(closingRateReal)}
                      </td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(giaMess)}</td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(cps)}</td>
                      <td className={`px-2 py-2 text-xs font-medium text-center border border-gray-300 whitespace-nowrap ${
                        cpds > 0.33 ? 'bg-yellow-100 text-yellow-800' : ''
                      }`}>
                        {formatPercent(cpds)}
                      </td>
                      <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(giaTBDon)}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls for Summary Table */}
        {summaryData.length > itemsPerPage && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Hiển thị <span className="font-medium">{(summaryPage - 1) * itemsPerPage + 1}</span> đến{' '}
              <span className="font-medium">{Math.min(summaryPage * itemsPerPage, summaryData.length)}</span> trong tổng số{' '}
              <span className="font-medium">{summaryData.length}</span> dòng
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSummaryPage(summaryPage - 1)}
                disabled={summaryPage === 1}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  summaryPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                ← Trước
              </button>
              
              {/* Page numbers */}
              <div className="flex gap-1">
                {(() => {
                  const totalPages = Math.ceil(summaryData.length / itemsPerPage);
                  return Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first, last, current, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= summaryPage - 1 && page <= summaryPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setSummaryPage(page)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            summaryPage === page
                              ? 'bg-primary text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === summaryPage - 2 || page === summaryPage + 2) {
                      return <span key={page} className="px-2 py-1 text-gray-500">...</span>;
                    }
                    return null;
                  });
                })()}
              </div>

              <button
                onClick={() => setSummaryPage(summaryPage + 1)}
                disabled={summaryPage === Math.ceil(summaryData.length / itemsPerPage)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  summaryPage === Math.ceil(summaryData.length / itemsPerPage)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Sau →
              </button>
            </div>
          </div>
        )}

        {summaryData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Không có dữ liệu phù hợp với bộ lọc</p>
          </div>
        )}
      </div>

      {/* Daily Breakdown Tables - Show only first 7 */}
      {dailyBreakdown.slice(0, maxDailyTables).map((dayData, dayIndex) => {
        // Calculate daily totals
        const dayTotals = dayData.items.reduce((acc, item) => ({
          mess: acc.mess + (item.mess_cmt || 0),
          cpqc: acc.cpqc + (item.cpqc || 0),
          orders: acc.orders + (item.orders || 0),
          ordersReal: acc.ordersReal + (item.soDonThucTe || 0),
          revenue: acc.revenue + (item.revenue || 0),
          revenueReal: acc.revenueReal + (item.dsChotThucTe || 0)
        }), { mess: 0, cpqc: 0, orders: 0, ordersReal: 0, revenue: 0, revenueReal: 0 });

        // Pagination for this day
        const currentPage = dailyPages[dayIndex] || 1;
        const totalPages = Math.ceil(dayData.items.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = dayData.items.slice(startIndex, endIndex);

        const handlePageChange = (newPage) => {
          setDailyPages(prev => ({ ...prev, [dayIndex]: newPage }));
        };

        return (
          <div key={dayIndex} className="bg-white rounded-lg shadow-md overflow-hidden">
            <h3 className="bg-gray-100 text-gray-800 text-base font-bold px-4 py-3 border-b border-gray-300">
              Ngày {dayData.dateStr} - Tổng {dayData.items.length} dòng
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">STT</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Team</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Marketing</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Sản phẩm</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Thị trường</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Ca</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Số Mess</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">CPQC</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Số Đơn</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-blue-100 uppercase border border-gray-400 whitespace-nowrap">Số Đơn (TT)</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Doanh số</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-blue-100 uppercase border border-gray-400 whitespace-nowrap">DS (TT)</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Tỉ lệ chốt</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-blue-100 uppercase border border-gray-400 whitespace-nowrap">TL chốt (TT)</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Giá Mess</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">CPS</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">%CP/DS</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Giá TB Đơn</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Daily Total Row */}
                  <tr className="bg-green-600 text-white font-bold">
                    <td className="px-2 py-2 text-xs border border-gray-400" colSpan="6">TỔNG NGÀY</td>
                    <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(dayTotals.mess)}</td>
                    <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(dayTotals.cpqc)}</td>
                    <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(dayTotals.orders)}</td>
                    <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(dayTotals.ordersReal)}</td>
                    <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(dayTotals.revenue)}</td>
                    <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(dayTotals.revenueReal)}</td>
                    <td className="px-2 py-2 text-xs text-center border border-gray-400">
                      {formatPercent(dayTotals.mess ? dayTotals.orders / dayTotals.mess : 0)}
                    </td>
                    <td className="px-2 py-2 text-xs text-center border border-gray-400">
                      {formatPercent(dayTotals.mess ? dayTotals.ordersReal / dayTotals.mess : 0)}
                    </td>
                    <td className="px-2 py-2 text-xs text-right border border-gray-400">
                      {formatCurrency(dayTotals.mess ? dayTotals.cpqc / dayTotals.mess : 0)}
                    </td>
                    <td className="px-2 py-2 text-xs text-right border border-gray-400">
                      {formatCurrency(dayTotals.orders ? dayTotals.cpqc / dayTotals.orders : 0)}
                    </td>
                    <td className="px-2 py-2 text-xs text-center border border-gray-400">
                      {formatPercent(dayTotals.revenue ? dayTotals.cpqc / dayTotals.revenue : 0)}
                    </td>
                    <td className="px-2 py-2 text-xs text-right border border-gray-400">
                      {formatCurrency(dayTotals.orders ? dayTotals.revenue / dayTotals.orders : 0)}
                    </td>
                  </tr>

                  {/* Daily Data Rows - Paginated */}
                  {paginatedItems.map((item, itemIndex) => {
                    const actualIndex = startIndex + itemIndex;
                    const closingRate = item.mess_cmt ? item.orders / item.mess_cmt : 0;
                    const closingRateReal = item.mess_cmt ? (item.soDonThucTe || 0) / item.mess_cmt : 0;
                    const giaMess = item.mess_cmt ? item.cpqc / item.mess_cmt : 0;
                    const cps = item.orders ? item.cpqc / item.orders : 0;
                    const cpds = item.revenue ? item.cpqc / item.revenue : 0;
                    const giaTBDon = item.orders ? item.revenue / item.orders : 0;

                    return (
                      <tr key={actualIndex} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{actualIndex + 1}</td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{item.team}</td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{item.name}</td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{item.product}</td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{item.market}</td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 border border-gray-300 whitespace-nowrap">{item.shift}</td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatNumber(item.mess_cmt)}</td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(item.cpqc)}</td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatNumber(item.orders)}</td>
                        <td className="px-2 py-2 text-xs font-medium text-blue-600 text-right border border-gray-300 whitespace-nowrap">{formatNumber(item.soDonThucTe || 0)}</td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(item.revenue)}</td>
                        <td className="px-2 py-2 text-xs font-medium text-blue-600 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(item.dsChotThucTe || 0)}</td>
                        <td className={`px-2 py-2 text-xs font-medium text-center border border-gray-300 whitespace-nowrap ${
                          closingRate > 0.1 ? 'bg-green-100 text-green-800' : closingRate > 0.05 ? 'bg-yellow-100 text-yellow-800' : ''
                        }`}>
                          {formatPercent(closingRate)}
                        </td>
                        <td className={`px-2 py-2 text-xs font-medium text-center border border-gray-300 whitespace-nowrap ${
                          closingRateReal > 0.1 ? 'bg-green-100 text-green-800' : closingRateReal > 0.05 ? 'bg-yellow-100 text-yellow-800' : ''
                        }`}>
                          {formatPercent(closingRateReal)}
                        </td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(giaMess)}</td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(cps)}</td>
                        <td className={`px-2 py-2 text-xs font-medium text-center border border-gray-300 whitespace-nowrap ${
                          cpds > 0.33 ? 'bg-yellow-100 text-yellow-800' : ''
                        }`}>
                          {formatPercent(cpds)}
                        </td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 text-right border border-gray-300 whitespace-nowrap">{formatCurrency(giaTBDon)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Hiển thị <span className="font-medium">{startIndex + 1}</span> đến{' '}
                  <span className="font-medium">{Math.min(endIndex, dayData.items.length)}</span> trong tổng số{' '}
                  <span className="font-medium">{dayData.items.length}</span> dòng
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    ← Trước
                  </button>
                  
                  {/* Page numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      // Show first, last, current, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              currentPage === page
                                ? 'bg-primary text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-2 py-1 text-gray-500">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
