import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import DailyExpenseForm from "./DailyExpenseForm";
import {
  DAILY_EXPENSE_EDIT,
  DAILY_EXPENSE_VIEW,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const EditDailyExpense = () => {
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
    expense_title: "",
    category: "",
    amount: "",
    expense_date: "",
    expense_time: "",
    bill_file: null,
    bill_file_file: null,
  });

  useEffect(() => {
    const getDailyExpenseAndInstitutions = async () => {
      setLoadingPage(true);
      setError("");

      try {
        const requests = [
          fetch(DAILY_EXPENSE_VIEW, {
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

        const [dailyExpenseResponse, institutionResponse] = await Promise.all(requests);
        const dailyExpenseData = await dailyExpenseResponse.json();

        if (!dailyExpenseResponse.ok) {
          setError(dailyExpenseData.message || "Daily expense fetch failed");
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

        const dailyExpense = dailyExpenseData.dailyExpense;

        setFormData({
          institution_id: String(dailyExpense.institution_id || authUser?.institution_id || ""),
          expense_title: dailyExpense.expense_title || "",
          category: dailyExpense.category || "",
          amount: String(dailyExpense.amount ?? ""),
          expense_date: dailyExpense.expense_date || "",
          expense_time: dailyExpense.expense_time || "",
          bill_file: dailyExpense.bill_file || null,
          bill_file_file: null,
        });
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingPage(false);
      }
    };

    getDailyExpenseAndInstitutions();
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

    if (name === "amount") {
      setFormData((currentData) => ({
        ...currentData,
        amount: value.replace(/[^\d.]/g, ""),
      }));
      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    setFormData((currentData) => ({
      ...currentData,
      bill_file_file: event.target.files?.[0] || null,
    }));
  };

  const buildDailyExpenseFormData = () => {
    const payload = new FormData();

    payload.append("id", id);

    Object.entries(formData).forEach(([key, value]) => {
      if (key === "bill_file_file" || key === "bill_file") {
        return;
      }

      payload.append(key, value || "");
    });

    if (formData.bill_file_file) {
      payload.append("bill_file", formData.bill_file_file);
    }

    payload.set("amount", Number(formData.amount));

    return payload;
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
      const response = await fetch(DAILY_EXPENSE_EDIT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: buildDailyExpenseFormData(),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || "Daily expense update failed";
        setError(message);
        alert(message);
        return;
      }

      navigate("/expenses/daily");
    } catch (apiError) {
      const message = apiError.message || "Daily expense update failed";
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
                  Edit Expense
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Update daily expense details
                </p>
              </div>

              <Error message={error} />

              {loadingPage ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                <DailyExpenseForm
                  formData={formData}
                  onChange={handleChange}
                  onFileChange={handleFileChange}
                  onSubmit={handleSubmit}
                  buttonText={loading ? "Saving..." : "Update Expense"}
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

export default EditDailyExpense;
