import { useEffect, useState } from "react";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  IndianRupee,
  MessageCircle,
  PhoneCall,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import TenantShell from "../TenantShell";
import {
  PAYMENT_REMINDER_ACTION,
  PAYMENT_REMINDER_COLLECT,
  PAYMENT_REMINDER_LIST,
} from "../../../Utils/Constants";
import {
  buildMetricCards,
  formatCurrency,
  formatDisplayDate,
  getAuthHeaders,
} from "../tenantHelpers";

const actionTypes = [
  { id: "called", label: "Call", icon: PhoneCall },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "promise_to_pay", label: "Promise", icon: CalendarClock },
];

const paymentModeOptions = ["cash", "upi", "bank_transfer", "card"];

const getReminderTone = (bucket) => {
  if (bucket === "overdue") {
    return {
      border: "border-rose-200",
      accent: "bg-rose-500",
      bubble: "bg-rose-50 text-rose-700 border-rose-100",
      badge: "bg-rose-50 text-rose-600 border-rose-100",
      label: "Overdue",
    };
  }

  if (bucket === "due_today") {
    return {
      border: "border-orange-200",
      accent: "bg-orange-500",
      bubble: "bg-orange-50 text-orange-700 border-orange-100",
      badge: "bg-orange-50 text-orange-600 border-orange-100",
      label: "Due Today",
    };
  }

  if (bucket === "due_soon") {
    return {
      border: "border-amber-200",
      accent: "bg-amber-500",
      bubble: "bg-amber-50 text-amber-700 border-amber-100",
      badge: "bg-amber-50 text-amber-600 border-amber-100",
      label: "Due Soon",
    };
  }

  return {
    border: "border-slate-150",
    accent: "bg-sky-500",
    bubble: "bg-sky-50 text-sky-700 border-sky-100",
    badge: "bg-sky-50 text-sky-600 border-sky-100",
    label: "Upcoming",
  };
};

const getDueCopy = (reminder) => {
  const daysToDue = Number(reminder.days_to_due || 0);
  const agingDays = Number(reminder.aging_days || 0);

  if (daysToDue < 0) {
    return `${agingDays} day${agingDays === 1 ? "" : "s"} overdue`;
  }

  if (daysToDue === 0) {
    return "Collect today";
  }

  return `${daysToDue} day${daysToDue === 1 ? "" : "s"} left`;
};

const formatShortDueDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const PaymentReminders = () => {
  const [reminders, setReminders] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingActionId, setSavingActionId] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);
  const [selectedDueIds, setSelectedDueIds] = useState([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [savingCollection, setSavingCollection] = useState(false);

  const fetchReminders = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(PAYMENT_REMINDER_LIST, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          search: "",
          status: "all",
          window_days: 30,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Payment reminders fetch failed");
      }

      setReminders(data.reminders || []);
      setSummary(data.summary || {});
    } catch (apiError) {
      setError(apiError.message || "Payment reminders fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchReminders, 250);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const metricCards = buildMetricCards([
    {
      label: "Due Cases",
      value: Number(summary.total_reminders || 0),
      icon: BellRing,
      color: "bg-sky-50 border-sky-100 text-sky-600",
    },
    {
      label: "Overdue",
      value: Number(summary.overdue_count || 0),
      icon: ShieldAlert,
      color: "bg-rose-50 border-rose-100 text-rose-600",
    },
    {
      label: "Due Soon",
      value: Number(summary.due_soon_count || 0),
      icon: Clock3,
      color: "bg-amber-50 border-amber-100 text-amber-600",
    },
    {
      label: "Pending Rent",
      value: formatCurrency(summary.pending_amount),
      icon: IndianRupee,
      color: "bg-emerald-50 border-emerald-100 text-emerald-600",
    },
  ]);

  const handleReminderAction = async (reminder, actionType) => {
    setSavingActionId(`${reminder.id}-${actionType}`);

    try {
      const response = await fetch(PAYMENT_REMINDER_ACTION, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          monthly_due_id: reminder.id,
          tenant_id: reminder.tenant_id,
          action_type: actionType,
          action_note: `Collection follow-up marked as ${actionType.replace(/_/g, " ")}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Reminder action failed");
      }

      setReminders((currentReminders) =>
        currentReminders.map((item) =>
          item.id === reminder.id
            ? {
                ...item,
                last_action_type: data.action.action_type,
                last_action_note: data.action.action_note,
                last_action_at: data.action.created_at,
              }
            : item
        )
      );
    } catch (apiError) {
      setError(apiError.message || "Reminder action failed");
    } finally {
      setSavingActionId(null);
    }
  };

  const openCollectionModal = (reminder) => {
    const tenantDues = reminders
      .filter((item) => Number(item.tenant_id) === Number(reminder.tenant_id))
      .sort((firstDue, secondDue) => {
        return new Date(firstDue.due_date).getTime() - new Date(secondDue.due_date).getTime();
      });

    setActiveCollection({
      tenant: reminder,
      dues: tenantDues,
    });
    setSelectedDueIds([reminder.id]);
    setPaymentMode("cash");
    setReferenceNumber("");
    setError("");
  };

  const closeCollectionModal = () => {
    setActiveCollection(null);
    setSelectedDueIds([]);
    setReferenceNumber("");
    setPaymentMode("cash");
  };

  const toggleDueSelection = (dueId) => {
    setSelectedDueIds((currentDueIds) => {
      if (currentDueIds.includes(dueId)) {
        return currentDueIds.filter((id) => id !== dueId);
      }

      return [...currentDueIds, dueId];
    });
  };

  const selectedCollectionDues = activeCollection
    ? activeCollection.dues.filter((due) => selectedDueIds.includes(due.id))
    : [];

  const selectedCollectionAmount = selectedCollectionDues.reduce((sum, due) => {
    return sum + Number(due.pending_amount || 0);
  }, 0);

  const handleCollectPayment = async () => {
    if (!selectedDueIds.length) {
      setError("Select at least one due cycle to collect");
      return;
    }

    setSavingCollection(true);
    setError("");

    try {
      const response = await fetch(PAYMENT_REMINDER_COLLECT, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          monthly_due_ids: selectedDueIds,
          payment_mode: paymentMode,
          reference_number: referenceNumber,
          notes: "Rent collected from payment reminder",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Payment collection failed");
      }

      closeCollectionModal();
      await fetchReminders();
    } catch (apiError) {
      setError(apiError.message || "Payment collection failed");
    } finally {
      setSavingCollection(false);
    }
  };

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <div className="border-b border-slate-100 pb-2 text-left">
          <h1 className="text-lg font-black tracking-tight text-slate-850">
            Payment Reminders
          </h1>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">
            Aging queue for rent due now or within the next 30 days.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="flex min-h-[58px] items-center justify-between rounded-xl border border-slate-150 bg-white px-3 py-2 text-left shadow-[0_8px_20px_-14px_rgba(15,23,42,0.18)]"
              >
                <div>
                  <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">
                    {card.label}
                  </span>
                  <span className="mt-1 block text-base font-black leading-none text-slate-850">
                    {card.value}
                  </span>
                </div>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${card.color}`}>
                  <Icon size={13} />
                </span>
              </div>
            );
          })}
        </div>

        <Error message={error} />

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-150 bg-white p-16">
            <PageLoader />
          </div>
        ) : reminders.length === 0 ? (
          <div className="rounded-2xl border border-slate-150 bg-white p-16 text-center">
            <BellRing size={34} className="mx-auto text-slate-300" />
            <h3 className="mt-3 text-base font-black text-slate-700">
              No Payment Reminders
            </h3>
            <p className="mt-1 text-xs font-bold text-slate-400">
              No pending rent dues match the selected queue.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-150 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 text-left">
              <div>
                <h2 className="text-sm font-black text-slate-850">
                  Tenant Aging Due Table
                </h2>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  Sorted by nearest due date first.
                </p>
              </div>
              <span className="rounded-xl border border-slate-150 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {reminders.length} rows
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-5 py-3">Tenant</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Institution</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Aging</th>
                    <th className="px-4 py-3 text-right">Pending</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reminders.map((reminder) => {
                    const tone = getReminderTone(reminder.reminder_bucket);

                    return (
                      <tr
                        key={reminder.id}
                        className="bg-white text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-150 bg-white text-slate-500">
                              <UserRound size={15} />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-850">
                                {reminder.full_name}
                              </div>
                              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {reminder.admission_number || "No admission no"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-700">
                            {reminder.phone || "-"}
                          </div>
                          <div className="mt-0.5 max-w-[150px] truncate text-[11px] text-slate-400">
                            {reminder.email || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-[170px] truncate">
                            {reminder.institution_name || "-"}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {reminder.floor_name || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-black text-slate-800">
                            {formatShortDueDate(reminder.due_date)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-black text-slate-800">
                            {getDueCopy(reminder)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-black text-slate-850">
                          {formatCurrency(reminder.pending_amount)}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tone.badge}`}>
                            {tone.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1.5">
                            {actionTypes.map((action) => {
                              const Icon = action.icon;
                              const actionKey = `${reminder.id}-${action.id}`;

                              return (
                                <button
                                  key={action.id}
                                  type="button"
                                  disabled={savingActionId === actionKey}
                                  onClick={() => handleReminderAction(reminder, action.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-150 bg-white text-slate-500 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-wait disabled:opacity-70"
                                  title={`Mark ${action.label}`}
                                >
                                  <Icon size={14} />
                                </button>
                              );
                            })}
                            <a
                              role="button"
                              tabIndex={0}
                              onClick={() => openCollectionModal(reminder)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  openCollectionModal(reminder);
                                }
                              }}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-emerald-150 bg-emerald-50 text-emerald-700"
                              title="Collect rent"
                            >
                              <IndianRupee size={14} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeCollection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              onClick={closeCollectionModal}
              aria-label="Close collection modal"
            />

            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-150 bg-white p-5 text-left shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-850">
                    Collect Rent
                  </h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {activeCollection.tenant.full_name} | {activeCollection.tenant.phone || "No phone"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCollectionModal}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-150 text-slate-500 hover:bg-slate-50"
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="mt-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Pending Cycles
                </label>
                <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-150">
                  {activeCollection.dues.map((due) => (
                    <label
                      key={due.id}
                      className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedDueIds.includes(due.id)}
                          onChange={() => toggleDueSelection(due.id)}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        <span>
                          <span className="block text-xs font-black text-slate-800">
                            {formatShortDueDate(due.due_date)}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {getDueCopy(due)}
                          </span>
                        </span>
                      </span>
                      <span className="text-sm font-black text-slate-850">
                        {formatCurrency(due.pending_amount)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Payment Mode
                  </span>
                  <select
                    value={paymentMode}
                    onChange={(event) => setPaymentMode(event.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-orange-300"
                  >
                    {paymentModeOptions.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.replace(/_/g, " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Reference
                  </span>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    placeholder="UPI / receipt / cash note"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400 focus:border-orange-300"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <span>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Collection Total
                  </span>
                  <span className="mt-1 block text-xl font-black text-emerald-900">
                    {formatCurrency(selectedCollectionAmount)}
                  </span>
                </span>

                <button
                  type="button"
                  disabled={savingCollection || !selectedDueIds.length}
                  onClick={handleCollectPayment}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 size={15} />
                  {savingCollection ? "Saving" : "Collect"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TenantShell>
  );
};

export default PaymentReminders;
