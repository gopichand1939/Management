import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, CheckCircle2, AlertCircle, X, ChevronDown, Image as ImageIcon, Search } from "lucide-react";

import ActionPopOver from "../../Common/ActionPopOver";
import Button from "../../Common/Button";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import SearchBar from "../../Common/SearchBar";
import StatusBadge from "../../Common/StatusBadge";
import Table from "../../Common/Table";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import DeleteRationItem from "./DeleteRationItem";
import {
  RATION_ITEM_LIST,
  RATION_ITEM_DELETE,
  GET_CATOGORY,
  GET_UNIT,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";
import {
  hasMenuAction,
  MENU_ACTIONS,
} from "../../../Utils/MenuPermissions";

const columns = [
  { key: "serial_number", label: "S.No" },
  { key: "image", label: "Image" },
  { key: "item_name", label: "Item Name" },
  { key: "item_code", label: "Item Code" },
  { key: "sku_id", label: "SKU ID" },
  { key: "barcode", label: "Barcode" },
  { key: "category_name", label: "Category" },
  { key: "unit_name", label: "Unit" },
  { key: "minimum_stock", label: "Min Stock" },
  { key: "maximum_stock", label: "Max Stock" },
  { key: "reorder_quantity", label: "Reorder Qty" },
  { key: "default_price", label: "Default Price" },
  { key: "gst", label: "GST %" },
  { key: "batch_tracking", label: "Batch Tracking" },
  { key: "expiry_tracking", label: "Expiry Tracking" },
  { key: "status", label: "Status" },
  { key: "created_by", label: "Created By" },
  { key: "created_date", label: "Created Date" },
];

const routePath = "/ration-inventory/item-master";

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

const RationItemMaster = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);
  const canCreate = hasMenuAction(authUser, routePath, MENU_ACTIONS.CREATE);
  const canEdit = hasMenuAction(authUser, routePath, MENU_ACTIONS.EDIT);
  const canView = hasMenuAction(authUser, routePath, MENU_ACTIONS.VIEW);
  const canDelete = hasMenuAction(authUser, routePath, MENU_ACTIONS.DELETE);

  const isSuperAdmin = authUser?.role === "super_admin" || !authUser?.institution_id;
  
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [toast, setToast] = useState(null);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id 
      ? String(authUser.institution_id) 
      : (sessionStorage.getItem("selected_institution_id") || "")
  );

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
      const timer = setTimeout(() => setToast(null), 3050);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch institutions
  useEffect(() => {
    const getInstitutions = async () => {
      if (!isSuperAdmin) return;
      setLoadingInstitutions(true);
      setError("");
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
        if (response.ok) {
          const list = data.institutions || data.data || [];
          setInstitutions(list);
          if (!selectedInstitutionId && list.length === 1) {
            const firstId = String(list[0].id);
            setSelectedInstitutionId(firstId);
            sessionStorage.setItem("selected_institution_id", firstId);
          }
        } else {
          setError(data.message || "Institution list failed");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [isSuperAdmin]);

  // Fetch dropdown categories & units
  useEffect(() => {
    const loadDropdownFilters = async () => {
      const instId = authUser?.institution_id || selectedInstitutionId;
      if (!instId) {
        setCategories([]);
        setUnits([]);
        return;
      }
      try {
        const catRes = await fetch(GET_CATOGORY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ institution_id: Number(instId) }),
        });
        const catData = await catRes.json();
        if (catRes.ok) {
          setCategories(catData.categories || catData.data || []);
        }

        const unitRes = await fetch(GET_UNIT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ institution_id: Number(instId) }),
        });
        const unitData = await unitRes.json();
        if (unitRes.ok) {
          setUnits(unitData.units || unitData.data || []);
        }
      } catch (err) {
        console.error("Error loading filters dropdown:", err);
      }
    };

    loadDropdownFilters();
  }, [selectedInstitutionId, authUser]);

  const getItemList = async (page = currentPage) => {
    const institutionId = authUser?.institution_id || selectedInstitutionId;
    if (!institutionId) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(RATION_ITEM_LIST, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: Number(institutionId),
          page,
          limit: 10,
          search: searchText,
          category_id: categoryFilter ? Number(categoryFilter) : null,
          unit_id: unitFilter ? Number(unitFilter) : null,
          status: statusFilter || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Ration item list failed");
        return;
      }

      setItems(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalRecords(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message || "Ration item list failed");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on filter or page change
  useEffect(() => {
    getItemList(currentPage);
  }, [selectedInstitutionId, authUser, currentPage, categoryFilter, unitFilter, statusFilter]);

  // Debounced/Triggered search handler
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    getItemList(1);
  };

  const tableData = items.map((item, index) => {
    const defaultPrice = item.default_purchase_price !== null 
      ? `₹ ${parseFloat(item.default_purchase_price).toFixed(2)}` 
      : "₹ 0.00";
    
    return {
      ...item,
      serial_number: (currentPage - 1) * 10 + index + 1,
      image: item.image_url ? (
        <img
          src={item.image_url}
          alt={item.item_name}
          className="h-8 w-8 object-cover rounded-lg border border-slate-100 shadow-sm"
        />
      ) : (
        <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
          <ImageIcon size={14} />
        </div>
      ),
      minimum_stock: item.minimum_stock !== null ? parseFloat(item.minimum_stock) : "0",
      maximum_stock: item.maximum_stock !== null ? parseFloat(item.maximum_stock) : "-",
      reorder_quantity: item.reorder_quantity !== null ? parseFloat(item.reorder_quantity) : "-",
      default_price: defaultPrice,
      gst: `${item.gst_percentage || 0} %`,
      batch_tracking: item.batch_tracking ? "Yes" : "No",
      expiry_tracking: item.expiry_tracking ? "Yes" : "No",
      created_by: item.created_by_name || item.created_by_email || (item.created_by ? `User ID: ${item.created_by}` : "-"),
      created_date: formatDate(item.created_at),
      status: <StatusBadge label={item.status || "active"} />,
    };
  });

  const handleDelete = async () => {
    if (!deleteItem) return;

    setActionLoadingId(deleteItem.id);
    setError("");

    try {
      const response = await fetch(RATION_ITEM_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: deleteItem.id,
          institution_id: authUser?.institution_id || selectedInstitutionId ? Number(authUser.institution_id || selectedInstitutionId) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || "Ration item delete failed";
        setError(msg);
        setToast({ message: msg, type: "error" });
        return;
      }

      setToast({ message: "Ration item deleted successfully", type: "success" });
      setDeleteItem(null);
      setCurrentPage(1);
      await getItemList(1);
    } catch (err) {
      const msg = err.message || "Ration item delete failed";
      setError(msg);
      setToast({ message: msg, type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderActions = (item) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ActionPopOver
          onView={canView ? () => navigate(`${routePath}/view/${item.id}`, { state: { institution_id: instId } }) : null}
          onEdit={canEdit ? () => navigate(`${routePath}/edit/${item.id}`, { state: { institution_id: instId } }) : null}
          onDelete={canDelete ? () => setDeleteItem(item) : null}
        />
      </div>
    );
  };

  if (!authUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <PageLoader />
      </div>
    );
  }

  const selectClassName = "h-8 pl-3 pr-8 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all cursor-pointer appearance-none min-w-[120px]";

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-2 lg:pt-3 pb-6 px-4 md:px-6">
            <div className="mx-auto w-full max-w-7xl flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                <div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight">
                    Item Master
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage ration inventory items
                  </p>
                </div>

                {canCreate && (
                  <Button icon={Plus} onClick={() => navigate(`${routePath}/add`)}>
                    Add Item
                  </Button>
                )}
              </div>

              {/* Filters toolbar */}
              <div className="flex flex-col gap-3 border border-slate-100 bg-white p-4 rounded-2xl shadow-sm">
                <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full">
                  <div className="relative flex-1 min-w-[200px]">
                    <SearchBar
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search item..."
                      className="w-full"
                    />
                    <button type="submit" className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 cursor-pointer">
                      <Search size={16} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    {/* Category Filter */}
                    <div className="relative">
                      <select
                        value={categoryFilter}
                        onChange={(e) => {
                          setCategoryFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={selectClassName}
                      >
                        <option value="">All Categories</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.category_name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        <ChevronDown size={12} />
                      </div>
                    </div>

                    {/* Unit Filter */}
                    <div className="relative">
                      <select
                        value={unitFilter}
                        onChange={(e) => {
                          setUnitFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={selectClassName}
                      >
                        <option value="">All Units</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.unit_code}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        <ChevronDown size={12} />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={selectClassName}
                      >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        <ChevronDown size={12} />
                      </div>
                    </div>

                    {/* Institution selector (Super Admin Only) */}
                    {isSuperAdmin && (
                      <div className="relative min-w-[150px]">
                        <select
                          id="institution_filter"
                          value={selectedInstitutionId}
                          onChange={(e) => {
                            setSelectedInstitutionId(e.target.value);
                            sessionStorage.setItem("selected_institution_id", e.target.value);
                            setCurrentPage(1);
                          }}
                          disabled={loadingInstitutions}
                          className="h-8 pl-3 pr-8 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all duration-150 cursor-pointer appearance-none w-full"
                        >
                          <option value="">
                            {loadingInstitutions ? "Loading..." : "Select Institution"}
                          </option>
                          {institutions.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                              {inst.institution_name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                          <ChevronDown size={12} className="stroke-[2.5]" />
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <Error message={error} />

              {loading ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                <Table
                  columns={columns}
                  data={tableData}
                  renderActions={canView || canEdit || canDelete ? renderActions : null}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
                  totalRecords={totalRecords}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <DeleteRationItem
        item={deleteItem}
        loading={actionLoadingId === deleteItem?.id}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex w-[360px] items-center gap-3.5 rounded-2xl border bg-white/95 p-4.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] backdrop-blur-md ${
          toast.type === "success"
            ? "border-emerald-100 border-l-4 border-l-emerald-500"
            : "border-red-100 border-l-4 border-l-red-500"
        }`}>
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            toast.type === "success" ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
          }`}>
            {toast.type === "success" ? (
              <CheckCircle2 size={20} className="stroke-[2.5]" />
            ) : (
              <AlertCircle size={20} className="stroke-[2.5]" />
            )}
          </div>
          <div className="flex-1 text-left">
            <h4 className={`text-[10px] font-black uppercase tracking-wider ${
              toast.type === "success" ? "text-emerald-600" : "text-red-600"
            }`}>
              {toast.type === "success" ? "Success" : "Error"}
            </h4>
            <p className="mt-0.5 text-xs font-semibold text-slate-700 leading-snug">
              {toast.message}
            </p>
          </div>
          <button onClick={() => setToast(null)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100/50 text-slate-400 hover:text-slate-650 transition cursor-pointer">
            <X size={14} className="stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
};

export default RationItemMaster;
