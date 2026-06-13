import { createSlice } from "@reduxjs/toolkit";

import { TOKEN_KEY } from "../../Utils/Constants";

const savedToken = localStorage.getItem(TOKEN_KEY);

const initialState = {
  token: savedToken || "",
  authUser: null,
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
    },
    setUserProfile: (state, action) => {
      state.authUser = action.payload;
    },
    setUserList: (state, action) => {
      state.users = action.payload;
    },
    logoutUser: (state) => {
      state.token = "";
      state.authUser = null;

      localStorage.removeItem(TOKEN_KEY);
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
