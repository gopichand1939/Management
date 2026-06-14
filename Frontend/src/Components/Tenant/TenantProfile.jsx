import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  IndianRupee,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  ArrowLeft,
  Activity,
  CreditCard,
  Building,
  Briefcase,
  Users,
  Compass,
  Download,
  AlertTriangle,
  BadgeIndianRupee,
} from "lucide-react";
import TenantShell from "./TenantShell";
import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import { TENANT_VIEW, TOKEN_KEY } from "../../Utils/Constants";
import {
  formatCurrency,
  formatDisplayDate,
  getAuthHeaders,
  getStatusBadgeClassName,
} from "./tenantHelpers";

const tabs = [
  { id: "overview", label: "Overview", icon: User },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "dues", label: "Monthly Dues", icon: BadgeIndianRupee },
  { id: "activity", label: "Activity Logs", icon: Activity },
];

const TenantProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTenantData = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(TENANT_VIEW, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ id }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load tenant profile");
        }
        setTenant(data.tenant);
      } catch (err) {
        setError(err.message || "Something went wrong while fetching profile");
      } finally {
        setLoading(false);
      }
    };
    fetchTenantData();
  }, [id]);

  const getImageUrl = (photo) => {
    if (!photo) return null;
    if (typeof photo === "string") return photo;
    return photo.file_url || photo.url || null;
  };

  // Render Overview Details Tab
  const renderOverview = () => {
    const basic = tenant?.basic_details || tenant || {};
    const guardian = tenant?.guardian_details || tenant || {};

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {/* Personal Details */}
        <div className="rounded-3xl border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-5">
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <User size={16} className="text-orange-500" />
              Personal Particulars
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Contact info, date of birth, and occupation details.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Gender</p>
              <p className="text-sm font-bold text-slate-800 capitalize mt-1">{basic.gender || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Date of Birth</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{formatDisplayDate(basic.date_of_birth) || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Occupation</p>
              <p className="text-sm font-bold text-slate-800 capitalize mt-1">{basic.occupation || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Company / College</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{basic.company_name || "-"}</p>
            </div>
          </div>
        </div>

        {/* Permanent Address */}
        <div className="rounded-3xl border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-5">
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <MapPin size={16} className="text-orange-500" />
              Home Address
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Permanent residential details registered in DB.</p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Full Address</p>
              <p className="text-sm font-semibold text-slate-700 leading-relaxed mt-1">{basic.address || "-"}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">City</p>
                <p className="text-xs font-bold text-slate-800 mt-1">{basic.city || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">State</p>
                <p className="text-xs font-bold text-slate-800 mt-1">{basic.state || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pincode</p>
                <p className="text-xs font-bold text-slate-800 mt-1">{basic.pincode || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guardian and Emergency details */}
        <div className="rounded-3xl border border-slate-150 bg-white p-6 shadow-sm flex flex-col gap-5 md:col-span-2">
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Users size={16} className="text-orange-500" />
              Guardian & Emergency Contacts
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Fallback contact names and numbers for emergency outreach.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Guardian</span>
              <p className="text-sm font-black text-slate-800 mt-1">{guardian.guardian_name || "-"}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Relation: {guardian.guardian_relation || "-"}</p>
              <p className="text-xs font-bold text-slate-650 flex items-center gap-1 mt-2.5">
                <Phone size={11} className="text-slate-400" />
                {guardian.guardian_phone || "-"}
              </p>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emergency Contact</span>
              <p className="text-sm font-black text-slate-800 mt-1">{guardian.emergency_contact_name || "-"}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Fallback Contact</p>
              <p className="text-xs font-bold text-slate-650 flex items-center gap-1 mt-2.5">
                <Phone size={11} className="text-slate-400" />
                {guardian.emergency_contact_phone || "-"}
              </p>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operations Note</span>
                <p className="text-xs font-semibold text-slate-600 mt-1.5 italic">
                  {tenant?.notes || "No operational notes recorded."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Documents Tab
  const renderDocuments = () => {
    const docs = tenant?.documents || [];

    return (
      <div className="flex flex-col gap-5 text-left">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">Identity Documents</h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Verify uploaded resident credentials and identity proof files.</p>
        </div>

        {docs.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 bg-slate-50/30">
            <FileText size={32} className="mx-auto opacity-30 mb-2" />
            <p className="text-xs font-bold">No documents uploaded for this resident.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {docs.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="rounded-2xl border border-slate-150 p-4 bg-white hover:border-orange-500/25 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-500 border border-orange-100/50 shrink-0">
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-850 truncate">{doc.document_name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      No: {doc.document_number || "Not provided"} • Type: {doc.document_type}
                    </p>
                  </div>
                </div>

                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl border border-slate-150 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                    title="View Document"
                  >
                    <Download size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Payments Tab
  const renderPayments = () => {
    const payList = tenant?.payments || [];

    return (
      <div className="flex flex-col gap-5 text-left">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">Ledger Collection Log</h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Rent collections, deposit receipts, and verification stamps.</p>
        </div>

        {payList.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 bg-slate-50/30">
            <CreditCard size={32} className="mx-auto opacity-30 mb-2" />
            <p className="text-xs font-bold">No payments logged for this resident yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {payList.map((pay, idx) => (
              <div
                key={pay.id || idx}
                className="rounded-3xl border border-slate-150 p-5 bg-white flex flex-col justify-between hover:shadow-md transition-all gap-4 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-400" />
                <div className="flex items-start justify-between mt-1">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Receipt Number</h4>
                    <p className="text-sm font-black text-slate-800 mt-1.5">{pay.receipt_number || "No Receipt"}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                      Mode: <span className="text-slate-650">{pay.payment_mode || "Cash"}</span> • Date: <span className="text-slate-650">{formatDisplayDate(pay.payment_date)}</span>
                    </p>
                  </div>
                  <span className="text-lg font-black text-slate-850">{formatCurrency(pay.amount)}</span>
                </div>

                <div className="border-t border-slate-50 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                      {pay.payment_type || "Rent"}
                    </span>
                    {pay.reference_number && (
                      <span className="text-[10px] text-slate-450 font-semibold">Ref: {pay.reference_number}</span>
                    )}
                  </div>

                  <span className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                    pay.verification_status === "verified"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-amber-50 text-amber-600 border-amber-100"
                  }`}>
                    {pay.verification_status || "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Monthly Dues Tab
  const renderDues = () => {
    const duesList = tenant?.dues || [];

    return (
      <div className="flex flex-col gap-5 text-left">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">Monthly Rent Dues</h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Examine month-wise rent bills and balances.</p>
        </div>

        {duesList.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 bg-slate-50/30">
            <BadgeIndianRupee size={32} className="mx-auto opacity-30 mb-2" />
            <p className="text-xs font-bold">No monthly dues configuration logged.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-150">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-450">
                  <th className="py-3.5 px-4 text-left">Billing Month</th>
                  <th className="py-3.5 px-4 text-right">Total Rent</th>
                  <th className="py-3.5 px-4 text-right">Paid Amount</th>
                  <th className="py-3.5 px-4 text-right">Pending Dues</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {duesList.map((due, idx) => (
                  <tr key={due.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-850">
                      {formatDisplayDate(due.due_month)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-850">{formatCurrency(due.total_rent)}</td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 font-bold">{formatCurrency(due.paid_amount)}</td>
                    <td className="py-3.5 px-4 text-right text-rose-600 font-bold">{formatCurrency(due.pending_amount)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        due.status === "paid"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : due.status === "partial"
                          ? "bg-amber-50 text-amber-600 border-amber-100"
                          : "bg-rose-50 text-rose-600 border-rose-100"
                      }`}>
                        {due.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Render Activity Log Tab
  const renderActivity = () => {
    const logs = tenant?.activity_logs || [];

    const getActivityLabel = (action, val) => {
      const clean = action.replace("tenant_", "").replace("_", " ").toLowerCase();
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    };

    return (
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">Stay Activity Trail</h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Chronological timeline of resident lifecycle checkpoints.</p>
        </div>

        {logs.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 bg-slate-50/30">
            <Activity size={32} className="mx-auto opacity-30 mb-2" />
            <p className="text-xs font-bold">No activity logs recorded.</p>
          </div>
        ) : (
          <div className="relative pl-6 border-l border-slate-150 flex flex-col gap-6 ml-2.5 py-2">
            {logs.map((log, idx) => (
              <div key={log.id || idx} className="relative">
                {/* Connector Node */}
                <div className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-slate-800 border-2 border-white ring-4 ring-slate-100" />
                
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-850">
                      {getActivityLabel(log.action, log.new_value)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {formatDisplayDate(log.created_at)}
                    </span>
                  </div>

                  {log.new_value && (
                    <div className="mt-1.5 text-xs text-slate-500 font-medium">
                      {typeof log.new_value === "object" ? (
                        <ul className="list-disc pl-4 space-y-0.5">
                          {Object.entries(log.new_value).map(([k, v]) => (
                            <li key={k}>
                              <span className="font-bold text-slate-600 capitalize">{k.replace("_", " ")}</span>:{" "}
                              <span className="text-slate-800">{String(v)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>{String(log.new_value)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <TenantShell>
        <div className="rounded-[32px] border border-slate-100 bg-white p-16 shadow-sm flex justify-center items-center">
          <PageLoader />
        </div>
      </TenantShell>
    );
  }

  if (error) {
    return (
      <TenantShell>
        <div className="mx-auto max-w-5xl">
          <Error message={error} />
          <button
            onClick={() => navigate("/tenant/active")}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>
        </div>
      </TenantShell>
    );
  }

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* Header navigation bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => navigate("/tenant/active")}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-350 hover:shadow-sm transition-all duration-200"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-left">
            <h1 className="text-xl font-black text-slate-850 tracking-tight leading-none">
              Tenant Stay File
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-1.5">
              Review personal record, stay allocations, logs, and dues.
            </p>
          </div>
        </div>

        {/* Profile Snapshot Header Card */}
        {tenant && (
          <div className="rounded-[32px] border border-slate-150 bg-white p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between text-left relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-red-500" />
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              {/* Photo */}
              <div className="h-16 w-16 rounded-2xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                {getImageUrl(tenant.profile_photo) ? (
                  <img
                    src={getImageUrl(tenant.profile_photo)}
                    alt={tenant.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={24} />
                )}
              </div>

              {/* Title info */}
              <div className="text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg font-black text-slate-850 tracking-tight leading-none">
                    {tenant.full_name}
                  </h2>
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${getStatusBadgeClassName(tenant.status)}`}>
                    {tenant.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                  Admission ID: {tenant.admission_number || "No ID"}
                </p>
                <p className="text-xs font-bold text-slate-500 mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="flex items-center gap-0.5"><Building2 size={13} className="text-slate-400" /> {tenant.institution_name || "-"}</span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-0.5"><Compass size={13} className="text-slate-400" /> {tenant.floor_name || "-"}</span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-0.5"><Building size={13} className="text-slate-400" /> Room {tenant.room_number || "-"} ({tenant.bed_number || "-"})</span>
                </p>
              </div>
            </div>

            {/* Quick Details summary */}
            <div className="flex gap-4 border-t border-slate-100 md:border-t-0 pt-4 md:pt-0 w-full md:w-auto justify-around md:justify-end">
              <div className="text-center md:text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Check-in Date</span>
                <span className="text-sm font-black text-slate-700 block mt-2.5">{formatDisplayDate(tenant.check_in_date)}</span>
              </div>
              <div className="w-px h-10 bg-slate-100 hidden sm:block" />
              <div className="text-center md:text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Expected Exit</span>
                <span className="text-sm font-black text-slate-700 block mt-2.5">
                  {formatDisplayDate(tenant.expected_checkout_date || tenant.checkout_date)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab view controllers */}
        {tenant && (
          <div className="flex flex-col gap-6">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-150 p-1 flex overflow-x-auto shadow-sm gap-1">
              {tabs.map((tb) => {
                const isActive = activeTab === tb.id;
                const Icon = tb.icon;
                return (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => setActiveTab(tb.id)}
                    className="relative rounded-xl px-4 py-2.5 text-xs font-black transition-all whitespace-nowrap outline-none cursor-pointer flex items-center gap-1.5"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeProfileTab"
                        className="absolute inset-0 bg-slate-850 rounded-xl shadow-sm"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 ${isActive ? "text-white" : "text-slate-500 hover:text-slate-800"}`}>
                      <Icon size={13} />
                      {tb.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab panel container */}
            <div className="bg-white rounded-[32px] border border-slate-150 p-6 shadow-sm min-h-[300px]">
              {activeTab === "overview" && renderOverview()}
              {activeTab === "documents" && renderDocuments()}
              {activeTab === "payments" && renderPayments()}
              {activeTab === "dues" && renderDues()}
              {activeTab === "activity" && renderActivity()}
            </div>
          </div>
        )}
      </div>
    </TenantShell>
  );
};

export default TenantProfile;
