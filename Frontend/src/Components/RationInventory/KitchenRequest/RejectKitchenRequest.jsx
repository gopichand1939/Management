import { useState } from "react";
import { X, XCircle } from "lucide-react";
import Button from "../../Common/Button";
import InputField from "../../Common/InputField";
import { RATION_KITCHEN_REQUEST_REJECT, TOKEN_KEY } from "../../../Utils/Constants";

const RejectKitchenRequest = ({ id, onClose, onSuccess, institutionId }) => {
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReject = async (e) => {
    if (e) e.preventDefault();
    if (!remarks.trim()) {
      setError("Please specify a rejection reason remarks");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(RATION_KITCHEN_REQUEST_REJECT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(id),
          remarks,
          institution_id: institutionId ? Number(institutionId) : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to reject kitchen request");
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={handleReject}
        className="bg-white border border-slate-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-left flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
            <XCircle size={16} className="text-red-500" />
            Reject Kitchen Request
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <InputField
            label="Rejection Remarks / Reason *"
            name="remarks"
            placeholder="Provide a reason for rejecting this request..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          {error && <div className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="orange"
            disabled={loading}
            className="!bg-red-650 hover:!bg-red-700"
          >
            {loading ? "Rejecting..." : "Reject Request"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RejectKitchenRequest;
