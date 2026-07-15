import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, CheckCircle2, AlertCircle, X, ChevronDown } from "lucide-react";

import ActionPopOver from "../../Common/ActionPopOver";
import Button from "../../Common/Button";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import SearchBar from "../../Common/SearchBar";
import StatusBadge from "../../Common/StatusBadge";
import Table from "../../Common/Table";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import DeleteRationUnit from "./DeleteRationUnit";
import {
  RATION_UNIT_DELETE,
  RATION_UNIT_LIST,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";
import {
  hasMenuAction,
  MENU_ACTIONS,
} from "../../../Utils/MenuPermissions";

const columns = [
  { key: "serial_number", label: "S.No" },
  { key: "unit_name", label: "Unit Name" },
  { key: "unit_code", label: "Unit Code" },
  { key: "allow_decimal_text", label: "Allow Decimal" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "created_date", label: "Created Date" },
];

const routePath = "/ration-inventory/unit-master";

const formatDate = (value) => {
  if (!value) {
    return "-";
  }
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return String(value);
  }
};

const RationUnitMaster = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);
  const canCreate = hasMenuAction(authUser, routePath, MENU_ACTIONS.CREATE);
  const canEdit = hasMenuAction(authUser, routePath, MENU_ACTIONS.EDIT);
  const canView = hasMenuAction(authUser, routePath, MENU_ACTIONS.VIEW);
  const canDelete = hasMenuAction(authUser, routePath, MENU_ACTIONS.DELETE);

  const isSuperAdmin = authUser?.role === "super_admin" || !authUser?.institution_id;
  const [units, setUnits] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteUnit, setDeleteUnit] = useState(null);
  const [toast, setToast] = useState(null);

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
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const getInstitutions = async () => {
      if (!isSuperAdmin) {
        return;
      }

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

  const getUnitList = async (page = currentPage) => {
    const institutionId = authUser?.institution_id || selectedInstitutionId;

    if (!institutionId) {
      setUnits([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(RATION_UNIT_LIST, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: institutionId ? Number(institutionId) : undefined,
          page,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Ration unit list failed");
        return;
      }

      setUnits(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalRecords(data.pagination?.total || 0);
    } catch (apiError) {
      setError(apiError.message || "Ration unit list failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUnitList(currentPage);
  }, [selectedInstitutionId, authUser, currentPage]);

  const filteredUnits = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    if (!term) {
      return units;
    }

    return units.filter((unit) => {
      return (
        unit.unit_name?.toLowerCase().includes(term) ||
        unit.unit_code?.toLowerCase().includes(term) ||
        unit.description?.toLowerCase().includes(term) ||
        unit.status?.toLowerCase().includes(term)
      );
    });
  }, [units, searchText]);

  const tableData = filteredUnits.map((unit, index) => {
    return {
      ...unit,
      serial_number: index + 1,
      allow_decimal_text: unit.allow_decimal ? "Yes" : "No",
      created_date: formatDate(unit.created_at),
      status: <StatusBadge label={unit.status || "active"} />,
    };
  });

  const handleDelete = async () => {
    if (!deleteUnit) {
      return;
    }

    setActionLoadingId(deleteUnit.id);
    setError("");

    try {
      const response = await fetch(RATION_UNIT_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: deleteUnit.id,
          institution_id: authUser?.institution_id || selectedInstitutionId ? Number(authUser.institution_id || selectedInstitutionId) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || "Unit delete failed";
        setError(message);
        setToast({ message, type: "error" });
        return;
      }

      setToast({ message: "Ration unit deleted successfully", type: "success" });
      setDeleteUnit(null);
      await getUnitList(currentPage);
    } catch (apiError) {
      const message = apiError.message || "Unit delete failed";
      setError(message);
      setToast({ message, type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderActions = (unit) => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ActionPopOver
          onView={canView ? () => navigate(`${routePath}/view/${unit.id}`, { state: { institution_id: instId } }) : null}
          onEdit={canEdit ? () => navigate(`${routePath}/edit/${unit.id}`, { state: { institution_id: instId } }) : null}
          onDelete={canDelete ? () => setDeleteUnit(unit) : null}
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
                    Unit Master
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage ration unit records
                  </p>
                </div>

                {canCreate && (
                  <Button icon={Plus} onClick={() => navigate(`${routePath}/add`)}>
                    Add Unit
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <SearchBar
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search unit..."
                />

                {isSuperAdmin && (
                  <div className="relative w-full max-w-[240px] sm:ml-auto">
                    <select
                      id="institution_filter"
                      value={selectedInstitutionId}
                      onChange={(e) => {
                        setSelectedInstitutionId(e.target.value);
                        sessionStorage.setItem("selected_institution_id", e.target.value);
                        setCurrentPage(1);
                      }}
                      disabled={loadingInstitutions}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all duration-150 cursor-pointer appearance-none"
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
                      <ChevronDown size={14} className="stroke-[2.5]" />
                    </div>
                  </div>
                )}
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

      <DeleteRationUnit
        unit={deleteUnit}
        loading={actionLoadingId === deleteUnit?.id}
        onClose={() => setDeleteUnit(null)}
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

export default RationUnitMaster;
