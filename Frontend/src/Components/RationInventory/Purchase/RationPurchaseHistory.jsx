import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  LayoutDashboard,
  Search,
  Printer,
  Ban,
  Check,
  Eye,
  Edit,
  Trash2
} from "lucide-react";

import Button from "../../Common/Button";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import SearchBar from "../../Common/SearchBar";
import Table from "../../Common/Table";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import DeleteDraftRationPurchase from "./DeleteDraftRationPurchase";
import CompleteRationPurchase from "./CompleteRationPurchase";
import CancelRationPurchase from "./CancelRationPurchase";

import {
  RATION_PURCHASE_LIST,
  GET_INSTITUTION_LIST,
  TOKEN_KEY
} from "../../../Utils/Constants";
import {
  hasMenuAction,
  MENU_ACTIONS
} from "../../../Utils/MenuPermissions";

const columns = [
  { key: "serial_number", label: "S.No" },
  { key: "purchase_number", label: "Purchase No" },
  { key: "created_at", label: "Created At" },
  { key: "supplier_name", label: "Supplier" },
  { key: "supplier_invoice_number", label: "Invoice No" },
  { key: "total_items", label: "Total Items" },
  { key: "grand_total", label: "Grand Total" },
  { key: "paid_amount", label: "Paid" },
  { key: "balance_amount", label: "Balance" },
  { key: "payment_status", label: "Payment Status" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

const routePath = "/ration-inventory/purchases";

const selectClassName = `
  min-h-[42px]
  pl-3
  pr-8
  py-2
  bg-slate-50
  border
  border-slate-200
  rounded-xl
  text-xs
  text-slate-800
  outline-none
  focus:bg-white
  focus:border-orange-500/50
  focus:ring-2
  focus:ring-orange-500/10
  transition-all
  duration-150
  cursor-pointer
  appearance-none
`;

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

const formatCurrency = (val) => {
  return `₹${parseFloat(val || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const RationPurchaseHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);

  const canCreate = hasMenuAction(authUser, routePath, MENU_ACTIONS.CREATE);
  const canEdit = hasMenuAction(authUser, routePath, MENU_ACTIONS.EDIT);
  const canView = hasMenuAction(authUser, routePath, MENU_ACTIONS.VIEW);
  const canDelete = hasMenuAction(authUser, routePath, MENU_ACTIONS.DELETE);

  const isSuperAdmin = authUser?.role === "super_admin" || !authUser?.institution_id;
  const [purchases, setPurchases] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modal actions
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showComplete, setShowComplete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

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
        if (!response.ok) {
          setError(data.message || "Institution list failed");
          return;
        }

        const institutionList = data.institutions || data.data || [];
        setInstitutions(institutionList);

        if (!selectedInstitutionId && institutionList.length === 1) {
          const firstInstId = String(institutionList[0].id);
          setSelectedInstitutionId(firstInstId);
          sessionStorage.setItem("selected_institution_id", firstInstId);
        }
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [isSuperAdmin]);

  const getPurchaseHistoryList = async (page = currentPage) => {
    const institutionId = authUser?.institution_id || selectedInstitutionId;

    if (!institutionId) {
      setPurchases([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(RATION_PURCHASE_LIST, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: institutionId ? Number(institutionId) : undefined,
          page,
          limit: 10,
          search: searchText,
          status: statusFilter,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Ration purchases fetch failed");
        return;
      }

      setPurchases(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalRecords(data.pagination?.total || 0);
    } catch (apiError) {
      setError(apiError.message || "Ration purchases fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPurchaseHistoryList(currentPage);
  }, [selectedInstitutionId, authUser, currentPage, statusFilter]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    getPurchaseHistoryList(1);
  };

  const handleActionSuccess = (message) => {
    setShowComplete(false);
    setShowCancel(false);
    setShowDelete(false);
    setSelectedPurchase(null);
    setToast({ message, type: "success" });
    getPurchaseHistoryList(currentPage);
  };

  const tableData = purchases.map((purchase, index) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    const purchaseId = purchase.purchase_id || purchase.id;
    return {
      ...purchase,
      serial_number: (currentPage - 1) * 10 + index + 1,
      supplier_name: purchase.supplier?.supplier_name || purchase.supplier_name,
      supplier_invoice_number: purchase.invoice_number || purchase.supplier_invoice_number,
      total_items: purchase.items?.length || purchase.total_items || 0,
      created_at: purchase.created_at ? new Date(purchase.created_at).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }) : (purchase.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric"
      }) : "-"),
      grand_total: formatCurrency(purchase.grand_total),
      paid_amount: formatCurrency(purchase.paid_amount),
      balance_amount: formatCurrency(purchase.balance_amount),
      payment_status: (
        <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold border ${
          purchase.payment_status === "paid"
            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
            : purchase.payment_status === "partially_paid"
            ? "bg-blue-50 text-blue-600 border-blue-100"
            : "bg-red-50 text-red-650 border-red-100"
        }`}>
          {purchase.payment_status?.replace("_", " ")}
        </span>
      ),
      status: (
        <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold border ${
          purchase.status === "completed"
            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
            : purchase.status === "cancelled"
            ? "bg-red-50 text-red-600 border-red-100"
            : "bg-amber-50 text-amber-600 border-amber-100"
        }`}>
          {purchase.status}
        </span>
      ),
      actions: (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => navigate(`/ration-inventory/purchases/view/${purchaseId}`, { state: { institution_id: instId } })}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="View Details"
          >
            <Eye size={14} />
          </button>

          {/* Draft Specific Actions */}
          {purchase.status === "draft" && (
            <>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => navigate(`/ration-inventory/purchases/edit/${purchaseId}`, { state: { institution_id: instId } })}
                  className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  title="Edit Draft"
                >
                  <Edit size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedPurchase(purchase);
                  setShowComplete(true);
                }}
                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Complete Purchase"
              >
                <Check size={14} />
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPurchase(purchase);
                    setShowDelete(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  title="Delete Draft"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}

          {/* Completed Specific Actions */}
          {purchase.status === "completed" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setSelectedPurchase(purchase);
                  setShowCancel(true);
                }}
                className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Cancel Purchase"
              >
                <Ban size={14} />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/ration-inventory/purchases/view/${purchaseId}`)}
                className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Print Invoice"
              >
                <Printer size={14} />
              </button>
            </>
          )}
        </div>
      )
    };
  });

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-2 lg:pt-3 pb-6 px-4 md:px-6">
            <div className="mx-auto w-full max-w-6xl flex flex-col gap-3">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                <div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight">
                    Purchase History
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage and audit ration inventory purchases
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="secondary" icon={LayoutDashboard} onClick={() => navigate("/ration-inventory/purchases")}>
                    Dashboard
                  </Button>
                  {canCreate && (
                    <Button icon={Plus} onClick={() => navigate("/ration-inventory/purchases/new")}>
                      New Purchase
                    </Button>
                  )}
                </div>
              </div>

              {/* Filters toolbar */}
              <div className="flex flex-col gap-3 border border-slate-100 bg-white p-4 rounded-2xl shadow-sm">
                <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full">
                  <div className="relative flex-1 min-w-[200px]">
                    <SearchBar
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search purchase number or supplier..."
                      className="w-full"
                    />
                    <button type="submit" className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 cursor-pointer">
                      <Search size={16} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
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
                        <option value="draft">Draft</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                        <ChevronDown size={12} />
                      </div>
                    </div>

                    {/* Institution Filter */}
                    {isSuperAdmin && (
                      <div className="relative">
                        <select
                          value={selectedInstitutionId}
                          onChange={(e) => {
                            setSelectedInstitutionId(e.target.value);
                            sessionStorage.setItem("selected_institution_id", e.target.value);
                            setCurrentPage(1);
                          }}
                          disabled={loadingInstitutions}
                          className={selectClassName}
                        >
                          <option value="">
                            {loadingInstitutions
                              ? "Loading institutions..."
                              : "Select Institution"}
                          </option>
                          {institutions.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                              {inst.institution_name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                          <ChevronDown size={12} />
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

      {/* Action Modals */}
      {selectedPurchase && showComplete && (
        <CompleteRationPurchase
          purchase={selectedPurchase}
          onClose={() => {
            setSelectedPurchase(null);
            setShowComplete(false);
          }}
          onSuccess={() => handleActionSuccess("Ration purchase order completed successfully.")}
        />
      )}

      {selectedPurchase && showCancel && (
        <CancelRationPurchase
          purchase={selectedPurchase}
          onClose={() => {
            setSelectedPurchase(null);
            setShowCancel(false);
          }}
          onSuccess={() => handleActionSuccess("Ration purchase order cancelled successfully.")}
        />
      )}

      {selectedPurchase && showDelete && (
        <DeleteDraftRationPurchase
          purchase={selectedPurchase}
          onClose={() => {
            setSelectedPurchase(null);
            setShowDelete(false);
          }}
          onSuccess={() => handleActionSuccess("Draft purchase order deleted successfully.")}
        />
      )}

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

export default RationPurchaseHistory;
