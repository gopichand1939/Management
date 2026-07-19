export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const TOKEN_KEY = "admin_token";
export const AUTH_USER_KEY = "admin_auth_user";
export const DASHBOARD_OVERVIEW = BASE_URL + "/dashboard/overview";

export const USER_REGISTER = BASE_URL + "/super-admin/register";
export const REGISTERED_USER_LIST = BASE_URL + "/super-admin/list";

export const USER_LOGIN = BASE_URL + "/auth/login";
export const USER_PROFILE = BASE_URL + "/super-admin/profile";

export const INSTITUTION_CREATE = BASE_URL + "/institution/create";
export const INSTITUTION_LIST = BASE_URL + "/institution/list";
export const INSTITUTION_VIEW = BASE_URL + "/institution/view";
export const INSTITUTION_EDIT = BASE_URL + "/institution/edit";
export const INSTITUTION_DELETE = BASE_URL + "/institution/delete";

export const PG_ADMIN_CREATE = BASE_URL + "/pg-admin/create";
export const PG_ADMIN_LOGIN = BASE_URL + "/pg-admin/login";
export const PG_ADMIN_PROFILE = BASE_URL + "/pg-admin/profile";
export const PG_ADMIN_MY_LIST = BASE_URL + "/pg-admin/my-list";
export const PG_ADMIN_LIST = BASE_URL + "/pg-admin/list";
export const PG_ADMIN_VIEW = BASE_URL + "/pg-admin/view";
export const PG_ADMIN_EDIT = BASE_URL + "/pg-admin/edit";
export const PG_ADMIN_DELETE = BASE_URL + "/pg-admin/delete";


export const PG_ADMIN_INSTITUTION_LIST = BASE_URL + "/pg-admin/institution/list";
export const PG_ADMIN_INSTITUTION_DROPDOWN_LIST = BASE_URL + "/pg-admin/institution/dropdown/getInstitutionList";
export const PG_ADMIN_MY_INSTITUTION = BASE_URL + "/pg-admin/my-institution";

export const TENANT_CREATE = BASE_URL + "/tenant/create";
export const TENANT_ACTIVE_LIST = BASE_URL + "/tenant/active";
export const TENANT_VACANT_BEDS = BASE_URL + "/tenant/vacant-beds";
export const TENANT_PAYMENTS_LIST = BASE_URL + "/tenant/payments";
export const PAYMENT_REMINDER_LIST = BASE_URL + "/payment-reminder/list";
export const PAYMENT_REMINDER_ACTION = BASE_URL + "/payment-reminder/action";
export const PAYMENT_REMINDER_COLLECT = BASE_URL + "/payment-reminder/collect";
export const TENANT_VACATED_LIST = BASE_URL + "/tenant/vacated";
export const TENANT_VIEW = BASE_URL + "/tenant/view";
export const TENANT_EDIT = BASE_URL + "/tenant/edit";
export const TENANT_DELETE = BASE_URL + "/tenant/delete";

export const TENANT_PAYMENT_CREATE = BASE_URL + "/tenant/payment/create";
export const TENANT_PAYMENT_VERIFY = BASE_URL + "/tenant/payment/verify";
export const TENANT_BED_VIEW = BASE_URL + "/tenant/bed/view";
export const TENANT_TRANSFER = BASE_URL + "/tenant/transfer";
export const TENANT_VACATE = BASE_URL + "/tenant/vacate";
export const TENANT_ACTIVITY = BASE_URL + "/tenant/activity";
export const TENANT_HISTORY_VIEW = BASE_URL + "/tenant/history/view";
export const TENANT_STATS = BASE_URL + "/tenant/stats";


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

export const DAILY_EXPENSE_CREATE = BASE_URL + "/daily-expenses/create";
export const DAILY_EXPENSE_LIST = BASE_URL + "/daily-expenses/list";
export const DAILY_EXPENSE_VIEW = BASE_URL + "/daily-expenses/view";
export const DAILY_EXPENSE_EDIT = BASE_URL + "/daily-expenses/edit";
export const DAILY_EXPENSE_DELETE = BASE_URL + "/daily-expenses/delete";

