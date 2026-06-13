import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoutes from "./ProtectedRoutes";
import Dashboard from "../Pages/Dashboard/Dashboard";
import LoginPage from "../Pages/Login/LoginPage";
import RegisterPage from "../Pages/Register/RegisterPage";
import AddUserPage from "../Pages/User/AddUserPage";
import EditUserPage from "../Pages/User/EditUserPage";
import UserPage from "../Pages/User/UserPage";
import ViewUserPage from "../Pages/User/ViewUserPage";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoutes />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<UserPage />} />
        <Route path="/users/add" element={<AddUserPage />} />
        <Route path="/users/edit/:id" element={<EditUserPage />} />
        <Route path="/users/view/:id" element={<ViewUserPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
