export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const TOKEN_KEY = "admin_token";
export const AUTH_USER_KEY = "admin_auth_user";
export const DASHBOARD_OVERVIEW = BASE_URL + "/dashboard/overview";

export const USER_REGISTER =BASE_URL + "/super-admin/register";
export const REGISTERED_USER_LIST =BASE_URL + "/super-admin/list";

export const USER_LOGIN =BASE_URL + "/auth/login";
export const USER_PROFILE =BASE_URL + "/super-admin/profile";

export const INSTITUTION_CREATE =BASE_URL + "/institution/create";
export const INSTITUTION_LIST =BASE_URL + "/institution/list";
export const INSTITUTION_VIEW =BASE_URL + "/institution/view";
export const INSTITUTION_EDIT =BASE_URL + "/institution/edit";
export const INSTITUTION_DELETE =BASE_URL + "/institution/delete";

export const PG_ADMIN_CREATE =BASE_URL + "/pg-admin/create";
export const PG_ADMIN_LOGIN =BASE_URL + "/pg-admin/login";
export const PG_ADMIN_PROFILE =BASE_URL + "/pg-admin/profile";
export const PG_ADMIN_MY_LIST =BASE_URL + "/pg-admin/my-list";
export const PG_ADMIN_LIST =BASE_URL + "/pg-admin/list";
export const PG_ADMIN_VIEW =BASE_URL + "/pg-admin/view";
export const PG_ADMIN_EDIT =BASE_URL + "/pg-admin/edit";
export const PG_ADMIN_DELETE =BASE_URL + "/pg-admin/delete";


export const PG_ADMIN_INSTITUTION_LIST =BASE_URL + "/pg-admin/institution/list";
export const PG_ADMIN_INSTITUTION_DROPDOWN_LIST =BASE_URL + "/pg-admin/institution/dropdown/getInstitutionList";
export const PG_ADMIN_MY_INSTITUTION =BASE_URL + "/pg-admin/my-institution";

export const TENANT_CREATE =BASE_URL + "/tenant/create";
export const TENANT_ACTIVE_LIST =BASE_URL + "/tenant/active";
export const TENANT_VACANT_BEDS =BASE_URL + "/tenant/vacant-beds";
export const TENANT_PAYMENTS_LIST =BASE_URL + "/tenant/payments";
export const TENANT_VACATED_LIST =BASE_URL + "/tenant/vacated";
export const TENANT_VIEW =BASE_URL + "/tenant/view";
export const TENANT_EDIT =BASE_URL + "/tenant/edit";
export const TENANT_DELETE =BASE_URL + "/tenant/delete";

export const TENANT_PAYMENT_CREATE =BASE_URL + "/tenant/payment/create";
export const TENANT_PAYMENT_VERIFY =BASE_URL + "/tenant/payment/verify";
export const TENANT_BED_VIEW =BASE_URL + "/tenant/bed/view";
export const TENANT_TRANSFER =BASE_URL + "/tenant/transfer";
export const TENANT_VACATE =BASE_URL + "/tenant/vacate";
export const TENANT_ACTIVITY =BASE_URL + "/tenant/activity";
export const TENANT_HISTORY_VIEW =BASE_URL + "/tenant/history/view";
export const TENANT_STATS =BASE_URL + "/tenant/stats";


export const INVENTORY_CREATE = BASE_URL + "/inventory/create";
export const INVENTORY_LIST = BASE_URL + "/inventory/list";
export const INVENTORY_VIEW = BASE_URL + "/inventory/view";
export const INVENTORY_UPDATE = BASE_URL + "/inventory/update";
export const INVENTORY_DELETE = BASE_URL + "/inventory/delete";
export const GET_INSTITUTION_LIST = BASE_URL + "/inventory/institution/list";
export const GET_FLOOR_LIST = BASE_URL + "/inventory/floor/list";
export const GET_ROOM_LIST = BASE_URL + "/inventory/room/list";


export const MEAL_TYPE_CREATE = BASE_URL + "/meal-type/create";
export const MEAL_TYPE_LIST = BASE_URL + "/meal-type/list";
export const MEAL_TYPE_ACTIVE_LIST = BASE_URL + "/meal-type/active-list";
export const MEAL_TYPE_VIEW = BASE_URL + "/meal-type/view";
export const MEAL_TYPE_EDIT = BASE_URL + "/meal-type/edit";
export const MEAL_TYPE_STATUS = BASE_URL + "/meal-type/status";
export const MEAL_TYPE_DELETE = BASE_URL + "/meal-type/delete";

export const WEEKLY_FOOD_MENU_GRID = BASE_URL + "/weekly-food-menu/grid";
export const WEEKLY_FOOD_MENU_SAVE = BASE_URL + "/weekly-food-menu/save";
export const WEEKLY_FOOD_MENU_DELETE = BASE_URL + "/weekly-food-menu/delete";
