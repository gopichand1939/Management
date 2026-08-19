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
  Building2
} from "lucide-react";

import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import Button from "../../Common/Button";
import DeleteCatalogCategory from "./DeleteCatalogCategory";
import {
  CATALOG_CATEGORY_LIST,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const CatalogCategoryMaster = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || !authUser?.institution_id;

  // State
  const [categories, setCategories] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id ? String(authUser.institution_id) : ""
  );
  
  const [loading, setLoading] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [activeDeleteCategory, setActiveDeleteCategory] = useState(null);
  const [toast, setToast] = useState(null);
  const [apiError, setApiError] = useState("");

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

  // Retrieve toast notifications from route state redirects
  useEffect(() => {
    if (location.state?.toastMessage) {
      setToast({
        message: location.state.toastMessage,
        type: location.state.toastType || "success",
      });
      // Clear route state redirection params
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Fetch institutions if user is super admin
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

  // Sync selected institution with sessionStorage
  useEffect(() => {
    if (selectedInstitutionId) {
      sessionStorage.setItem("selected_institution_id", selectedInstitutionId);
    }
  }, [selectedInstitutionId]);

  // Load and fetch categories list
  const fetchCategories = async (page = 1) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) return;

    setLoading(true);
    setApiError("");
    try {
      const response = await fetch(CATALOG_CATEGORY_LIST, {
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
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setApiError(data.message || "Failed to load categories");
        setCategories([]);
        return;
      }

      setCategories(data.data || []);
      setCurrentPage(data.pagination?.page || 1);
      setTotalPages(data.pagination?.pages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      setApiError(err.message || "Failed to load categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when institution, search or page changes
  useEffect(() => {
    fetchCategories(currentPage);
  }, [selectedInstitutionId, authUser, currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCategories(1);
  };

  const handleInstitutionChange = (e) => {
    setSelectedInstitutionId(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Dismiss Toast helper
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
                  Category Master
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  Manage categories for Catalog items
                </p>
              </div>

              <Button
                onClick={() => navigate("/catalog-management/category-master/add")}
                className="flex items-center gap-1.5"
              >
                <Plus size={16} />
                Add Category
              </Button>
            </div>

            {/* Filter and search bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm mb-6">
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] max-w-md">
                <div className="flex min-h-[40px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 transition-all duration-200 bg-white shadow-sm">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search by category name or code..."
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
                        setTimeout(() => fetchCategories(1), 0);
                      }}
                      className="hover:text-slate-600 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </form>

              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Institution:</span>
                  <div className="flex min-h-[40px] items-center gap-3 rounded-xl border border-slate-200 px-3 py-1 text-slate-400 bg-white shadow-sm font-semibold text-xs">
                    <Building2 size={14} className="text-slate-400" />
                    <select
                      value={selectedInstitutionId}
                      onChange={handleInstitutionChange}
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
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
                <div className="h-12 w-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-4">
                  <Search size={22} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">No Categories Found</h3>
                <p className="text-xs text-slate-500 font-semibold max-w-sm">
                  {searchText 
                    ? "Try adjusting your search criteria or clear the search text to see all records." 
                    : "No catalog categories have been defined for this institution yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-black uppercase text-slate-400 tracking-wider">
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Category Name</th>
                        <th className="px-6 py-4">Category Code</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-xs text-slate-700">
                      {categories.map((category) => (
                        <tr key={category.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-500">#{category.id}</td>
                          <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                            {category.category_name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-slate-500 uppercase">
                              {category.category_code || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-[280px] truncate text-slate-500 font-medium">
                            {category.description || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              category.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-slate-100 text-slate-600 border border-slate-150"
                            }`}>
                              {category.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/catalog-management/category-master/view/${category.id}`)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => navigate(`/catalog-management/category-master/edit/${category.id}`)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                                title="Edit Category"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setActiveDeleteCategory(category)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 hover:border-rose-100 transition cursor-pointer"
                                title="Delete Category"
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
                      Showing {categories.length} of {totalCount} categories
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
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

      {/* Delete confirmation modal */}
      {activeDeleteCategory && (
        <DeleteCatalogCategory
          category={activeDeleteCategory}
          onClose={() => setActiveDeleteCategory(null)}
          onDeleted={() => fetchCategories(currentPage)}
          setToast={setToast}
        />
      )}
    </div>
  );
};

export default CatalogCategoryMaster;
