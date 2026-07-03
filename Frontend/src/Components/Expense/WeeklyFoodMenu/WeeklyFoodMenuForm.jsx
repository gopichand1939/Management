import { Building2, CalendarDays, Trash2, UtensilsCrossed } from "lucide-react";

import Button from "../../Common/Button";
import PageLoader from "../../Common/PageLoader";

const selectClassName = `
  w-full
  border-0
  bg-transparent
  text-slate-800
  outline-none
  text-sm
`;

const getCellKey = (dayOrder, mealTypeId) => {
  return `${dayOrder}_${mealTypeId}`;
};

const getGridTemplateColumns = (mealTypesCount) => {
  return `100px repeat(${mealTypesCount}, minmax(0, 1fr))`;
};

const getMealHeaderStyle = (name = "") => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("break") || lowerName.includes("morning")) {
    return "bg-amber-50/90 border-amber-100/60 text-amber-900";
  }
  if (lowerName.includes("lunch") || lowerName.includes("noon") || lowerName.includes("afternoon")) {
    return "bg-sky-50/90 border-sky-100/60 text-sky-900";
  }
  if (lowerName.includes("dinner") || lowerName.includes("night")) {
    return "bg-indigo-50/90 border-indigo-100/60 text-indigo-900";
  }
  return "bg-slate-100/80 border-slate-200 text-slate-800";
};

const getMealIconColor = (name = "") => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("break") || lowerName.includes("morning")) return "text-amber-500";
  if (lowerName.includes("lunch") || lowerName.includes("noon") || lowerName.includes("afternoon")) return "text-sky-500";
  if (lowerName.includes("dinner") || lowerName.includes("night")) return "text-indigo-500";
  return "text-orange-500";
};

const WeeklyFoodMenuForm = ({
  selectedInstitutionId,
  institutions = [],
  showInstitutionField = false,
  loadingInstitutions = false,
  days = [],
  mealTypes = [],
  cellMap = {},
  onInstitutionChange,
  onCellChange,
  onDeleteItem,
  onSubmit,
  buttonText = "Save Weekly Menu",
  disabled = false,
  loadingGrid = false,
  readOnly = false,
}) => {
  return (
    <form
      className="bg-white border border-slate-100 rounded-2xl w-full p-4 md:p-5 shadow-sm"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100/80 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight">
              Weekly Food Menu Grid
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Configure food items day-wise and meal-type-wise.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {showInstitutionField && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Institution:
                </span>
                <div className="flex min-h-[38px] w-64 items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-400 bg-white shadow-sm focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10">
                  <Building2 size={14} className="text-slate-400 shrink-0" />
                  <select
                    id="weekly_food_menu_institution_id"
                    value={selectedInstitutionId || ""}
                    onChange={onInstitutionChange}
                    disabled={disabled || loadingInstitutions}
                    className={selectClassName}
                  >
                    <option value="">
                      {loadingInstitutions ? "Loading..." : "Select institution"}
                    </option>
                    {institutions.map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.institution_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selectedInstitutionId && mealTypes.length > 0 && (
              <div className="flex gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-600">
                  {days.length} Days
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  {mealTypes.length} Meal Types
                </span>
              </div>
            )}
          </div>
        </div>

        {!selectedInstitutionId ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            Select an institution to load weekly food menu configuration.
          </div>
        ) : loadingGrid ? (
          <div className="flex justify-center rounded-2xl border border-slate-100 bg-slate-50 px-5 py-10">
            <PageLoader />
          </div>
        ) : mealTypes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            No active meal types found for this institution. Add active meal types first.
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-1.5 [scrollbar-width:thin] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: getGridTemplateColumns(mealTypes.length),
                }}
              >
                <div className="rounded-xl bg-orange-100/80 border border-orange-200/50 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-orange-800 flex items-center justify-center">
                  Day
                </div>

                {mealTypes.map((mealType) => (
                  <div
                    key={mealType.id}
                    className={`rounded-xl border px-3 py-2 text-left transition-all duration-200 ${getMealHeaderStyle(mealType.meal_type_name)}`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider">
                        <UtensilsCrossed size={12} className={getMealIconColor(mealType.meal_type_name)} />
                        {mealType.meal_type_name}
                      </span>
                      <span className="text-[10px] font-bold opacity-80 uppercase tracking-wide">
                        {mealType.meal_type_code}
                      </span>
                    </div>
                  </div>
                ))}

                {days.map((day) => (
                  <div key={day.day_order} className="contents">
                    <div className="rounded-xl border-l-4 border-l-orange-500 border-y border-r border-slate-200/60 bg-orange-50/15 p-1.5 flex flex-col justify-center gap-0.5 shadow-sm">
                      <div className="flex items-center gap-1">
                        <CalendarDays size={11} className="text-orange-500 shrink-0" />
                        <span className="text-[12px] font-black text-slate-800 uppercase tracking-wide">
                          {day.day_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] font-extrabold text-orange-700 bg-orange-100/60 rounded px-1.5 py-0.5 inline-block uppercase tracking-wider">
                          Day {day.day_order}
                        </span>
                      </div>
                    </div>

                    {mealTypes.map((mealType) => {
                      const cellKey = getCellKey(day.day_order, mealType.id);
                      const cellData = cellMap[cellKey] || {};

                      return (
                        <div
                          key={cellKey}
                          className="relative group/cell rounded-xl border border-slate-200/60 bg-white p-1.5 shadow-sm transition-all duration-200 hover:border-orange-350 hover:shadow-md focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100/50"
                        >
                          {readOnly ? (
                            <div className="min-h-[50px] whitespace-pre-wrap break-words rounded-lg border-0 bg-transparent px-1.5 py-1 text-[12px] font-bold text-slate-800 leading-normal">
                              {cellData.food_items || <span className="font-normal text-slate-400/70 italic">Empty</span>}
                            </div>
                          ) : (
                            <div className="flex flex-col h-full">
                              <textarea
                                value={cellData.food_items || ""}
                                placeholder={`Enter ${mealType.meal_type_name.toLowerCase()} menu...`}
                                onChange={(event) => {
                                  onCellChange(day, mealType, event.target.value);
                                }}
                                disabled={disabled}
                                rows={2}
                                className={`w-full min-h-[50px] resize-none rounded-lg border-0 bg-transparent py-1 pl-1.5 ${cellData.id ? "pr-7" : "pr-1.5"} text-[12px] font-bold text-slate-800 leading-normal outline-none placeholder:text-slate-400/70 placeholder:font-normal placeholder:italic focus:ring-0 disabled:opacity-60`}
                              />

                              {cellData.id && onDeleteItem && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteItem({ ...cellData, day, mealType })}
                                  title="Delete menu item"
                                  className="absolute right-1.5 top-1.5 z-10 flex h-6.5 w-6.5 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-500 opacity-60 transition-all duration-200 hover:bg-red-100 hover:text-red-600 hover:scale-105 hover:opacity-100 md:opacity-0 md:group-hover/cell:opacity-100 focus:opacity-100"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!readOnly && (
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={disabled || !selectedInstitutionId || loadingGrid || mealTypes.length === 0}
            >
              {buttonText}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
};

export default WeeklyFoodMenuForm;
