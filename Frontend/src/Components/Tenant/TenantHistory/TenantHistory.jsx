import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  BadgeIndianRupee,
  CalendarClock,
  CreditCard,
  FileImage,
  History,
  Image as ImageIcon,
  Search,
  UserRound,
} from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import TenantShell from "../TenantShell";
import {
  TENANT_ACTIVE_LIST,
  TENANT_HISTORY_VIEW,
  GET_INSTITUTION_LIST,
} from "../../../Utils/Constants";
import {
  formatCurrency,
  formatDisplayDate,
  getAssetUrl,
  getAuthHeaders,
  getStatusBadgeClassName,
} from "../tenantHelpers";

const cardClassName =
  "rounded-3xl border border-slate-150 bg-white p-5 shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)]";

const formatPaymentMonth = (value) => {
  if (!value) {
    return "Payment Cycle";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Payment Cycle";
  }

  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const formatBillingCycleLabel = (value) => {
  return value === "calendar_month_prorated"
    ? "Current month prorated, then 1st to month end"
    : "Same date every month";
};

const TenantHistory = () => {
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  const [tenants, setTenants] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("all");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [history, setHistory] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  const fetchInstitutions = async () => {
    try {
      const response = await fetch(GET_INSTITUTION_LIST, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (response.ok) {
        setInstitutions(data.institutions || data.data || []);
      }
    } catch (err) {
      console.error("Failed to load institutions:", err);
    }
  };

  const fetchTenants = async (instId = selectedInstitutionId) => {
    setLoadingTenants(true);
    setError("");

    try {
      const payload = {};
      if (instId && instId !== "all") {
        payload.institution_id = Number(instId);
      }
      const response = await fetch(TENANT_ACTIVE_LIST, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Tenant list fetch failed");
      }

      const tenantList = data.tenants || [];
      setTenants(tenantList);

      if (tenantList.length > 0) {
        setSelectedTenantId(String(tenantList[0].id));
      } else {
        setSelectedTenantId("");
      }
    } catch (apiError) {
      setError(apiError.message || "Tenant list fetch failed");
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    if (!isPgAdmin) {
      fetchInstitutions();
    }
  }, [isPgAdmin]);

  useEffect(() => {
    fetchTenants(selectedInstitutionId);
  }, [selectedInstitutionId]);

  useEffect(() => {
    const fetchTenantHistory = async () => {
      if (!selectedTenantId) {
        setHistory(null);
        return;
      }

      setLoadingHistory(true);
      setError("");

      try {
        const response = await fetch(TENANT_HISTORY_VIEW, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ tenant_id: selectedTenantId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Tenant history fetch failed");
        }

        setHistory(data.history || null);
      } catch (apiError) {
        setError(apiError.message || "Tenant history fetch failed");
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchTenantHistory();
  }, [selectedTenantId]);

  const filteredTenants = useMemo(() => {
    const term = searchText.toLowerCase();

    return tenants.filter((tenant) => {
      return (
        tenant.full_name?.toLowerCase().includes(term) ||
        tenant.admission_number?.toLowerCase().includes(term) ||
        tenant.phone?.toLowerCase().includes(term) ||
        tenant.institution_name?.toLowerCase().includes(term)
      );
    });
  }, [searchText, tenants]);

  const tenant = history?.tenant;
  const onboardingAssets = history?.onboarding_assets;
  const paymentTimeline = history?.payment_timeline;
  const duesSummary = history?.dues_summary;
  const activityLogs = history?.activity_logs || [];

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="border-b border-slate-100 pb-4 text-left">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <History size={24} className="text-orange-500" />
            Tenant History Desk
          </h1>
          <p className="mt-1.5 text-xs font-bold text-slate-400">
            Review onboarding documents, join-time payments, next due cycle, and activity timeline for a selected tenant.
          </p>
        </div>

        <div className={`${cardClassName} flex flex-col gap-3 md:flex-row md:items-center md:justify-between`}>
          {!isPgAdmin && (
            <div className="w-full md:max-w-xs">
              <select
                value={selectedInstitutionId}
                onChange={(event) => setSelectedInstitutionId(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-orange-500/50"
              >
                <option value="all">All Institutions</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.institution_name || inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex w-full md:max-w-xs items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-slate-400 transition-all duration-200 focus-within:border-orange-500/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:shadow-sm">
            <Search size={14} />
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search tenant name, phone, admission..."
              className="h-9 w-full border-0 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-455"
            />
          </div>

          <div className="w-full md:max-w-xs">
            <select
              value={selectedTenantId}
              onChange={(event) => setSelectedTenantId(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-orange-500/50"
            >
              <option value="">Select Tenant</option>
              {filteredTenants.map((tenantOption) => (
                <option key={tenantOption.id} value={tenantOption.id}>
                  {tenantOption.full_name} - {tenantOption.admission_number || tenantOption.phone}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Error message={error} />

        {loadingTenants || loadingHistory ? (
          <div className={`${cardClassName} flex items-center justify-center p-16`}>
            <PageLoader />
          </div>
        ) : !tenant ? (
          <div className={`${cardClassName} text-center`}>
            <UserRound size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-700">No tenant history selected</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 text-left">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className={cardClassName}>
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border border-orange-100 bg-orange-50">
                    {onboardingAssets?.profile_photo?.file_url ? (
                      <img
                        src={getAssetUrl(onboardingAssets.profile_photo.file_url)}
                        alt={tenant.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-orange-400">
                        <UserRound size={28} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black tracking-tight text-slate-800">
                        {tenant.full_name}
                      </h2>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getStatusBadgeClassName(tenant.status)}`}>
                        {tenant.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      {tenant.admission_number || "No Admission Number"}
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <p className="text-sm font-semibold text-slate-600">
                        <span className="font-black text-slate-800">Institution:</span> {tenant.institution_name}
                      </p>
                      <p className="text-sm font-semibold text-slate-600">
                        <span className="font-black text-slate-800">Stay:</span> {tenant.floor_name} / Room {tenant.room_number} / {tenant.bed_number}
                      </p>
                      <p className="text-sm font-semibold text-slate-600">
                        <span className="font-black text-slate-800">Phone:</span> {tenant.phone || "-"}
                      </p>
                      <p className="text-sm font-semibold text-slate-600">
                        <span className="font-black text-slate-800">Check-in:</span> {formatDisplayDate(tenant.check_in_date)}
                      </p>
                      <p className="text-sm font-semibold text-slate-600">
                        <span className="font-black text-slate-800">Billing Cycle:</span> {formatBillingCycleLabel(tenant.billing_cycle_type)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${cardClassName} grid grid-cols-2 gap-4`}>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documents</p>
                  <p className="mt-2 text-2xl font-black text-slate-800">{onboardingAssets?.documents?.length || 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Paid</p>
                  <p className="mt-2 text-2xl font-black text-slate-800">{formatCurrency(paymentTimeline?.total_paid_amount || 0)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Due</p>
                  <p className="mt-2 text-2xl font-black text-slate-800">{formatCurrency(duesSummary?.display_pending_due_amount || 0)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline Items</p>
                  <p className="mt-2 text-2xl font-black text-slate-800">{activityLogs.length}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className={cardClassName}>
                <div className="mb-4 flex items-center gap-2">
                  <ImageIcon size={16} className="text-orange-500" />
                  <h3 className="text-base font-black text-slate-800">Onboarding Documents</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {(onboardingAssets?.documents || []).map((document) => (
                    <div key={document.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-800">{document.document_name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {document.document_type}
                          </p>
                        </div>
                        {document.file_url ? (
                          <a
                            href={getAssetUrl(document.file_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-600"
                          >
                            Open File
                          </a>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-600">
                        Document Number: {document.document_number || "-"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Uploaded: {formatDisplayDate(document.uploaded_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardClassName}>
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard size={16} className="text-orange-500" />
                  <h3 className="text-base font-black text-slate-800">Join-Time Payment & Dues</h3>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Onboarding Payment
                    </p>
                    <p className="mt-2 text-lg font-black text-slate-800">
                      {formatCurrency(paymentTimeline?.onboarding_payment?.amount || 0)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getStatusBadgeClassName(paymentTimeline?.onboarding_payment?.verification_status || "pending")}`}>
                        {paymentTimeline?.onboarding_payment?.verification_status || "pending"}
                      </span>
                      <span className="rounded-full border border-slate-100 bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">
                        {paymentTimeline?.onboarding_payment?.payment_type || "-"}
                      </span>
                    </div>
                    {duesSummary?.upcoming_cycle?.first_cycle_start_date ? (
                      <p className="mt-3 text-xs font-semibold text-slate-600">
                        First stay settlement: {formatDisplayDate(duesSummary.upcoming_cycle.first_cycle_start_date)} to {formatDisplayDate(duesSummary.upcoming_cycle.first_cycle_end_date)} for {formatCurrency(duesSummary.upcoming_cycle.first_cycle_amount || 0)}
                      </p>
                    ) : null}
                    {paymentTimeline?.onboarding_payment?.payment_proof_url ? (
                      <a
                        href={getAssetUrl(paymentTimeline.onboarding_payment.payment_proof_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-orange-100 bg-white px-3 py-2 text-[11px] font-black text-orange-600 shadow-sm"
                      >
                        <FileImage size={14} />
                        View Payment Proof
                      </a>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Next Due Cycle
                    </p>
                    {duesSummary?.upcoming_cycle ? (
                      <>
                        <p className="mt-2 text-lg font-black text-slate-800">
                          {formatCurrency(duesSummary.upcoming_cycle.expected_amount || 0)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          Next Payment Date: {formatDisplayDate(duesSummary.upcoming_cycle.due_date)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          Due Month: {formatDisplayDate(duesSummary.upcoming_cycle.due_month)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          Calculated From: {formatDisplayDate(duesSummary.upcoming_cycle.based_on_payment_date)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          Rule: {formatBillingCycleLabel(duesSummary.upcoming_cycle.billing_cycle_type)}
                        </p>
                        <span className="mt-2 inline-flex w-fit rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-sky-600">
                          Upcoming Monthly Cycle
                        </span>
                        {duesSummary?.next_due ? (
                          <p className="mt-2 text-[11px] font-semibold text-slate-500">
                            Outstanding mapped due: {formatCurrency(duesSummary.next_due.pending_amount)}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-emerald-600">
                        No pending monthly due.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className={cardClassName}>
                <div className="mb-4 flex items-center gap-2">
                  <BadgeIndianRupee size={16} className="text-orange-500" />
                  <h3 className="text-base font-black text-slate-800">Payment Timeline</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {(paymentTimeline?.payments || []).map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {formatPaymentMonth(payment.payment_date)}
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-800">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getStatusBadgeClassName(payment.verification_status || payment.status)}`}>
                          {payment.verification_status || payment.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-600">
                        {payment.payment_type} | {payment.payment_mode || "-"} | {formatDisplayDate(payment.payment_date)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Ref: {payment.reference_number || payment.receipt_number || "-"}
                      </p>
                      {payment.payment_proof_url ? (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-white">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Payment Proof
                              </p>
                              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                Uploaded: {formatDisplayDate(payment.payment_proof_uploaded_at)}
                              </p>
                            </div>
                            <a
                              href={getAssetUrl(payment.payment_proof_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-orange-100 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-600"
                            >
                              <FileImage size={12} />
                              Open Proof
                            </a>
                          </div>
                          <img
                            src={getAssetUrl(payment.payment_proof_url)}
                            alt={`${payment.payment_type || "payment"} proof`}
                            className="h-40 w-full bg-slate-50 object-cover"
                          />
                        </div>
                      ) : (
                        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white/80 px-3 py-3 text-[11px] font-semibold text-slate-400">
                          No payment proof uploaded for this payment.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardClassName}>
                <div className="mb-4 flex items-center gap-2">
                  <CalendarClock size={16} className="text-orange-500" />
                  <h3 className="text-base font-black text-slate-800">Activity Timeline</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {activityLogs.map((activity) => (
                    <div key={activity.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black capitalize text-slate-800">
                          {String(activity.action || "").replaceAll("_", " ")}
                        </p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {formatDisplayDate(activity.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TenantShell>
  );
};

export default TenantHistory;
