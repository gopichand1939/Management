import { useState, useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";
import Button from "../../Common/Button";
import PageLoader from "../../Common/PageLoader";
import Error from "../../Common/Error";
import { RATION_KITCHEN_REQUEST_VIEW, RATION_KITCHEN_REQUEST_APPROVE, TOKEN_KEY } from "../../../Utils/Constants";

const ApproveKitchenRequest = ({ request, onClose, onSuccess, institutionId }) => {
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoadingDetails(true);
      setError("");

      try {
        const response = await fetch(RATION_KITCHEN_REQUEST_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: Number(request.id),
            institution_id: institutionId ? Number(institutionId) : undefined
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Failed to load request details");
          return;
        }

        const { items: requestItems } = data.data;

        // Map items and default approved_quantity to requested_quantity
        setItems(requestItems.map((item) => ({
          ...item,
          approved_quantity: item.requested_quantity
        })));
      } catch (err) {
        setError(err.message || "An error occurred");
      } finally {
        setLoadingDetails(false);
      }
    };

    if (request?.id) fetchDetails();
  }, [request, institutionId]);

  const handleApprove = async () => {
    // Validate quantities
    for (const item of items) {
      const qty = parseFloat(item.approved_quantity);
      if (isNaN(qty) || qty < 0) {
        setError(`Approved quantity for ${item.item_name} must be 0 or greater`);
        return;
      }
    }

    setLoadingSubmit(true);
    setError("");

    try {
      const response = await fetch(RATION_KITCHEN_REQUEST_APPROVE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(request.id),
          items: items.map((i) => ({
            item_id: i.item_id,
            approved_quantity: Number(i.approved_quantity)
          })),
          institution_id: institutionId ? Number(institutionId) : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to approve request");
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Approve Request ({request.request_number})
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && <Error message={error} />}

          {loadingDetails ? (
            <div className="p-8 flex justify-center">
              <PageLoader />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-500">
                Verify and adjust approved quantities. Note that approving does not reduce stock ledger counts.
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs text-left text-slate-600 font-medium">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">S.No</th>
                      <th className="p-3">Item Specs</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3 text-right">Available Stock</th>
                      <th className="p-3 text-right">Requested Qty</th>
                      <th className="p-3 text-right">Approved Qty *</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <tr key={item.item_id} className="hover:bg-slate-50/50">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{item.item_name}</div>
                          <div className="text-[9px] font-bold text-slate-400">{item.sku_id}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-500">{item.unit_code}</td>
                        <td className="p-3 text-right font-bold text-slate-700">{item.current_stock}</td>
                        <td className="p-3 text-right font-bold text-slate-700">{item.requested_quantity}</td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={item.approved_quantity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.item_id === item.item_id
                                    ? { ...i, approved_quantity: isNaN(val) ? "" : val }
                                    : i
                                )
                              );
                            }}
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right font-black focus:outline-none focus:ring-2 focus:ring-orange-500/10"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loadingSubmit}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="orange"
            onClick={handleApprove}
            disabled={loadingDetails || loadingSubmit || items.length === 0}
            className="!bg-emerald-600 hover:!bg-emerald-700"
          >
            {loadingSubmit ? "Approving..." : "Confirm Approval"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApproveKitchenRequest;
