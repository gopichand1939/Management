export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";


export const USER_REGISTER =BASE_URL + "/user/register";
export const REGISTERED_USER_LIST =BASE_URL + "/user/list";

export const USER_LOGIN =BASE_URL + "/user/login";

export const USER_PROFILE =BASE_URL + "/user/profile";

export const TOKEN_KEY = "admin_token";
