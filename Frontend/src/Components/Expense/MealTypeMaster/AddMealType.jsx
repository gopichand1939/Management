import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import Error from "../../Common/Error";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import MealTypeForm from "./MealTypeForm";
import {
  AUTH_USER_KEY,
  GET_INSTITUTION_LIST,
  MEAL_TYPE_CREATE,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const defaultFormData = {
  institution_id: "",
  meal_type_name: "",
  meal_type_code: "",
  display_order: "",
  start_time: "",
  end_time: "",
  description: "",
  is_active: true,
};

const getInstitutionOptions = (data) => {
  if (Array.isArray(data?.institutions)) {
    return data.institutions;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const AddMealType = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";
  const showInstitutionField = authUser?.role !== "pg_admin";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [formData, setFormData] = useState({
    ...defaultFormData,
    institution_id: authUser?.institution_id ? String(authUser.institution_id) : "",
  });

  useEffect(() => {
    if (authUser?.institution_id && !formData.institution_id) {
      setFormData((currentData) => ({
        ...currentData,
        institution_id: String(authUser.institution_id),
      }));
    }
  }, [authUser?.institution_id, formData.institution_id]);

  useEffect(() => {
    const getInstitutions = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(AUTH_USER_KEY);

      if (!showInstitutionField || !token || !savedUser) {
        return;
      }

      setLoadingInstitutions(true);
      setError("");

      try {
        const response = await fetch(GET_INSTITUTION_LIST, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Institution list failed");
          return;
        }

        const institutionList = getInstitutionOptions(data);
        setInstitutions(institutionList);

        if (!formData.institution_id && institutionList.length === 1) {
          setFormData((currentData) => ({
            ...currentData,
            institution_id: String(institutionList[0].id),
          }));
        }
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [formData.institution_id, showInstitutionField]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "meal_type_code") {
      setFormData((currentData) => ({
        ...currentData,
        meal_type_code: value.toUpperCase(),
      }));
      return;
    }

    if (name === "display_order") {
      setFormData((currentData) => ({
        ...currentData,
        display_order: value.replace(/\D/g, ""),
      }));
      return;
    }

    if (name === "is_active") {
      setFormData((currentData) => ({
        ...currentData,
        is_active: value === "true",
      }));
      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.institution_id && (isSuperAdmin || isPgAdmin)) {
      const message = "Institution id is required";
      setError(message);
      alert(message);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(MEAL_TYPE_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          display_order: Number(formData.display_order),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || "Meal type create failed";
        setError(message);
        alert(message);
        return;
      }

      navigate("/expense/meal-type-master");
    } catch (apiError) {
      const message = apiError.message || "Meal type create failed";
      setError(message);
      alert(message);
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
            <div className="max-w-[720px] mx-auto w-full flex flex-col gap-6">
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Add Meal Type
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Create a new meal type master record
                </p>
              </div>

              <Error message={error} />

              <MealTypeForm
                formData={formData}
                onChange={handleChange}
                onSubmit={handleSubmit}
                buttonText={loading ? "Saving..." : "Save Meal Type"}
                institutions={institutions}
                showInstitutionField={showInstitutionField}
                loadingInstitutions={loadingInstitutions}
                disabled={loading}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddMealType;
