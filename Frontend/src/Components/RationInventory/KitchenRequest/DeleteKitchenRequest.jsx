import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import Button from "../../Common/Button";
import { RATION_KITCHEN_REQUEST_DELETE, TOKEN_KEY } from "../../../Utils/Constants";

const DeleteKitchenRequest = ({ id, onClose, onSuccess, institutionId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(RATION_KITCHEN_REQUEST_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(id),
          institution_id: institutionId ? Number(institutionId) : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to delete kitchen request");
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
      <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-left flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Trash2 size={16} className="text-red-500" />
            Delete Kitchen Request
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm font-semibold text-slate-655">
            Are you sure you want to permanently delete this kitchen request? This action cannot be undone.
          </p>
          {error && <div className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="orange"
            onClick={handleDelete}
            disabled={loading}
            className="!bg-red-600 hover:!bg-red-700"
          >
            {loading ? "Deleting..." : "Delete Permanently"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteKitchenRequest;