export const RATION_CATEGORY_CREATE = BASE_URL + "/ration-category/create";
export const RATION_CATEGORY_LIST = BASE_URL + "/ration-category/list";
export const RATION_CATEGORY_VIEW = BASE_URL + "/ration-category/view";
export const RATION_CATEGORY_EDIT = BASE_URL + "/ration-category/edit";
export const RATION_CATEGORY_DELETE = BASE_URL + "/ration-category/delete";

export const RATION_UNIT_CREATE = BASE_URL + "/ration-unit/create";
export const RATION_UNIT_LIST = BASE_URL + "/ration-unit/list";
export const RATION_UNIT_VIEW = BASE_URL + "/ration-unit/view";
export const RATION_UNIT_EDIT = BASE_URL + "/ration-unit/edit";
export const RATION_UNIT_DELETE = BASE_URL + "/ration-unit/delete";

export const RATION_ITEM_CREATE = BASE_URL + "/ration-item/create";
export const RATION_ITEM_LIST = BASE_URL + "/ration-item/list";
export const GET_QR_CODE = BASE_URL + "/ration-item/get-qr-code";
export const RATION_ITEM_VIEW = BASE_URL + "/ration-item/view";
export const RATION_ITEM_EDIT = BASE_URL + "/ration-item/edit";
export const RATION_ITEM_DELETE = BASE_URL + "/ration-item/delete";
export const RATION_ITEM_NEXT_BARCODE = BASE_URL + "/ration-item/next-barcode";
export const RATION_ITEM_SCAN = BASE_URL + "/ration-item/scan";

export const GET_CATOGORY = BASE_URL + "/ration-category/dropdown";
export const GET_CATEGORY = BASE_URL + "/ration-category/dropdown";
export const GET_UNIT = BASE_URL + "/ration-unit/dropdown";

export const RATION_SUPPLIER_CREATE = BASE_URL + "/ration-supplier/create";
export const RATION_SUPPLIER_LIST = BASE_URL + "/ration-supplier/list";
export const RATION_SUPPLIER_VIEW = BASE_URL + "/ration-supplier/view";
export const RATION_SUPPLIER_EDIT = BASE_URL + "/ration-supplier/edit";
export const RATION_SUPPLIER_DELETE = BASE_URL + "/ration-supplier/delete";
export const RATION_SUPPLIER_DROPDOWN = BASE_URL + "/ration-supplier/dropdown";

export const RATION_PURCHASE_NEXT_NUMBER = BASE_URL + "/ration-purchase/next-number";
export const RATION_PURCHASE_CREATE = BASE_URL + "/ration-purchase/create";
export const RATION_PURCHASE_LIST = BASE_URL + "/ration-purchase/list";
export const RATION_PURCHASE_VIEW = BASE_URL + "/ration-purchase/view";
export const RATION_PURCHASE_EDIT = BASE_URL + "/ration-purchase/edit";
export const RATION_PURCHASE_DELETE_DRAFT = BASE_URL + "/ration-purchase/delete-draft";
export const RATION_PURCHASE_COMPLETE = BASE_URL + "/ration-purchase/complete";
export const RATION_PURCHASE_CANCEL = BASE_URL + "/ration-purchase/cancel";
export const RATION_PURCHASE_DASHBOARD = BASE_URL + "/ration-purchase/dashboard";

export const RATION_CURRENT_STOCK_LIST = BASE_URL + "/ration-current-stock/list";
export const RATION_CURRENT_STOCK_SUMMARY = BASE_URL + "/ration-current-stock/summary";
export const RATION_CURRENT_STOCK_VIEW = BASE_URL + "/ration-current-stock/view";
export const RATION_CURRENT_STOCK_HISTORY = BASE_URL + "/ration-current-stock/history";

