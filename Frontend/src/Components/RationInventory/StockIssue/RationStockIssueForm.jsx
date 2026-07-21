import { Calendar, ClipboardList, RefreshCw } from "lucide-react";
import InputField from "../../Common/InputField";
import Button from "../../Common/Button";

const RationStockIssueForm = ({
  formData,
  setFormData,
  items,
  setItems,
  scannedIndex,
  onConfirm,
  onCancel,
  submitting,
  error
}) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemFieldChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "critical":
        return "bg-rose-50 text-rose-600 border-rose-100 font-bold";
      case "high":
        return "bg-red-50 text-red-600 border-red-100 font-semibold";
      case "medium":
        return "bg-amber-50 text-amber-600 border-amber-100 font-medium";
      default:
        return "bg-slate-50 text-slate-500 border-slate-100";
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (e) {
      return String(value);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onConfirm(); }} className="space-y-6 text-left">
      {/* Header Fields Section */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ClipboardList size={16} className="text-orange-500" />
          Issue Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Issue Number (Disabled) */}
          <InputField
            label="Issue Number"
            name="issue_number"
            value={formData.issue_number || "Auto-generating..."}
            disabled
          />

          {/* Issue Date */}
          <InputField
            label="Issue Date *"
            name="issue_date"
            type="date"
            value={formData.issue_date}
            onChange={handleInputChange}
            required
          />

          {/* Request Number (Disabled) */}
          <InputField
            label="Request Number"
            name="request_number"
            value={formData.request_number || ""}
            disabled
          />

          {/* Required Date (Disabled) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500">Required Date</span>
            <div className="h-10 px-3.5 border border-slate-100 rounded-xl bg-slate-50/50 text-slate-600 text-sm flex items-center">
              {formatDate(formData.required_date)}
            </div>
          </div>

          {/* Meal Type (Disabled) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500">Meal Type</span>
            <div className="h-10 px-3.5 border border-slate-100 rounded-xl bg-slate-50/50 text-slate-600 text-sm flex items-center">
              {formData.meal_type || "-"}
            </div>
          </div>

          {/* Priority (Disabled) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500">Priority</span>
            <div className="h-10 px-3.5 flex items-center">
              <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-[10px] uppercase border ${getPriorityStyle(formData.priority)}`}>
                {formData.priority || "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <InputField
            label="Remarks"
            name="remarks"
            placeholder="Enter issue remarks..."
            value={formData.remarks || ""}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* Item Table Grid */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ClipboardList size={16} className="text-orange-500" />
          Request Items & Quantities
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Item Info</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase w-20">Unit</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-24">Req Qty</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-24">Appr Qty</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-24">Issued</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-28 text-orange-500">Bal to Issue</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase w-28 text-blue-500">Stock</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase w-32">Issue Qty *</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase w-40">Tracking Details</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const remaining = parseFloat(item.remaining_quantity || 0);
                const stock = parseFloat(item.current_stock || 0);
                const isHighlighted = idx === scannedIndex;

                return (
                  <tr
                    key={item.kitchen_request_item_id}
                    className={`border-b border-slate-100/80 hover:bg-slate-50/50 transition ${
                      isHighlighted ? "bg-orange-50/50 border-orange-200" : ""
                    }`}
                  >
                    {/* Item Info */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800 text-xs">{item.item_name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Code: {item.item_code}</div>
                    </td>

                    {/* Unit */}
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-semibold">{item.unit || "-"}</td>

                    {/* Req Qty */}
                    <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-600">
                      {parseFloat(item.requested_quantity || 0).toFixed(2)}
                    </td>

                    {/* Approved Qty */}
                    <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-600">
                      {parseFloat(item.approved_quantity || 0).toFixed(2)}
                    </td>

                    {/* Issued Qty */}
                    <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-600">
                      {parseFloat(item.issued_quantity || 0).toFixed(2)}
                    </td>

                    {/* Remaining */}
                    <td className="px-4 py-3.5 text-right text-xs font-bold text-orange-600 bg-orange-50/20">
                      {remaining.toFixed(2)}
                    </td>

                    {/* Current Stock */}
                    <td className="px-4 py-3.5 text-right text-xs font-bold text-blue-600 bg-blue-50/20">
                      {stock.toFixed(2)}
                    </td>

                    {/* Issue Qty Input */}
                    <td className="px-4 py-3.5">
                      {(() => {
                        const enteredQty = parseFloat(item.issue_quantity || 0);
                        const isExceedingStock = enteredQty > stock;
                        const isExceedingRemaining = enteredQty > remaining;
                        return (
                          <div className="flex flex-col gap-1">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="Qty"
                              value={item.issue_quantity ?? ""}
                              onChange={(e) => handleItemFieldChange(idx, "issue_quantity", e.target.value)}
                              className={`w-28 rounded-xl border px-3 py-2 text-xs font-bold focus:outline-none transition ${
                                isExceedingStock || isExceedingRemaining
                                  ? "border-red-400 focus:ring-2 focus:ring-red-500/10 focus:border-red-500 text-red-600 bg-red-50/10"
                                  : isHighlighted
                                  ? "border-orange-400 focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                  : "border-slate-200 focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                              }`}
                              required
                              id={`issue-qty-input-${idx}`}
                            />
                            {isExceedingStock && (
                              <span className="text-[9px] text-red-600 font-bold leading-tight w-28 block">
                                Only {stock.toFixed(2)} {item.unit || "units"} in stock
                              </span>
                            )}
                            {!isExceedingStock && isExceedingRemaining && (
                              <span className="text-[9px] text-red-600 font-bold leading-tight w-28 block">
                                Max limit is {remaining.toFixed(2)} {item.unit || "units"}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Tracking details (batch/expiry) */}
                    <td className="px-4 py-3.5 space-y-2">
                      {item.batch_tracking ? (
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Batch Number *</label>
                          {item.batches && item.batches.length > 0 ? (
                            <select
                              value={item.batch_number || ""}
                              onChange={(e) => {
                                const selectedBatch = item.batches.find(b => b.batch_number === e.target.value);
                                handleItemFieldChange(idx, "batch_number", e.target.value);
                                if (selectedBatch) {
                                  if (item.expiry_tracking) {
                                    handleItemFieldChange(idx, "expiry_date", selectedBatch.expiry_date);
                                  }
                                } else {
                                  if (item.expiry_tracking) {
                                    handleItemFieldChange(idx, "expiry_date", "");
                                  }
                                }
                              }}
                              className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none bg-white font-semibold text-slate-700 shadow-sm cursor-pointer"
                              required
                            >
                              <option value="">Select Batch</option>
                              {item.batches.map((batch) => (
                                <option key={batch.id} value={batch.batch_number}>
                                  {batch.batch_number} ({parseFloat(batch.remaining_quantity).toFixed(0)} left)
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="No active stock"
                              className="w-40 rounded-lg border border-red-200 px-2 py-1 text-xs focus:outline-none bg-red-50/20 text-red-600 font-bold"
                              required
                              disabled
                            />
                          )}
                        </div>
                      ) : null}

                      {item.expiry_tracking ? (
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expiry Date *</label>
                          <input
                            type="date"
                            value={item.expiry_date || ""}
                            onChange={(e) => handleItemFieldChange(idx, "expiry_date", e.target.value)}
                            className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none bg-slate-50 text-slate-500 font-semibold cursor-not-allowed"
                            required
                            readOnly
                          />
                        </div>
                      ) : null}

                      {!item.batch_tracking && !item.expiry_tracking && (
                        <span className="text-[10px] text-slate-400 italic">No tracking required</span>
                      )}
                    </td>

                    {/* Line Remarks */}
                    <td className="px-4 py-3.5">
                      <input
                        type="text"
                        placeholder="Remarks"
                        value={item.remarks || ""}
                        onChange={(e) => handleItemFieldChange(idx, "remarks", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-orange-500 bg-white"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="animate-spin" size={14} />
              Saving...
            </span>
          ) : (
            "Confirm Stock Issue"
          )}
        </Button>
      </div>
    </form>
  );
};

export default RationStockIssueForm;
