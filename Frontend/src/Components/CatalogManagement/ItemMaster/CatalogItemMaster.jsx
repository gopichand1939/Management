import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Eye, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle,
  Building2,
  Layers,
  Barcode,
  Upload,
  Download,
  FileText
} from "lucide-react";

import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import Button from "../../Common/Button";
import DeleteCatalogItem from "./DeleteCatalogItem";
import {
  CATALOG_ITEM_LIST,
  CATALOG_CATEGORY_DROPDOWN,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
  CATALOG_ITEM_IMPORT,
  CATALOG_ITEM_EXPORT,
  CATALOG_ITEM_TEMPLATE,
} from "../../../Utils/Constants";

const CatalogItemMaster = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || !authUser?.institution_id;

  // State parameters
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id ? String(authUser.institution_id) : ""
  );
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [activeDeleteItem, setActiveDeleteItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [apiError, setApiError] = useState("");

  // CSV Import States
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [importError, setImportError] = useState("");
  
  const [goToPageInput, setGoToPageInput] = useState("");

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) {
        pages.push("...");
      }
      const start = Math.max(2, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  // Retrieve routing alerts
  useEffect(() => {
    if (location.state?.toastMessage) {
      setToast({
        message: location.state.toastMessage,
        type: location.state.toastType || "success",
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Load institutions list for Super Admins
  useEffect(() => {
    const fetchInstitutions = async () => {
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
        if (response.ok) {
          const list = data.institutions || data.data || [];
          setInstitutions(list);
          if (list.length > 0 && !selectedInstitutionId) {
            setSelectedInstitutionId(String(list[0].id));
            sessionStorage.setItem("selected_institution_id", String(list[0].id));
          }
        }
      } catch (err) {
        console.error("Failed to load institutions:", err);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    fetchInstitutions();
  }, [isSuperAdmin]);

  // Sync selection with sessionStorage
  useEffect(() => {
    if (selectedInstitutionId) {
      sessionStorage.setItem("selected_institution_id", selectedInstitutionId);
    }
  }, [selectedInstitutionId]);

  // Load category filters list based on active institution
  useEffect(() => {
    const loadCategories = async () => {
      const instId = authUser?.institution_id || selectedInstitutionId;
      if (!instId) return;

      try {
        const catRes = await fetch(CATALOG_CATEGORY_DROPDOWN, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ institution_id: Number(instId) }),
        });
        const catData = await catRes.json();
        if (catRes.ok) {
          setCategories(catData.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch category list:", err);
      }
    };

    loadCategories();
  }, [selectedInstitutionId, authUser]);

  // Fetch paginated catalog items list
  const fetchItems = async (page = 1) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) return;

    setLoading(true);
    setApiError("");
    try {
      const response = await fetch(CATALOG_ITEM_LIST, {
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
          category_id: categoryFilter ? Number(categoryFilter) : null,
          status: "active",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setApiError(data.message || "Failed to load catalog items");
        setItems([]);
        return;
      }

      setItems(data.data || []);
      setCurrentPage(data.pagination?.page || 1);
      setTotalPages(data.pagination?.pages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      setApiError(err.message || "Failed to load items");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-run search/query when filters change
  useEffect(() => {
    fetchItems(currentPage);
  }, [selectedInstitutionId, authUser, categoryFilter, currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchItems(1);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleExportCsv = async () => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) return;

    try {
      const response = await fetch(CATALOG_ITEM_EXPORT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ institution_id: Number(instId) }),
      });

      if (!response.ok) {
        throw new Error("Failed to export items");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clover_inventory_${instId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setToast({ message: "Export completed successfully", type: "success" });
    } catch (err) {
      setToast({ message: err.message || "Export failed", type: "error" });
    }
  };

  const handleDownloadTemplate = async (format = "csv") => {
    try {
      const response = await fetch(`${CATALOG_ITEM_TEMPLATE}?format=${format}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to download template");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "excel" ? "clover_inventory_template.xlsx" : "clover_inventory_template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ message: err.message || "Failed to download template", type: "error" });
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportError("");
    setImportStats(null);

    const instId = authUser?.institution_id || selectedInstitutionId;
    const fData = new FormData();
    fData.append("file", selectedFile);
    if (instId) {
      fData.append("institution_id", String(instId));
    }

    try {
      const response = await fetch(CATALOG_ITEM_IMPORT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: fData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to parse inventory file");
      }

      setImportStats({
        total: data.summary?.total || 0,
        inserted: data.summary?.inserted || 0,
        updated: data.summary?.updated || 0,
        failed: data.summary?.failed || 0,
        errors: data.errors || [],
      });
      setToast({ message: "Import parsed successfully!", type: "success" });
    } catch (err) {
      setImportError(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  if (!authUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex-1 p-6 md:p-8">
          {/* Toast Alert */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border transition-all duration-300 ${
              toast.type === "success" 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}>
              {toast.type === "error" && <AlertCircle size={18} />}
              <span className="text-sm font-semibold">{toast.message}</span>
              <button 
                onClick={() => setToast(null)}
                className="ml-2 hover:opacity-75"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="mx-auto max-w-[1280px]">
            {/* Header section */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex flex-col gap-1 text-left">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Item Master
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  Catalog product definitions, Clover details, and stock
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setImportModalOpen(true)}
                  variant="secondary"
                  className="flex items-center gap-1.5 hover:!bg-slate-100"
                >
                  <Upload size={16} />
                  Import CSV
                </Button>

                <Button
                  onClick={handleExportCsv}
                  variant="secondary"
                  className="flex items-center gap-1.5 hover:!bg-slate-100"
                >
                  <Download size={16} />
                  Export CSV
                </Button>

                <Button
                  onClick={() => navigate("/catalog-management/barcode-printing")}
                  variant="secondary"
                  className="flex items-center gap-1.5 hover:!bg-slate-100"
                >
                  <Barcode size={16} />
                  Print Labels
                </Button>

                <Button
                  onClick={() => navigate("/catalog-management/item-master/add")}
                  className="flex items-center gap-1.5"
                >
                  <Plus size={16} />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Filter and search bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm mb-6">
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] max-w-sm">
                <div className="flex min-h-[40px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 transition-all duration-200 bg-white shadow-sm">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search by name, SKU, or code..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 text-sm font-medium"
                  />
                  {searchText && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchText("");
                        setCurrentPage(1);
                        setTimeout(() => fetchItems(1), 0);
                      }}
                      className="hover:text-slate-600 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-4">
                {/* Category Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Category:</span>
                  <div className="flex min-h-[40px] items-center gap-3 rounded-xl border border-slate-200 px-3 py-1 text-slate-400 bg-white shadow-sm font-semibold text-xs">
                    <Layers size={14} className="text-slate-400" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="border-0 bg-transparent text-slate-800 outline-none text-xs"
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Institution:</span>
                    <div className="flex min-h-[40px] items-center gap-3 rounded-xl border border-slate-200 px-3 py-1 text-slate-400 bg-white shadow-sm font-semibold text-xs">
                      <Building2 size={14} className="text-slate-400" />
                      <select
                        value={selectedInstitutionId}
                        onChange={(e) => {
                          setSelectedInstitutionId(e.target.value);
                          setCurrentPage(1);
                        }}
                        disabled={loadingInstitutions}
                        className="border-0 bg-transparent text-slate-800 outline-none text-xs"
                      >
                        <option value="">Select Institution</option>
                        {institutions.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.institution_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error or Empty views */}
            {apiError && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-800 mb-6 flex gap-2 items-center justify-start text-left">
                <AlertCircle size={18} className="shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {/* List and Table Grid */}
            {loading ? (
              <div className="flex justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <PageLoader />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
                <div className="h-12 w-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-4">
                  <Search size={22} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">No Items Found</h3>
                <p className="text-xs text-slate-500 font-semibold max-w-sm">
                  {searchText || categoryFilter
                    ? "Try adjusting your search criteria or clear the filters to see all records." 
                    : "No products have been added to this catalog template yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-black uppercase text-slate-400 tracking-wider">
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Item Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">Cost</th>
                        <th className="px-6 py-4">SKU / Code</th>
                        <th className="px-6 py-4">Stock</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-xs text-slate-700">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-500">#{item.id}</td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                              {item.alternate_name && (
                                <div className="text-[10px] text-slate-400 mt-0.5">Alt: {item.alternate_name}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-500">
                            {item.category_name || <span className="italic opacity-60">None</span>}
                          </td>
                          <td className="px-6 py-4 font-black text-slate-900">
                            ${parseFloat(item.price || 0).toFixed(2)}
                            {item.price_unit ? <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">per {item.price_unit}</span> : ""}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-500">
                            ${parseFloat(item.cost || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 font-mono uppercase text-slate-500">
                            <div>{item.sku || "—"}</div>
                            {item.product_code && item.product_code !== item.sku && (
                              <div className="text-[10px] opacity-75 mt-0.5">Code: {item.product_code}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              item.quantity <= 0 
                                ? "bg-rose-50 text-rose-700 border border-rose-100" 
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}>
                              {item.quantity || 0} units
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/catalog-management/item-master/view/${item.id}`)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => navigate(`/catalog-management/item-master/edit/${item.id}`)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                                title="Edit Item"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setActiveDeleteItem(item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 hover:border-rose-100 transition cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 flex-wrap gap-4 text-xs font-semibold text-slate-500">
                    <span>
                      Showing {items.length} of {totalCount} items
                    </span>                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition cursor-pointer"
                      >
                        Previous
                      </button>
                      
                      {getPageNumbers().map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (p !== "...") handlePageChange(p);
                          }}
                          className={`rounded-lg px-3 py-1.5 font-bold transition ${
                            p === "..." ? "cursor-default text-slate-400" : "cursor-pointer"
                          } ${
                            currentPage === p
                              ? "bg-orange-500 text-white shadow-sm"
                              : p === "..."
                              ? ""
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                          disabled={p === "..."}
                        >
                          {p}
                        </button>
                      ))}
 
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition cursor-pointer"
                      >
                        Next
                      </button>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const pageNum = parseInt(goToPageInput, 10);
                          if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                            handlePageChange(pageNum);
                            setGoToPageInput("");
                          }
                        }}
                        className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3.5"
                      >
                        <span className="text-[11px] font-bold text-slate-400">Go to page:</span>
                        <input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={goToPageInput}
                          onChange={(e) => setGoToPageInput(e.target.value)}
                          className="w-12 rounded-lg border border-slate-200 px-1.5 py-1 text-center font-bold text-slate-700 focus:border-orange-400 focus:outline-hidden text-xs"
                          placeholder={currentPage}
                        />
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {activeDeleteItem && (
        <DeleteCatalogItem
          item={activeDeleteItem}
          onClose={() => setActiveDeleteItem(null)}
          onDeleted={() => fetchItems(currentPage)}
          setToast={setToast}
        />
      )}

      {/* Import CSV Modal Overlay */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-[540px] overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <h3 className="text-base font-bold text-slate-950">Import Clover Inventory CSV</h3>
              <button 
                onClick={() => { 
                  setImportModalOpen(false); 
                  setImportStats(null); 
                  setImportError(""); 
                  setSelectedFile(null); 
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {importStats ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-800 text-sm font-semibold">
                  <h4 className="font-bold text-base mb-2">Import Completed!</h4>
                  <p>Processed {importStats.total} rows from the file.</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 font-medium">
                    <li>Inserted new items: {importStats.inserted}</li>
                    <li>Updated existing items: {importStats.updated}</li>
                    <li>Failed rows: {importStats.failed}</li>
                  </ul>
                </div>
                {importStats.errors && importStats.errors.length > 0 && (
                  <div className="max-h-[160px] overflow-y-auto border border-rose-150 bg-rose-50/40 p-3.5 rounded-xl text-xs font-semibold text-rose-800">
                    <h5 className="font-black uppercase tracking-wider mb-2 text-rose-900">Warnings & Errors:</h5>
                    <ul className="list-decimal pl-4 space-y-1">
                      {importStats.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end mt-2">
                  <Button onClick={() => { 
                    setImportModalOpen(false); 
                    setImportStats(null); 
                    setSelectedFile(null);
                    fetchItems(1); 
                  }}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 text-left">
                {/* Step 1: Download Template */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-slate-900">1. Get the Clover Template</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                        Download the blank spreadsheet template with the correct column configuration for Clover POS.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadTemplate("excel")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition shadow-xs cursor-pointer"
                        >
                          <Download size={14} className="text-emerald-600" />
                          Download Excel (.xlsx)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadTemplate("csv")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition shadow-xs cursor-pointer"
                        >
                          <Download size={14} className="text-blue-600" />
                          Download CSV (.csv)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Upload File */}
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Upload size={16} className="text-orange-500" />
                    2. Upload Completed Spreadsheet
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">
                    Once your spreadsheet is ready, upload it below. New items will be added, and matching SKUs/Product Codes will be merged.
                  </p>
                  
                  <div className="border-2 border-dashed border-slate-200 hover:border-orange-400 bg-slate-50/30 rounded-2xl p-6 text-center cursor-pointer transition relative">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-1">
                        <Barcode size={20} />
                      </div>
                      <span className="text-xs font-bold text-slate-750">
                        {selectedFile ? selectedFile.name : "Click or Drag to Upload CSV or Excel file"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Supports standard Clover format (.csv, .xlsx, .xls)"}
                      </span>
                    </div>
                  </div>
                </div>

                {importError && (
                  <div className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <Button variant="secondary" onClick={() => setImportModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleImportSubmit} disabled={!selectedFile || importing}>
                    {importing ? "Importing..." : "Upload & Import"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogItemMaster;
