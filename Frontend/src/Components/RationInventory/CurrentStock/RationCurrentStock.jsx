import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

import Button from "../../Common/Button";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import SearchBar from "../../Common/SearchBar";
import StatusBadge from "../../Common/StatusBadge";
import Table from "../../Common/Table";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import {
  RATION_CURRENT_STOCK_LIST,
  RATION_CURRENT_STOCK_SUMMARY,
  GET_INSTITUTION_LIST,
  GET_CATEGORY,
  GET_UNIT,
  TOKEN_KEY,
} from "../../../Utils/Constants";

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

const RationCurrentStock = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);

  const isSuperAdmin = authUser?.role === "super_admin" || !authUser?.institution_id;
  const [stockList, setStockList] = useState([]);
  const [summaryData, setSummaryData] = useState({
    total_items: 0,
    in_stock_items: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
    total_stock_quantity: 0,
    total_inventory_value: 0
  });

  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [toast, setToast] = useState(null);

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id
      ? String(authUser.institution_id)
      : (sessionStorage.getItem("selected_institution_id") || "")
  );

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedStockStatus, setSelectedStockStatus] = useState("");
  const [selectedItemStatus, setSelectedItemStatus] = useState("active");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    if (location.state?.toastMessage) {
      setToast({
        message: location.state.toastMessage,
        type: location.state.toastType || "success",
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch institutions for super admin
  useEffect(() => {
    const getInstitutions = async () => {
      if (!isSuperAdmin) return;
      setLoadingInstitutions(true);
      try {
        const response = await fetch(GET_INSTITUTION_LIST, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Failed to load institutions");
          return;
        }

        const list = data.institutions || data.data || [];
        setInstitutions(list);

        if (!selectedInstitutionId && list.length === 1) {
          const firstInstId = String(list[0].id);
          setSelectedInstitutionId(firstInstId);
          sessionStorage.setItem("selected_institution_id", firstInstId);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [isSuperAdmin]);

  // Fetch Category and Unit Dropdowns
  useEffect(() => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) return;

    const fetchFilters = async () => {
      try {
        const catRes = await fetch(GET_CATEGORY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ institution_id: Number(instId) }),
        });
        const catData = await catRes.json();
        if (catRes.ok) setCategories(catData.data || []);

        const unitRes = await fetch(GET_UNIT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ institution_id: Number(instId) }),
        });
        const unitData = await unitRes.json();
        if (unitRes.ok) setUnits(unitData.data || []);
      } catch (err) {
        console.error("Failed to load category/unit filters", err);
      }
    };

    fetchFilters();
  }, [selectedInstitutionId, authUser]);

  // Load Current Stock List and Summary
  const fetchCurrentStockData = async (page = currentPage) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) {
      setStockList([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Fetch List
      const listResponse = await fetch(RATION_CURRENT_STOCK_LIST, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: Number(instId),
          page,
          limit: 10,
          search: searchText,
          category_id: selectedCategoryId ? Number(selectedCategoryId) : null,
          unit_id: selectedUnitId ? Number(selectedUnitId) : null,
          stock_status: selectedStockStatus,
          item_status: selectedItemStatus,
        }),
      });

      const listData = await listResponse.json();
      if (!listResponse.ok) {
        setError(listData.message || "Failed to fetch current stock list");
        return;
      }

      setStockList(listData.data || []);
      setTotalPages(listData.pagination?.pages || 1);
      setTotalRecords(listData.pagination?.total || 0);

      // 2. Fetch Summary
      setLoadingSummary(true);
      const summaryResponse = await fetch(RATION_CURRENT_STOCK_SUMMARY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: Number(instId)
        }),
      });

      const summaryDataRes = await summaryResponse.json();
      if (summaryResponse.ok) {
        setSummaryData(summaryDataRes.data || {
          total_items: 0,
          in_stock_items: 0,
          low_stock_items: 0,
          out_of_stock_items: 0,
          total_stock_quantity: 0,
          total_inventory_value: 0
        });
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchCurrentStockData(currentPage);
  }, [
    selectedInstitutionId,
    authUser,
    currentPage,
    selectedCategoryId,
    selectedUnitId,
    selectedStockStatus,
    selectedItemStatus,
  ]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchCurrentStockData(1);
  };

  const handleInstitutionChange = (e) => {
    const instId = e.target.value;
    setSelectedInstitutionId(instId);
    sessionStorage.setItem("selected_institution_id", instId);
    setCurrentPage(1);
  };

  // Construct table columns & data
  const columns = [
    // { key: "serial_number", label: "S.No" },
    { key: "item_image", label: "Image" },
    { key: "item_name", label: "Item Name" },
    { key: "sku_id", label: "SKU ID" },
    // { key: "barcode", label: "Barcode" },
    { key: "category_name", label: "Category" },
    // { key: "unit_code", label: "Unit" },
    { key: "current_stock", label: "Current Stock" },
    { key: "minimum_stock", label: "Min Stock" },
    // { key: "reorder_quantity", label: "Reorder Qty" },
    { key: "stock_value", label: "Stock Value" },
    { key: "stock_status", label: "Stock Status" },
    // { key: "last_transaction", label: "Last Transaction" },
    { key: "actions", label: "Actions" },
  ];

  const tableData = stockList.map((stock, index) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    return {
      ...stock,
      serial_number: (currentPage - 1) * 10 + index + 1,
      item_image: (
        <img
          src={stock.image_url || "/placeholder-item.png"}
          alt={stock.item_name}
          className="h-10 w-10 rounded-lg object-cover border border-slate-100 error-fallback"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&auto=format&fit=crop";
          }}
        />
      ),
      current_stock: `${parseFloat(stock.current_stock || 0)}`,
      minimum_stock: `${parseFloat(stock.minimum_stock || 0)}`,
      reorder_quantity: `${parseFloat(stock.reorder_quantity || 0)}`,
      stock_value: formatCurrency(stock.stock_value),
      stock_status: (
        <span className={`inline-flex items-center rounded-xl px-3 py-1 text-xs font-black border shadow-sm ${stock.stock_status === "in_stock"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : stock.stock_status === "low_stock"
              ? "bg-amber-500 text-white border-amber-600 animate-pulse font-extrabold uppercase tracking-wider"
              : "bg-rose-600 text-white border-rose-700 font-extrabold uppercase tracking-wider"
          }`}>
          {stock.stock_status === "in_stock" ? "In Stock" : stock.stock_status === "low_stock" ? "Low Stock" : "Out of Stock"}
        </span>
      ),
      last_transaction: formatDate(stock.last_transaction_date),
      actions: (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigate(`/ration-inventory/current-stock/view/${stock.item_id}`, { state: { institution_id: instId } })}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="View Stock Details"
          >
            <Eye size={14} />
          </button>
        </div>
      ),
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                Current Stock
              </h1>
              <p className="mt-1 text-sm text-slate-500 font-medium">
                View current ration inventory stock counts and values
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={() => fetchCurrentStockData(currentPage)}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          </div>

          <Error message={error} />

          {/* Toast Notification */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border p-4 shadow-lg transition-all ${toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : "bg-red-50 text-red-800 border-red-100"
              }`}>
              {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-bold">{toast.message}</span>
            </div>
          )}

          {/* Summary Dashboard Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Items</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{loadingSummary ? "..." : summaryData.total_items}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">In Stock</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{loadingSummary ? "..." : summaryData.in_stock_items}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Low Stock</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{loadingSummary ? "..." : summaryData.low_stock_items}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left">
              <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Out of Stock</div>
              <div className="text-2xl font-black text-red-650 mt-1">{loadingSummary ? "..." : summaryData.out_of_stock_items}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left col-span-2 md:col-span-1">
              <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Total Inventory Value</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{loadingSummary ? "..." : formatCurrency(summaryData.total_inventory_value)}</div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col">

            {/* Toolbar */}
            <div className="flex flex-col gap-4 border-b border-slate-50 p-5 md:flex-row md:items-center">

              {/* Left search */}
              <div className="flex flex-1 items-center gap-2">
                <form onSubmit={handleSearchSubmit} className="w-full max-w-sm flex items-center">
                  <SearchBar
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by name, SKU, barcode..."
                  />
                  <button type="submit" className="hidden" />
                </form>
              </div>

              {/* Filters Block */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Institution Select Dropdown */}
                {isSuperAdmin && (
                  <div className="relative">
                    <select
                      value={selectedInstitutionId}
                      onChange={handleInstitutionChange}
                      disabled={loadingInstitutions}
                      className="h-10 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-xs font-bold text-slate-700 hover:border-slate-300 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                    >
                      <option value="">Select Institution</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.institution_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Category Filter */}
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>

                {/* Unit Filter */}
                <select
                  value={selectedUnitId}
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                >
                  <option value="">All Units</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unit_name}
                    </option>
                  ))}
                </select>

                {/* Stock Status Filter */}
                <select
                  value={selectedStockStatus}
                  onChange={(e) => {
                    setSelectedStockStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                >
                  <option value="">All Stock Statuses</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>

                {/* Item Active/Inactive Filter */}
                <select
                  value={selectedItemStatus}
                  onChange={(e) => {
                    setSelectedItemStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition"
                >
                  <option value="active">Active Items</option>
                  <option value="inactive">Inactive Items</option>
                  <option value="">All Items</option>
                </select>
              </div>

            </div>

            {/* Table Listing */}
            {loading ? (
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

export default RationCurrentStock;
