import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Building2, Plus } from "lucide-react";

import ActionPopOver from "../../Common/ActionPopOver";
import Button from "../../Common/Button";
import Error from "../../Common/Error";
import FilePreviewModal from "../../Common/FilePreviewModal";
import PageLoader from "../../Common/PageLoader";
import SearchBar from "../../Common/SearchBar";
import Table from "../../Common/Table";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import DeleteDailyExpense from "./DeleteDailyExpense";
import {
  DAILY_EXPENSE_DELETE,
  DAILY_EXPENSE_LIST,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";
import {
  hasMenuAction,
  MENU_ACTIONS,
} from "../../../Utils/MenuPermissions";

const columns = [
  { key: "serial_number", label: "S.No" },
  { key: "expense_title", label: "Expense Title" },
  { key: "category", label: "Category" },
  { key: "amount", label: "Amount" },
  { key: "expense_date", label: "Date" },
  { key: "expense_time", label: "Time" },
  { key: "bill_file", label: "Bill" },
];

const routePath = "/expenses/daily";

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAmount = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });
};

const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const normalizedValue = String(value).slice(0, 5);
  const [hours, minutes] = normalizedValue.split(":");
  const parsedHours = Number(hours);

  if (Number.isNaN(parsedHours)) {
    return normalizedValue;
  }

  const suffix = parsedHours >= 12 ? "PM" : "AM";
  const displayHours = parsedHours % 12 || 12;

  return `${displayHours}:${minutes} ${suffix}`;
};

const renderBillFile = (billFile, onPreview) => {
  if (!billFile?.file_url) {
    return "-";
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(billFile)}
      className="text-xs font-bold text-orange-600 hover:text-orange-700"
    >
      View Bill
    </button>
  );
};

const DailyExpensesSpend = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";
  const isSuperAdmin = authUser?.role === "super_admin";
  const canCreate = hasMenuAction(authUser, routePath, MENU_ACTIONS.CREATE);
  const canEdit = hasMenuAction(authUser, routePath, MENU_ACTIONS.EDIT);
  const canDelete = hasMenuAction(authUser, routePath, MENU_ACTIONS.DELETE);
  const [dailyExpenses, setDailyExpenses] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteDailyExpense, setDeleteDailyExpense] = useState(null);
  const [previewBill, setPreviewBill] = useState(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id ? String(authUser.institution_id) : ""
  );

  useEffect(() => {
    const getInstitutions = async () => {
      if (!isSuperAdmin) {
        return;
      }

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
          setError(data.message || "Institution list failed");
          return;
        }

        const institutionList = data.data || [];
        setInstitutions(institutionList);

        if (!selectedInstitutionId && institutionList.length === 1) {
          setSelectedInstitutionId(String(institutionList[0].id));
        }
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [isSuperAdmin, selectedInstitutionId]);

  const getDailyExpenseList = async () => {
    const institutionId = authUser?.institution_id || selectedInstitutionId;

    if ((isSuperAdmin || isPgAdmin) && !institutionId) {
      setDailyExpenses([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(DAILY_EXPENSE_LIST, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: institutionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Daily expense list failed");
        return;
      }

      setDailyExpenses(data.dailyExpenses || []);
    } catch (apiError) {
      setError(apiError.message || "Daily expense list failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && !selectedInstitutionId) {
      return;
    }

    getDailyExpenseList();
  }, [selectedInstitutionId, authUser?.institution_id, isSuperAdmin]);

  const filteredDailyExpenses = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    if (!term) {
      return dailyExpenses;
    }

    return dailyExpenses.filter((dailyExpense) => {
      return (
        dailyExpense.expense_title?.toLowerCase().includes(term) ||
        dailyExpense.category?.toLowerCase().includes(term) ||
        String(dailyExpense.amount || "").includes(term) ||
        String(dailyExpense.expense_date || "").toLowerCase().includes(term) ||
        String(dailyExpense.expense_time || "").toLowerCase().includes(term)
      );
    });
  }, [dailyExpenses, searchText]);

  const tableData = filteredDailyExpenses.map((dailyExpense, index) => {
    return {
      ...dailyExpense,
      serial_number: index + 1,
      amount: formatAmount(dailyExpense.amount),
      expense_date: formatDate(dailyExpense.expense_date),
      expense_time: formatTime(dailyExpense.expense_time),
      bill_file: renderBillFile(dailyExpense.bill_file, setPreviewBill),
    };
  });

  const handleDelete = async () => {
    if (!deleteDailyExpense) {
      return;
    }

    setActionLoadingId(deleteDailyExpense.id);
    setError("");

    try {
      const response = await fetch(DAILY_EXPENSE_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: deleteDailyExpense.id,
          institution_id: authUser?.institution_id || selectedInstitutionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || "Daily expense delete failed";
        setError(message);
        alert(message);
        return;
      }

      setDeleteDailyExpense(null);
      await getDailyExpenseList();
    } catch (apiError) {
      const message = apiError.message || "Daily expense delete failed";
      setError(message);
      alert(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderActions = (dailyExpense) => {
    return (
      <ActionPopOver
        onEdit={canEdit ? () => navigate(`${routePath}/edit/${dailyExpense.id}`) : null}
        onDelete={canDelete ? () => setDeleteDailyExpense(dailyExpense) : null}
      />
    );
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-4 lg:pt-5 pb-6 px-4 md:px-6">
            <div className="mx-auto w-full max-w-6xl flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="text-left">
                  <h1 className="text-xl font-black text-slate-800 tracking-tight">
                    Daily Expenses
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Track and manage daily operational expenses
                  </p>
                </div>

                {canCreate && (
                  <Button icon={Plus} onClick={() => navigate(`${routePath}/add`)}>
                    Add Expense
                  </Button>
                )}
              </div>

              {isSuperAdmin && (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="grid gap-1.5 md:max-w-sm">
                    <label
                      htmlFor="institution_filter"
                      className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      Institution
                    </label>

                    <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 bg-white shadow-sm">
                      <Building2 size={16} />
                      <select
                        id="institution_filter"
                        value={selectedInstitutionId}
                        onChange={(event) => setSelectedInstitutionId(event.target.value)}
                        disabled={loadingInstitutions}
                        className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none"
                      >
                        <option value="">
                          {loadingInstitutions ? "Loading institutions..." : "Select institution"}
                        </option>
                        {institutions.map((institution) => (
                          <option key={institution.id} value={institution.id}>
                            {institution.institution_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <SearchBar
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search expenses..."
              />

              <Error message={error} />

              {loading ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                <Table
                  columns={columns}
                  data={tableData}
                  renderActions={canEdit || canDelete ? renderActions : null}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <DeleteDailyExpense
        dailyExpense={deleteDailyExpense}
        loading={actionLoadingId === deleteDailyExpense?.id}
        onClose={() => setDeleteDailyExpense(null)}
        onConfirm={handleDelete}
      />

      <FilePreviewModal
        file={previewBill}
        title="Bill Preview"
        onClose={() => setPreviewBill(null)}
      />
    </div>
  );
};

export default DailyExpensesSpend;
