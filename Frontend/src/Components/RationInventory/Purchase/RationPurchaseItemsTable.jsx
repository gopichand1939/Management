import { Trash2, Edit } from "lucide-react";
import Button from "../../Common/Button";

const RationPurchaseItemsTable = ({ items, onEdit, onRemove, readOnly = false }) => {
  const calculateLineTotal = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const discPct = parseFloat(item.discount_percentage) || 0;
    const gstPct = parseFloat(item.gst_percentage) || 0;

    const beforeDisc = qty * price;
    const disc = beforeDisc * (discPct / 100);
    const afterDisc = beforeDisc - disc;
    const gst = afterDisc * (gstPct / 100);
    return beforeDisc - disc + gst;
  };

  const formatDate = (val) => {
    if (!val) return "-";
    try {
      return new Date(val).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return String(val);
    }
  };

  return (
    <div className="overflow-hidden border border-slate-100 bg-white rounded-2xl shadow-sm flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-slate-700 border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3.5 text-center">S.No</th>
              <th className="px-4 py-3.5 text-left">Item Name</th>
              <th className="px-4 py-3.5 text-left">SKU / Barcode</th>
              <th className="px-4 py-3.5 text-left">Batch</th>
              <th className="px-4 py-3.5 text-left">Expiry</th>
              <th className="px-4 py-3.5 text-right">Qty</th>
              <th className="px-4 py-3.5 text-right">Free Qty</th>
              <th className="px-4 py-3.5 text-center">Unit</th>
              <th className="px-4 py-3.5 text-right">Unit Price</th>
              <th className="px-4 py-3.5 text-right">Disc (%)</th>
              <th className="px-4 py-3.5 text-right">GST (%)</th>
              <th className="px-4 py-3.5 text-right">Total</th>
              {!readOnly && <th className="px-4 py-3.5 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 12 : 13}
                  className="px-4 py-10 text-center text-sm font-semibold text-slate-400"
                >
                  No items added yet. Scan or search above to add items.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={index} className="border-b border-slate-50 text-xs font-semibold text-slate-650 hover:bg-slate-50/20">
                  <td className="px-4 py-3.5 text-center text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3.5 text-left">
                    <div className="font-bold text-slate-800">{item.item_name}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">{item.item_code}</div>
                  </td>
                  <td className="px-4 py-3.5 text-left">
                    <div>{item.sku_id}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.barcode}</div>
                  </td>
                  <td className="px-4 py-3.5 text-left">{item.batch_number || "-"}</td>
                  <td className="px-4 py-3.5 text-left">{formatDate(item.expiry_date)}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-800">
                    {parseFloat(item.quantity).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-500">
                    {item.free_quantity ? parseFloat(item.free_quantity).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="bg-slate-100 text-slate-650 rounded-lg px-2 py-0.5 text-[10px] font-bold">
                      {item.unit_code}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    ₹{parseFloat(item.unit_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {item.discount_percentage ? `${parseFloat(item.discount_percentage)}%` : "-"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {item.gst_percentage ? `${parseFloat(item.gst_percentage)}%` : "-"}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-800">
                    ₹{calculateLineTotal(item).toFixed(2)}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(index)}
                          className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(index)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RationPurchaseItemsTable;
