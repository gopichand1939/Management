import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { ClipboardCheck, History } from "lucide-react";

import ApprovedKitchenRequests from "./ApprovedKitchenRequests";
import RationStockIssueItemsTable from "./RationStockIssueItemsTable";
import Sidebar from "../../Layout/Sidebar";
import Navbar from "../../Layout/Navbar";
import { GET_INSTITUTION_LIST, TOKEN_KEY } from "../../../Utils/Constants";

const RationStockIssue = () => {
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || authUser?.profile_id === 1;

  const [activeTab, setActiveTab] = useState("ready"); // "ready" or "history"

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id ? String(authUser.institution_id) : (sessionStorage.getItem("selected_institution_id") || "")
  );

  useEffect(() => {
    const getInstitutions = async () => {
      if (!isSuperAdmin) return;
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
        if (response.ok) {
          const list = data.institutions || data.data || [];
          setInstitutions(list);
          if (!selectedInstitutionId && list.length > 0) {
            // Find if there is a previously selected id
            const prevId = sessionStorage.getItem("selected_institution_id");
            if (prevId && list.some(inst => String(inst.id) === String(prevId))) {
              setSelectedInstitutionId(String(prevId));
            } else {
              setSelectedInstitutionId(String(list[0].id));
              sessionStorage.setItem("selected_institution_id", String(list[0].id));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching institutions:", err);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, [isSuperAdmin]);


  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center text-left">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Stock Issue Management</h1>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  Issue ration stocks against approved kitchen requests and track issue history.
                </p>
              </div>
            </div>

            {/* Tabs Menu */}
            <div className="flex border-b border-slate-100 bg-white p-1.5 rounded-xl max-w-sm self-start shadow-sm border">
              <button
                onClick={() => setActiveTab("ready")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all duration-150 ${
                  activeTab === "ready"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <ClipboardCheck size={14} />
                Ready to Issue
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all duration-150 ${
                  activeTab === "history"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <History size={14} />
                Issue History
              </button>
            </div>

            {/* Selected Tab content */}
            <div>
              {activeTab === "ready" ? (
                <ApprovedKitchenRequests
                  selectedInstitutionId={selectedInstitutionId}
                  setSelectedInstitutionId={setSelectedInstitutionId}
                  institutions={institutions}
                  loadingInstitutions={loadingInstitutions}
                />
              ) : (
                <RationStockIssueItemsTable
                  selectedInstitutionId={selectedInstitutionId}
                  setSelectedInstitutionId={setSelectedInstitutionId}
                  institutions={institutions}
                  loadingInstitutions={loadingInstitutions}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RationStockIssue;

