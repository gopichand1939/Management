import { useState } from "react";
import Button from "../../Common/Button";
import Error from "../../Common/Error";
import { RATION_PURCHASE_COMPLETE, TOKEN_KEY } from "../../../Utils/Constants";

const CompleteRationPurchase = ({ purchase, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(RATION_PURCHASE_COMPLETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: purchase.id || purchase.purchase_id,
          institution_id: purchase.institution_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to complete purchase");
        return;
      }

      onSuccess();
    } catch (err) {
      setError(err.message || "An error occurred while completing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 text-left">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Complete Purchase Order</h2>
          <p className="mt-2 text-sm text-slate-500">
            Are you sure you want to complete purchase order{" "}
            <span className="font-bold text-slate-700">{purchase.purchase_number}</span>?
            This will finalize the invoice amounts, book stock transaction inflow records, and lock the invoice.
          </p>
        </div>

        <Error message={error} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Completing..." : "Complete Purchase"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompleteRationPurchase;
