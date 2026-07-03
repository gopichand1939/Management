import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Building2, Plus } from "lucide-react";

import ActionPopOver from "../../Common/ActionPopOver";
import Button from "../../Common/Button";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import SearchBar from "../../Common/SearchBar";
import StatusBadge from "../../Common/StatusBadge";
import Table from "../../Common/Table";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import DeleteMealType from "./DeleteMealType";
import {
  GET_INSTITUTION_LIST,
  MEAL_TYPE_DELETE,
  MEAL_TYPE_LIST,
  MEAL_TYPE_STATUS,
  TOKEN_KEY,
} from "../../../Utils/Constants";
import {
  hasMenuAction,
  MENU_ACTIONS,
} from "../../../Utils/MenuPermissions";

const columns = [
  { key: "serial_number", label: "S.No" },
  { key: "meal_type_name", label: "Meal Type Name" },
  { key: "meal_type_code", label: "Meal Type Code" },
  { key: "display_order", label: "Display Order" },
  { key: "start_time", label: "Start Time" },
  { key: "end_time", label: "End Time" },
  { key: "status", label: "Status" },
];

const routePath = "/expense/meal-type-master";

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

const MealTypeMaster = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";
  const isSuperAdmin = authUser?.role === "super_admin";
  const canCreate = hasMenuAction(authUser, routePath, MENU_ACTIONS.CREATE);
  const canEdit = hasMenuAction(authUser, routePath, MENU_ACTIONS.EDIT);
  const canView = hasMenuAction(authUser, routePath, MENU_ACTIONS.VIEW);
  const canDelete = hasMenuAction(authUser, routePath, MENU_ACTIONS.DELETE);
  const [mealTypes, setMealTypes] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteMealType, setDeleteMealType] = useState(null);
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

  const getMealTypeList = async () => {
    const institutionId = authUser?.institution_id || selectedInstitutionId;

    if ((isSuperAdmin || isPgAdmin) && !institutionId) {
      setMealTypes([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(MEAL_TYPE_LIST, {
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
        setError(data.message || "Meal type list failed");
        return;
      }

      setMealTypes(data.mealTypes || []);
    } catch (apiError) {
      setError(apiError.message || "Meal type list failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && !selectedInstitutionId) {
      return;
    }

    getMealTypeList();
  }, [selectedInstitutionId, authUser?.institution_id, isSuperAdmin]);

  const filteredMealTypes = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    if (!term) {
      return mealTypes;
    }

    return mealTypes.filter((mealType) => {
      return (
        mealType.meal_type_name?.toLowerCase().includes(term) ||
        mealType.meal_type_code?.toLowerCase().includes(term) ||
        String(mealType.display_order || "").includes(term) ||
        String(mealType.start_time || "").toLowerCase().includes(term) ||
        String(mealType.end_time || "").toLowerCase().includes(term)
      );
    });
  }, [mealTypes, searchText]);

  const tableData = filteredMealTypes.map((mealType, index) => {
    return {
      ...mealType,
      serial_number: index + 1,
      start_time: formatTime(mealType.start_time),
      end_time: formatTime(mealType.end_time),
      status: <StatusBadge label={mealType.is_active ? "active" : "inactive"} />,
    };
  });

  const handleStatusChange = async (mealType) => {
    setActionLoadingId(mealType.id);
    setError("");

    try {
      const response = await fetch(MEAL_TYPE_STATUS, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: mealType.id,
          institution_id: authUser?.institution_id || selectedInstitutionId,
          is_active: !mealType.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || "Meal type status update failed";
        setError(message);
        alert(message);
        return;
      }

      await getMealTypeList();
    } catch (apiError) {
      const message = apiError.message || "Meal type status update failed";
      setError(message);
      alert(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteMealType) {
      return;
    }

    setActionLoadingId(deleteMealType.id);
    setError("");

    try {
      const response = await fetch(MEAL_TYPE_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: deleteMealType.id,
          institution_id: authUser?.institution_id || selectedInstitutionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || "Meal type delete failed";
        setError(message);
        alert(message);
        return;
      }

      setDeleteMealType(null);
      await getMealTypeList();
    } catch (apiError) {
      const message = apiError.message || "Meal type delete failed";
      setError(message);
      alert(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderActions = (mealType) => {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ActionPopOver
          onView={canView ? () => navigate(`${routePath}/view/${mealType.id}`) : null}
          onEdit={canEdit ? () => navigate(`${routePath}/edit/${mealType.id}`) : null}
          onDelete={canDelete ? () => setDeleteMealType(mealType) : null}
        />

        {canEdit && (
          <Button
            variant="secondary"
            onClick={() => handleStatusChange(mealType)}
            disabled={actionLoadingId === mealType.id}
          >
            {actionLoadingId === mealType.id
              ? "Updating..."
              : mealType.is_active
                ? "Inactive"
                : "Active"}
          </Button>
        )}
      </div>
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
                    Meal Type Master
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage meal type master records
                  </p>
                </div>

                {canCreate && (
                  <Button icon={Plus} onClick={() => navigate(`${routePath}/add`)}>
                    Add Meal Type
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
                placeholder="Search meal type..."
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
                  renderActions={canView || canEdit || canDelete ? renderActions : null}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <DeleteMealType
        mealType={deleteMealType}
        loading={actionLoadingId === deleteMealType?.id}
        onClose={() => setDeleteMealType(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default MealTypeMaster;
