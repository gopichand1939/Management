import { useState } from "react";
import Button from "../../Common/Button";
import Error from "../../Common/Error";
import { RATION_STOCK_ISSUE_CANCEL, TOKEN_KEY } from "../../../Utils/Constants";

const CancelRationStockIssue = ({ isOpen, onClose, issueId, onSuccess }) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("Please specify a reason for cancellation");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(RATION_STOCK_ISSUE_CANCEL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(issueId),
          reason: reason.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to cancel stock issue");
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "An error occurred while cancelling");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 text-left">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Cancel Stock Issue</h2>
          <p className="mt-2 text-sm text-slate-500">
            Are you sure you want to cancel this stock issue?
            This will reverse the stock transaction logs, decrease issued quantities on the request, and recalculate status.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reason" className="text-xs font-bold text-slate-550 uppercase tracking-wider">
            Cancellation Reason *
          </label>
          <textarea
            id="reason"
            rows="3"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Specify reason for cancelling this issue..."
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-850 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition bg-white"
            required
          />
        </div>

        <Error message={error} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Cancelling..." : "Cancel Issue"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CancelRationStockIssue;
