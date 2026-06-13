import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Mail, Phone, UserRound } from "lucide-react";

import Button from "../Common/Button";
import Error from "../Common/Error";
import InputField from "../Common/InputField";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import {
  PG_ADMIN_EDIT,
  PG_ADMIN_INSTITUTION_DROPDOWN_LIST,
  PG_ADMIN_VIEW,
  TOKEN_KEY,
} from "../../Utils/Constants";

const EditPGAdmin = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [institutions, setInstitutions] = useState([]);

  const [formData, setFormData] = useState({
    institution_id: "",
    pg_admin_name: "",
    email: "",
    phone: "",
    status: "active",
  });

  useEffect(() => {
    const getFormData = async () => {
      try {
        const institutionResponse = await fetch(PG_ADMIN_INSTITUTION_DROPDOWN_LIST, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const institutionData = await institutionResponse.json();

        if (!institutionResponse.ok) {
          setError(institutionData.message || "Institution list failed");
          return;
        }

        setInstitutions(institutionData.institutions || []);

        const pgAdminResponse = await fetch(PG_ADMIN_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        const pgAdminData = await pgAdminResponse.json();

        if (!pgAdminResponse.ok) {
          setError(pgAdminData.message || "PG admin fetch failed");
          return;
        }

        setFormData(pgAdminData.pgAdmin);
      } catch (apiError) {
        setError(apiError.message);
      }
    };

    getFormData();
  }, [id]);

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

    try {
      const response = await fetch(PG_ADMIN_EDIT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "PG admin update failed");
        return;
      }

      navigate("/pg-admins");
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-[480px] mx-auto w-full flex flex-col gap-6">
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Edit PG Admin
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Update institution admin details
                </p>
              </div>

              <Error message={error} />

              <form
                className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm grid gap-4"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Institution
                  </label>
                  <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 bg-white shadow-sm">
                    <Building2 size={16} />
                    <select
                      className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none"
                      name="institution_id"
                      value={formData.institution_id || ""}
                      onChange={handleChange}
                    >
                      <option value="">Select institution</option>
                      {institutions.map((institution) => (
                        <option key={institution.id} value={institution.id}>
                          {institution.institution_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <InputField
                  label="PG Admin Name"
                  name="pg_admin_name"
                  value={formData.pg_admin_name || ""}
                  placeholder="PG admin name"
                  icon={UserRound}
                  onChange={handleChange}
                />

                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email || ""}
                  placeholder="pgadmin@example.com"
                  icon={Mail}
                  onChange={handleChange}
                />

                <InputField
                  label="Phone"
                  name="phone"
                  value={formData.phone || ""}
                  placeholder="Phone number"
                  icon={Phone}
                  onChange={handleChange}
                />

                <Button type="submit">Update PG Admin</Button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditPGAdmin;
