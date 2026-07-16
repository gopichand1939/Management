import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Calendar, FileText, RefreshCw } from "lucide-react";

import Button from "../../Common/Button";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import SearchBar from "../../Common/SearchBar";
import Table from "../../Common/Table";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import { RATION_CURRENT_STOCK_HISTORY, RATION_CURRENT_STOCK_VIEW, TOKEN_KEY } from "../../../Utils/Constants";

const formatCurrency = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? "₹0.00" : `₹${num.toFixed(2)}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch (e) {
    return String(value);
  }
};

const RationStockTransactionHistory = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);

  const institutionId = location.state?.institution_id || authUser?.institution_id;

  const [loadingItem, setLoadingItem] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  
  const [itemDetails, setItemDetails] = useState(null);
  const [historyList, setHistoryList] = useState([]);

  // Filter states
  const [searchText, setSearchText] = useState("");
  const [selectedTxType, setSelectedTxType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Paging states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Totals states
  const [totals, setTotals] = useState({
    current_stock: 0,
    total_in: 0,
    total_out: 0
  });

  // Fetch Item Info on mount
  useEffect(() => {
    const fetchItemInfo = async () => {
      setLoadingItem(true);
      setError("");

      try {
        const response = await fetch(RATION_CURRENT_STOCK_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item_id: Number(id),
            institution_id: institutionId ? Number(institutionId) : undefined
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Failed to fetch item details");
          return;
        }

        setItemDetails(data.data.item);
        
        // Also pre-calculate sum of in/out for local summaries from all transactions
        const historyResAll = await fetch(RATION_CURRENT_STOCK_HISTORY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item_id: Number(id),
            institution_id: institutionId ? Number(institutionId) : undefined,
            page: 1,
            limit: 1000
          }),
        });
        const historyDataAll = await historyResAll.json();
        if (historyResAll.ok) {
          const list = historyDataAll.data || [];
          const totalIn = list.reduce((sum, item) => sum + parseFloat(item.quantity_in || 0), 0);
          const totalOut = list.reduce((sum, item) => sum + parseFloat(item.quantity_out || 0), 0);
          setTotals({
            current_stock: data.data.stock?.current_stock || 0,
            total_in: totalIn,
            total_out: totalOut
          });
        }
      } catch (err) {
        setError(err.message || "An error occurred");
      } finally {
        setLoadingItem(false);
      }
    };

    if (id) fetchItemInfo();
  }, [id, institutionId]);

  // Fetch paginated history lists
  const fetchHistoryList = async (page = currentPage) => {
    if (!id) return;
    setLoadingHistory(true);
    setError("");

    try {
      const response = await fetch(RATION_CURRENT_STOCK_HISTORY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item_id: Number(id),
          institution_id: institutionId ? Number(institutionId) : undefined,
          page,
          limit: 10,
          transaction_type: selectedTxType,
          search: searchText,
          start_date: startDate ? new Date(startDate).toISOString() : null,
          end_date: endDate ? new Date(endDate + "T23:59:59").toISOString() : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to load transaction history");
        return;
      }

      setHistoryList(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalRecords(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistoryList(currentPage);
  }, [id, institutionId, currentPage, selectedTxType, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchHistoryList(1);
  };

  const columns = [
    { key: "serial_number", label: "S.No" },
    { key: "transaction_date", label: "Date & Time" },
    { key: "transaction_type", label: "Transaction Type" },
    { key: "reference_number", label: "Reference Number" },
    { key: "quantity_in", label: "Quantity In" },
    { key: "quantity_out", label: "Quantity Out" },
    { key: "unit_price", label: "Unit Price" },
    { key: "remarks", label: "Remarks" },
    { key: "created_by_user", label: "Created By" },
  ];

  const tableData = historyList.map((tx, index) => {
    return {
      ...tx,
      serial_number: (currentPage - 1) * 10 + index + 1,
      transaction_date: formatDate(tx.transaction_date),
      transaction_type: (
        <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold border ${
          tx.transaction_type.startsWith("PURCHASE") && !tx.transaction_type.includes("CANCEL")
            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
            : "bg-red-50 text-red-600 border-red-100"
        }`}>
          {tx.transaction_type}
        </span>
      ),
      reference_number: (
        <span className="flex items-center gap-1 font-bold text-slate-800">
          <FileText size={12} className="text-slate-400" />
          {tx.reference_number || "-"}
        </span>
      ),
      quantity_in: tx.quantity_in > 0 ? `+${parseFloat(tx.quantity_in)}` : "-",
      quantity_out: tx.quantity_out > 0 ? `-${parseFloat(tx.quantity_out)}` : "-",
      unit_price: formatCurrency(tx.unit_price),
      created_by_user: tx.created_by ? `User ID: ${tx.created_by}` : "System",
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-left flex items-center gap-2">
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => navigate(`/ration-inventory/current-stock/view/${id}`, { state: { institution_id: institutionId } })}
                className="!p-2.5"
              />
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Stock Ledger History
                </h1>
                {loadingItem ? (
                  <div className="h-4 w-48 bg-slate-200 animate-pulse mt-1 rounded" />
                ) : (
                  itemDetails && (
                    <p className="mt-1 text-sm text-slate-500 font-medium">
                      {itemDetails.item_name} - {itemDetails.item_code} ({itemDetails.sku_id})
                    </p>
                  )
                )}
              </div>
            </div>
            <div>
              <Button variant="secondary" icon={RefreshCw} onClick={() => fetchHistoryList(currentPage)}>
                Refresh History
              </Button>
            </div>
          </div>

          <Error message={error} />

          {/* Running Summaries */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Available Stock</div>
              <div className="text-3xl font-black text-slate-800 mt-1">{totals.current_stock}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Total Received (In)</div>
              <div className="text-3xl font-black text-emerald-600 mt-1">+{totals.total_in}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Total Reversed/Issued (Out)</div>
              <div className="text-3xl font-black text-red-600 mt-1">-{totals.total_out}</div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col">
            
            {/* Toolbar */}
            <div className="flex flex-col gap-4 border-b border-slate-50 p-5 md:flex-row md:items-center">
              
              <div className="flex flex-1 items-center gap-2">
                <form onSubmit={handleSearchSubmit} className="w-full max-w-xs flex items-center">
                  <SearchBar
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search Reference No..."
                  />
                  <button type="submit" className="hidden" />
                </form>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Date range filters */}
                <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-white text-xs font-semibold text-slate-500">
                  <Calendar size={13} className="text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="outline-none text-slate-700 bg-transparent"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="outline-none text-slate-700 bg-transparent"
                  />
                </div>

                {/* Tx type Filter */}
                <select
                  value={selectedTxType}
                  onChange={(e) => {
                    setSelectedTxType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                >
                  <option value="">All Transactions</option>
                  <option value="PURCHASE">PURCHASE</option>
                  <option value="PURCHASE_CANCEL">PURCHASE_CANCEL</option>
                </select>
              </div>

            </div>

            {/* List */}
            {loadingHistory ? (
              <div className="p-8 flex justify-center">
                <PageLoader />
              </div>
            ) : (
              <Table
                columns={columns}
                data={tableData}
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                onPageChange={(page) => setCurrentPage(page)}
              />
            )}

          </div>

        </main>
      </div>
    </div>
  );
};

export default RationStockTransactionHistory;
