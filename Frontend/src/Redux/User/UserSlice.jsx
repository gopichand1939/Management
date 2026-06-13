import { createSlice } from "@reduxjs/toolkit";

import { AUTH_USER_KEY, TOKEN_KEY } from "../../Utils/Constants";

const savedToken = localStorage.getItem(TOKEN_KEY);
const savedAuthUser = localStorage.getItem(AUTH_USER_KEY);

const initialState = {
  token: savedToken || "",
  authUser: savedAuthUser ? JSON.parse(savedAuthUser) : null,
  users: [],
  loading: false,
  error: "",
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserLoading: (state, action) => {
      state.loading = action.payload;
    },
    setUserError: (state, action) => {
      state.error = action.payload;
    },
    setAuthUser: (state, action) => {
      state.authUser = action.payload.user;
      state.token = action.payload.token;

      localStorage.setItem(TOKEN_KEY, action.payload.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(action.payload.user));
    },
    setUserProfile: (state, action) => {
      const nextUserProfile = {
        ...(state.authUser || {}),
        ...(action.payload || {}),
      };

      if (!nextUserProfile.menus?.length && state.authUser?.menus?.length) {
        nextUserProfile.menus = state.authUser.menus;
      }

      state.authUser = nextUserProfile;
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUserProfile));
    },
    setUserList: (state, action) => {
      state.users = action.payload;
    },
    logoutUser: (state) => {
      state.token = "";
      state.authUser = null;

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    },
    addUser: (state, action) => {
      state.users.unshift(action.payload);
    },
    editUser: (state, action) => {
      const index = state.users.findIndex((user) => user.id === action.payload.id);

      if (index !== -1) {
        state.users[index] = action.payload;
      }
    },
    deleteUser: (state, action) => {
      state.users = state.users.filter((user) => user.id !== action.payload);
    },
  },
});

export const {
  addUser,
  deleteUser,
  editUser,
  logoutUser,
  setAuthUser,
  setUserError,
  setUserList,
  setUserLoading,
  setUserProfile,
} = userSlice.actions;

export default userSlice.reducer;
