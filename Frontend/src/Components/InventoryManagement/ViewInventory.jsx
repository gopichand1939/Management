import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  IndianRupee,
  Layers3,
  Package,
  Store,
} from "lucide-react";

import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import StatusBadge from "../Common/StatusBadge";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import {
  INVENTORY_VIEW,
  TOKEN_KEY,
} from "../../Utils/Constants";

const DetailRow = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      <p className="text-slate-700 font-semibold flex items-center gap-2 mt-1">
        {Icon && <Icon size={16} className="text-slate-400" />}
        {value || "-"}
      </p>
    </div>
  );
};

const ViewInventory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const getInventory = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(INVENTORY_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Inventory fetch failed");
          return;
        }

        setInventory(data.inventory || null);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    getInventory();
  }, [id]);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 md:gap-8">
              <div className="flex items-start gap-3 text-left">
                <button
                  type="button"
                  onClick={() => navigate("/inventory")}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                  title="Back to inventory"
                >
                  <ArrowLeft size={18} />
                </button>

                <div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    Inventory Details
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    View institution inventory item information
                  </p>
                </div>
              </div>

              <Error message={error} />

              {loading ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                  <PageLoader />
                </div>
              ) : inventory ? (
                <div className="bg-white border border-slate-100 rounded-2xl w-full p-6 md:p-8 shadow-sm animate-[floatIn_480ms_ease]">
                  <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_286px]">
                    <div className="grid gap-5 md:grid-cols-2 content-start">
                      <DetailRow icon={Package} label="Inventory ID" value={inventory.inventory_id} />
                      <DetailRow icon={Package} label="Item Name" value={inventory.item_name} />
                      <DetailRow icon={Building2} label="Institution" value={inventory.institution_name} />
                      <DetailRow icon={Layers3} label="Floor" value={inventory.floor_name || "Not Required"} />
                      <DetailRow label="Room No" value={inventory.room_no} />
                      <DetailRow label="Category" value={inventory.category} />
                      <DetailRow label="Quantity" value={inventory.quantity} />
                      <DetailRow icon={IndianRupee} label="Purchase Price" value={`Rs. ${Number(inventory.purchase_price || 0).toLocaleString("en-IN")}`} />
                      <DetailRow icon={CalendarDays} label="Purchase Date" value={inventory.purchase_date?.slice(0, 10)} />
                      <DetailRow icon={Store} label="Supplier" value={inventory.supplier_name} />
                      <DetailRow label="Condition" value={inventory.condition} />
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Status
                        </span>
                        <StatusBadge label={inventory.status} />
                      </div>
                      <div className="md:col-span-2">
                        <DetailRow label="Remarks" value={inventory.remarks} />
                      </div>
                    </div>

                    <div className="xl:border-l xl:border-slate-100 xl:pl-8">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                        Item Photo
                      </span>

                      {inventory.item_photo?.file_url ? (
                        <img
                          src={inventory.item_photo.file_url}
                          alt={inventory.item_name}
                          className="block h-auto w-full rounded-2xl border border-slate-100 bg-slate-50 object-contain shadow-sm"
                        />
                      ) : (
                        <div className="grid min-h-[160px] w-full place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
                          No photo uploaded
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-red-600 text-sm font-semibold">
                  Inventory not found
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewInventory;