export const RATION_KITCHEN_REQUEST_CREATE = BASE_URL + "/ration-kitchen-request/create";
export const RATION_KITCHEN_REQUEST_LIST = BASE_URL + "/ration-kitchen-request/list";
export const RATION_KITCHEN_REQUEST_VIEW = BASE_URL + "/ration-kitchen-request/view";
export const RATION_KITCHEN_REQUEST_EDIT = BASE_URL + "/ration-kitchen-request/edit";
export const RATION_KITCHEN_REQUEST_DELETE = BASE_URL + "/ration-kitchen-request/delete";
export const RATION_KITCHEN_REQUEST_APPROVE = BASE_URL + "/ration-kitchen-request/approve";
export const RATION_KITCHEN_REQUEST_REJECT = BASE_URL + "/ration-kitchen-request/reject";
export const RATION_KITCHEN_REQUEST_NEXT_NUMBER = BASE_URL + "/ration-kitchen-request/next-number";
export const RATION_KITCHEN_REQUEST_DASHBOARD = BASE_URL + "/ration-kitchen-request/dashboard";

export const RATION_STOCK_ISSUE_NEXT_NUMBER = BASE_URL + "/ration-stock-issue/next-number";
export const RATION_STOCK_ISSUE_APPROVED_REQUEST_LIST = BASE_URL + "/ration-stock-issue/approved-requests/list";
export const RATION_STOCK_ISSUE_APPROVED_REQUEST_VIEW = BASE_URL + "/ration-stock-issue/approved-requests/view";
export const RATION_STOCK_ISSUE_CREATE = BASE_URL + "/ration-stock-issue/create";
export const RATION_STOCK_ISSUE_LIST = BASE_URL + "/ration-stock-issue/list";
export const RATION_STOCK_ISSUE_VIEW = BASE_URL + "/ration-stock-issue/view";
export const RATION_STOCK_ISSUE_CANCEL = BASE_URL + "/ration-stock-issue/cancel";

export const RATION_STOCK_ADJUSTMENT_NEXT_NUMBER = BASE_URL + "/ration-stock-adjustment/next-number";
export const RATION_STOCK_ADJUSTMENT_CREATE = BASE_URL + "/ration-stock-adjustment/create";
export const RATION_STOCK_ADJUSTMENT_LIST = BASE_URL + "/ration-stock-adjustment/list";
export const RATION_STOCK_ADJUSTMENT_VIEW = BASE_URL + "/ration-stock-adjustment/view";
export const RATION_STOCK_ADJUSTMENT_CANCEL = BASE_URL + "/ration-stock-adjustment/cancel";

export const RATION_STOCK_AUDIT_NEXT_NUMBER = BASE_URL + "/ration-stock-audit/next-number";
export const RATION_STOCK_AUDIT_CREATE = BASE_URL + "/ration-stock-audit/create";
export const RATION_STOCK_AUDIT_EDIT = BASE_URL + "/ration-stock-audit/edit";
export const RATION_STOCK_AUDIT_DELETE = BASE_URL + "/ration-stock-audit/delete";
export const RATION_STOCK_AUDIT_LIST = BASE_URL + "/ration-stock-audit/list";
export const RATION_STOCK_AUDIT_VIEW = BASE_URL + "/ration-stock-audit/view";
export const RATION_STOCK_AUDIT_APPROVE = BASE_URL + "/ration-stock-audit/approve";
export const RATION_STOCK_AUDIT_REJECT = BASE_URL + "/ration-stock-audit/reject";

export const RATION_INVENTORY_DASHBOARD_SUMMARY = BASE_URL + "/ration-inventory-dashboard/summary";
export const RATION_INVENTORY_DASHBOARD_RECENT_TRANSACTIONS = BASE_URL + "/ration-inventory-dashboard/recent-transactions";
export const RATION_INVENTORY_DASHBOARD_LOW_STOCK = BASE_URL + "/ration-inventory-dashboard/low-stock";
export const RATION_INVENTORY_DASHBOARD_EXPIRY_ALERTS = BASE_URL + "/ration-inventory-dashboard/expiry-alerts";
export const GET_RESTRICTION_ADMINS = BASE_URL + "/restriction/pg-admins";
export const GET_RESTRICTION_RULES = BASE_URL + "/restriction/rules";

export const USER_ACTIVITY_LIST = BASE_URL + "/user-activity/list";
export const USER_ACTIVITY_LOGOUT = BASE_URL + "/user-activity/logout";
export const USER_ACTIVITY_TERMINATE = BASE_URL + "/user-activity/terminate";
