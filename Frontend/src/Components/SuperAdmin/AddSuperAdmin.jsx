import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import Error from "../Common/Error";
import { addUser } from "../../Redux/User/UserSlice";
import { USER_REGISTER } from "../../Utils/Constants";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import SuperAdminForm from "./SuperAdminForm";

const AddSuperAdmin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "admin",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(USER_REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "User add failed");
        return;
      }

      dispatch(addUser(data.user));
      navigate("/super-admins");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-[440px] mx-auto w-full flex flex-col gap-6 md:gap-8">
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Add Super Admin
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Create a new super admin profile
                </p>
              </div>

              <div className="grid gap-4">
                <Error message={error} />

                <SuperAdminForm
                  formData={formData}
                  buttonText={loading ? "Adding..." : "Add Super Admin"}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddSuperAdmin;
