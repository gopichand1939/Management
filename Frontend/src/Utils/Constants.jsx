export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";


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

export const TOKEN_KEY = "admin_token";
export const AUTH_USER_KEY = "admin_auth_user";
