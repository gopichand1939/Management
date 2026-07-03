import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import Error from "../../Common/Error";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import WeeklyFoodMenuDelete from "./WeeklyFoodMenuDelete";
import WeeklyFoodMenuForm from "./WeeklyFoodMenuForm";
import {
  AUTH_USER_KEY,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
  WEEKLY_FOOD_MENU_DELETE,
  WEEKLY_FOOD_MENU_GRID,
  WEEKLY_FOOD_MENU_SAVE,
} from "../../../Utils/Constants";
import {
  hasMenuAction,
  MENU_ACTIONS,
} from "../../../Utils/MenuPermissions";

const routePath = "/expense/weekly-food-menu";

const createCellMap = (menus = []) => {
  const nextCellMap = {};

  menus.forEach((menu) => {
    nextCellMap[`${menu.day_order}_${menu.meal_type_id}`] = {
      ...menu,
      food_items: menu.food_items || "",
    };
  });

  return nextCellMap;
};

const WeeklyFoodMenu = () => {
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);
  const savedAuthUser = JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null");
  const currentUser = authUser || savedAuthUser;
  const isPgAdmin = currentUser?.role === "pg_admin";
  const showInstitutionField = !isPgAdmin;
  const fixedInstitutionId = currentUser?.institution_id
    ? String(currentUser.institution_id)
    : "";
  const canManageGrid =
    hasMenuAction(currentUser, routePath, MENU_ACTIONS.CREATE) ||
    hasMenuAction(currentUser, routePath, MENU_ACTIONS.EDIT);
  const canViewGrid =
    hasMenuAction(currentUser, routePath, MENU_ACTIONS.VIEW) || canManageGrid;
  const [days, setDays] = useState([]);
  const [mealTypes, setMealTypes] = useState([]);
  const [cellMap, setCellMap] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [error, setError] = useState("");
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [deleteMenuItem, setDeleteMenuItem] = useState(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    String(location.state?.institutionId || fixedInstitutionId || "")
  );

  useEffect(() => {
    if (fixedInstitutionId && !selectedInstitutionId) {
      setSelectedInstitutionId(fixedInstitutionId);
    }
  }, [fixedInstitutionId, selectedInstitutionId]);

  useEffect(() => {
    const getInstitutions = async () => {
      if (!showInstitutionField) {
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

        const institutionList = data.data || [];
        setInstitutions(institutionList);

        if (!selectedInstitutionId && institutionList.length === 1) {
          setSelectedInstitutionId(String(institutionList[0].id));
        }
      } catch (apiError) {
        setError(apiError.message || "Institution list failed");
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [showInstitutionField, selectedInstitutionId]);

  useEffect(() => {
    const getWeeklyFoodMenuGrid = async () => {
      const institutionId = fixedInstitutionId || selectedInstitutionId;

      if (!institutionId) {
        setDays([]);
        setMealTypes([]);
        setCellMap({});
        return;
      }

      setLoadingGrid(true);
      setError("");

      try {
        const response = await fetch(WEEKLY_FOOD_MENU_GRID, {
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
          setError(data.message || "Weekly food menu grid fetch failed");
          setDays([]);
          setMealTypes([]);
          setCellMap({});
          return;
        }

        setDays(data.days || []);
        setMealTypes(data.mealTypes || []);
        setCellMap(createCellMap(data.menus || []));
      } catch (apiError) {
        setError(apiError.message || "Weekly food menu grid fetch failed");
      } finally {
        setLoadingGrid(false);
      }
    };

    getWeeklyFoodMenuGrid();
  }, [fixedInstitutionId, selectedInstitutionId]);

  const handleInstitutionChange = (event) => {
    setSelectedInstitutionId(event.target.value);
  };

  const handleCellChange = (day, mealType, value) => {
    const cellKey = `${day.day_order}_${mealType.id}`;

    setCellMap((currentCellMap) => ({
      ...currentCellMap,
      [cellKey]: {
        ...currentCellMap[cellKey],
        day_name: day.day_name,
        day_order: day.day_order,
        meal_type_id: mealType.id,
        food_items: value,
      },
    }));
  };

  const refreshGrid = async () => {
    const institutionId = fixedInstitutionId || selectedInstitutionId;

    if (!institutionId) {
      return;
    }

    setLoadingGrid(true);

    try {
      const response = await fetch(WEEKLY_FOOD_MENU_GRID, {
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
        setError(data.message || "Weekly food menu grid fetch failed");
        return;
      }

      setDays(data.days || []);
      setMealTypes(data.mealTypes || []);
      setCellMap(createCellMap(data.menus || []));
    } catch (apiError) {
      setError(apiError.message || "Weekly food menu grid fetch failed");
    } finally {
      setLoadingGrid(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const institutionId = fixedInstitutionId || selectedInstitutionId;

    if (!institutionId) {
      const message = "Institution id is required";
      setError(message);
      alert(message);
      return;
    }

    const menus = [];

    days.forEach((day) => {
      mealTypes.forEach((mealType) => {
        const cellData = cellMap[`${day.day_order}_${mealType.id}`];
        const foodItems = cellData?.food_items?.trim() || "";

        if (cellData?.id || foodItems) {
          menus.push({
            day_name: day.day_name,
            day_order: day.day_order,
            meal_type_id: mealType.id,
            food_items: foodItems,
          });
        }
      });
    });

    if (!menus.length) {
      const message = "Enter at least one weekly food menu item";
      setError(message);
      alert(message);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(WEEKLY_FOOD_MENU_SAVE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: institutionId,
          menus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || "Weekly food menu save failed";
        setError(message);
        alert(message);
        return;
      }

      await refreshGrid();
    } catch (apiError) {
      const message = apiError.message || "Weekly food menu save failed";
      setError(message);
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteMenuItem?.id) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(WEEKLY_FOOD_MENU_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: deleteMenuItem.id,
          institution_id: fixedInstitutionId || selectedInstitutionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || "Weekly food menu delete failed";
        setError(message);
        alert(message);
        return;
      }

      setDeleteMenuItem(null);
      await refreshGrid();
    } catch (apiError) {
      const message = apiError.message || "Weekly food menu delete failed";
      setError(message);
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-4 lg:pt-5 pb-6 px-4 md:px-6">
            <div className="mx-auto w-full max-w-7xl flex flex-col gap-4">
              {/* <div className="text-left">
                <h1 className="text-xl font-black text-slate-800 tracking-tight">
                  Weekly Food Menu Configuration
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Select institution and manage the full weekly food menu grid in one place
                </p>
              </div> */}

              <Error message={error} />

              {canViewGrid && (
                <WeeklyFoodMenuForm
                  selectedInstitutionId={selectedInstitutionId}
                  institutions={institutions}
                  showInstitutionField={showInstitutionField}
                  loadingInstitutions={loadingInstitutions}
                  days={days}
                  mealTypes={mealTypes}
                  cellMap={cellMap}
                  onInstitutionChange={handleInstitutionChange}
                  onCellChange={handleCellChange}
                  onDeleteItem={canManageGrid ? setDeleteMenuItem : null}
                  onSubmit={handleSubmit}
                  buttonText={saving ? "Saving..." : "Save Weekly Menu"}
                  disabled={saving || !canManageGrid}
                  loadingGrid={loadingGrid}
                  readOnly={!canManageGrid}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <WeeklyFoodMenuDelete
        menuItem={deleteMenuItem}
        loading={saving}
        onClose={() => setDeleteMenuItem(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default WeeklyFoodMenu;
