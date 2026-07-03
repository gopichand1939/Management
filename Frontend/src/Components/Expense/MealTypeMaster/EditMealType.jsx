import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import MealTypeForm from "./MealTypeForm";
import {
  GET_INSTITUTION_LIST,
  MEAL_TYPE_EDIT,
  MEAL_TYPE_VIEW,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const EditMealType = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";
  const isSuperAdmin = authUser?.role === "super_admin";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [formData, setFormData] = useState({
    institution_id: authUser?.institution_id ? String(authUser.institution_id) : "",
    meal_type_name: "",
    meal_type_code: "",
    display_order: "",
    start_time: "",
    end_time: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    const getMealTypeAndInstitutions = async () => {
      setLoadingPage(true);
      setError("");

      try {
        const requests = [
          fetch(MEAL_TYPE_VIEW, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id,
              institution_id: authUser?.institution_id || undefined,
            }),
          }),
        ];

        if (isSuperAdmin) {
          requests.push(
            fetch(GET_INSTITUTION_LIST, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({}),
            })
          );
        }

        const [mealTypeResponse, institutionResponse] = await Promise.all(requests);
        const mealTypeData = await mealTypeResponse.json();

        if (!mealTypeResponse.ok) {
          setError(mealTypeData.message || "Meal type fetch failed");
          return;
        }

        if (institutionResponse) {
          const institutionData = await institutionResponse.json();

          if (!institutionResponse.ok) {
            setError(institutionData.message || "Institution list failed");
            return;
          }

          setInstitutions(institutionData.data || []);
        }

        const mealType = mealTypeData.mealType;

        setFormData({
          institution_id: String(mealType.institution_id || authUser?.institution_id || ""),
          meal_type_name: mealType.meal_type_name || "",
          meal_type_code: mealType.meal_type_code || "",
          display_order: String(mealType.display_order ?? ""),
          start_time: mealType.start_time || "",
          end_time: mealType.end_time || "",
          description: mealType.description || "",
          is_active: Boolean(mealType.is_active),
        });
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingPage(false);
      }
    };

    getMealTypeAndInstitutions();
  }, [authUser?.institution_id, id, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    if (institutions.length > 0 || loadingPage) {
      return;
    }

    const getInstitutions = async () => {
      setLoadingInstitutions(true);

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

        setInstitutions(data.data || []);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [institutions.length, isSuperAdmin, loadingPage]);

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
      const response = await fetch(MEAL_TYPE_EDIT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          ...formData,
          display_order: Number(formData.display_order),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || "Meal type update failed";
        setError(message);
        alert(message);
        return;
      }

      navigate("/expense/meal-type-master");
    } catch (apiError) {
      const message = apiError.message || "Meal type update failed";
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
                  Edit Meal Type
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Update meal type master details
                </p>
              </div>

              <Error message={error} />

              {loadingPage ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                <MealTypeForm
                  formData={formData}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  buttonText={loading ? "Saving..." : "Update Meal Type"}
                  institutions={institutions}
                  showInstitutionField={!isPgAdmin}
                  loadingInstitutions={loadingInstitutions}
                  disabled={loading}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditMealType;
