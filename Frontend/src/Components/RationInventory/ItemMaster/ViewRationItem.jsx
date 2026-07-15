import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowLeft, Tag, Hash, Building2, Scale, Percent, Landmark, ShieldAlert, AlignLeft, Calendar, Image as ImageIcon, Download, Printer } from "lucide-react";

import PageLoader from "../../Common/PageLoader";
import Error from "../../Common/Error";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import Button from "../../Common/Button";
import StatusBadge from "../../Common/StatusBadge";
import { RATION_ITEM_VIEW, TOKEN_KEY } from "../../../Utils/Constants";

const ViewField = ({ label, value, icon: Icon }) => (
  <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl flex items-start gap-3 text-left">
    {Icon && <Icon size={18} className="text-slate-400 mt-0.5 shrink-0" />}
    <div className="flex-1 min-w-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-800 break-words block mt-0.5">
        {value !== null && value !== undefined && value !== "" ? String(value) : "-"}
      </span>
    </div>
  </div>
);

const ViewRationItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadItemDetails = async () => {
      setError("");
      setLoading(true);
      try {
        const instId = location.state?.institution_id || authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
        const response = await fetch(RATION_ITEM_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: Number(id),
            institution_id: instId ? Number(instId) : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Failed to load ration item details");
          return;
        }

        setItem(data.data);
      } catch (err) {
        setError(err.message || "Failed to load ration item details");
      } finally {
        setLoading(false);
      }
    };

    loadItemDetails();
  }, [id]);

  const downloadQR = () => {
    if (!item) return;
    const canvas = document.getElementById("ration-item-qr-canvas-view");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${item.barcode || "RAT000000"}-qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const printQR = () => {
    if (!item) return;
    const printContents = document.getElementById("ration-item-qr-label-container-view").innerHTML;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Label</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              font-family: sans-serif; 
              margin: 0; 
              padding: 20px; 
              background-color: white;
            }
            .qr-wrapper {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
              text-align: center;
              width: 220px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .qr-title { font-weight: bold; font-size: 14px; color: #1e293b; margin-bottom: 8px; }
            .qr-barcode { font-family: monospace; font-size: 11px; color: #64748b; margin-top: 8px; }
            .qr-meta { font-size: 10px; color: #64748b; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="qr-wrapper">
            ${printContents}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!authUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
              <div className="flex items-center gap-4 text-left">
                <button
                  onClick={() => navigate("/ration-inventory/item-master")}
                  className="h-10 w-10 shrink-0 border border-slate-200 bg-white rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-700 hover:border-slate-300 transition shadow-sm cursor-pointer"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    Item Details
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Full overview of inventory item attributes and scanning codes
                  </p>
                </div>
              </div>

              <Error message={error} />

              {loading ? (
                <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <PageLoader />
                </div>
              ) : !item ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-center text-slate-500">
                  Ration item details not found.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 text-left">
                  <div className="flex flex-col gap-6">
                    {/* Basic Info */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-orange-500" />
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                            Basic Information
                          </h3>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <ViewField label="Item Name" value={item.item_name} icon={Tag} />
                        <ViewField label="Item Code" value={item.item_code} icon={Hash} />
                        <ViewField label="Category" value={item.category_name} icon={Building2} />
                        <ViewField label="Unit of Measure" value={`${item.unit_name} (${item.unit_code})`} icon={Scale} />
                        <ViewField label="SKU ID" value={item.sku_id} icon={Hash} />
                        <ViewField
                          label="Created At"
                          value={item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                          icon={Calendar}
                        />
                      </div>

                      <ViewField label="Description" value={item.description} icon={AlignLeft} />

                      {item.image_url && (
                        <div className="grid gap-1.5 mt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Item Photo
                          </span>
                          <img
                            src={item.image_url}
                            alt={item.item_name}
                            className="h-44 w-44 object-cover rounded-xl border border-slate-200/60 shadow-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Stock Configuration */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                          Stock Configuration
                        </h3>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <ViewField label="Minimum Stock Level" value={item.minimum_stock} icon={ShieldAlert} />
                        <ViewField label="Maximum Stock Level" value={item.maximum_stock} icon={ShieldAlert} />
                        <ViewField label="Reorder Quantity" value={item.reorder_quantity} icon={Scale} />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <ViewField label="Batch Tracking Enabled" value={item.batch_tracking ? "Yes" : "No"} icon={ShieldAlert} />
                        <ViewField label="Expiry Tracking Enabled" value={item.expiry_tracking ? "Yes" : "No"} icon={ShieldAlert} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Purchase Info */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                          Purchase Info
                        </h3>
                      </div>

                      <ViewField
                        label="Default Purchase Price"
                        value={item.default_purchase_price ? `₹ ${parseFloat(item.default_purchase_price).toFixed(2)}` : "₹ 0.00"}
                        icon={Landmark}
                      />
                      <ViewField label="GST Percentage" value={`${item.gst_percentage || 0} %`} icon={Percent} />
                    </div>

                    {/* Barcode & QR Label View */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                          Barcode & Label
                        </h3>
                      </div>

                      <ViewField label="Barcode Key" value={item.barcode} icon={Hash} />

                      <div className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                        <div id="ration-item-qr-label-container-view" className="bg-white p-4 border border-slate-200 rounded-xl flex flex-col items-center text-center w-full max-w-[200px]">
                          <span className="text-xs font-bold text-slate-800 truncate w-full max-w-[180px] mb-2">
                            {item.item_name}
                          </span>
                          <div className="bg-white p-1.5 border border-slate-100 rounded-lg">
                            <QRCodeCanvas
                              id="ration-item-qr-canvas-view"
                              value={item.barcode ? `${item.barcode}` : "NONE"}
                              size={120}
                              level="H"
                              includeMargin={true}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 mt-2 font-bold select-all">
                            {item.barcode}
                          </span>
                          {item.sku_id && (
                            <span className="text-[9px] font-semibold text-slate-400 mt-0.5 truncate w-full">
                              SKU: {item.sku_id}
                            </span>
                          )}
                          {item.unit_code && (
                            <span className="text-[9px] font-semibold text-slate-400 truncate w-full">
                              Unit: {item.unit_code}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2 w-full mt-4">
                          <Button
                            type="button"
                            variant="secondary"
                            icon={Download}
                            onClick={downloadQR}
                            className="flex-1 text-[10px] py-1.5 h-8 flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                          >
                            Download
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            icon={Printer}
                            onClick={printQR}
                            className="flex-1 text-[10px] py-1.5 h-8 flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                          >
                            Print
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewRationItem;
