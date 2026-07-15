import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  Building2,
  FileText,
  Clock,
  Printer,
  ArrowLeft,
  DollarSign,
  AlertTriangle,
  Notebook
} from "lucide-react";

import Button from "../../Common/Button";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import RationPurchaseItemsTable from "./RationPurchaseItemsTable";
import CompleteRationPurchase from "./CompleteRationPurchase";
import CancelRationPurchase from "./CancelRationPurchase";
import DeleteDraftRationPurchase from "./DeleteDraftRationPurchase";
import { RATION_PURCHASE_VIEW, TOKEN_KEY } from "../../../Utils/Constants";

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return String(value);
  }
};

const ViewRationPurchase = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Action Modals State
  const [showComplete, setShowComplete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const fetchPurchase = async () => {
    setLoading(true);
    setError("");

    try {
      const instId = location.state?.institution_id || authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
      const response = await fetch(RATION_PURCHASE_VIEW, {
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
        setError(data.message || "Failed to fetch purchase details");
        return;
      }

      setPurchase(data.data || null);
    } catch (apiError) {
      setError(apiError.message || "Failed to load purchase details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchase();
  }, [id, authUser]);

  const handlePrint = () => {
    window.print();
  };

  const handleActionSuccess = (message) => {
    fetchPurchase();
    // Navigate back to history with a success message
    navigate("/ration-inventory/purchases/history", {
      state: { toastMessage: message, toastType: "success" }
    });
  };

  if (!authUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <PageLoader />
      </div>
    );
  }

  const formatCurrency = (val) => {
    return `₹${parseFloat(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      {/* Hide Sidebar & Navbar when printing */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden print:h-auto print:overflow-visible">
        <div className="print:hidden">
          <Navbar />
        </div>

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0 print:bg-white print:p-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8 print:p-0">
            <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
              
              {/* Header section (hidden during print) */}
              <div className="flex items-center justify-between gap-3 print:hidden">
                <div className="text-left">
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    Purchase Details
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Invoice view and purchase management actions
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    icon={ArrowLeft}
                    onClick={() => navigate("/ration-inventory/purchases/history")}
                  >
                    Back to History
                  </Button>
                  {purchase && (
                    <Button variant="secondary" icon={Printer} onClick={handlePrint}>
                      Print Invoice
                    </Button>
                  )}
                </div>
              </div>

              <Error message={error} />

              {loading ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                purchase && (
                  <div className="flex flex-col gap-6 print:border-0">
                    
                    {/* INVOICE CARD */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm flex flex-col gap-6 text-left print:border-0 print:shadow-none print:p-0">
                                           {/* Brand & Invoice Header */}
                      <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-6">
                        <div>
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-wider">
                            Ration Purchase Record
                          </span>
                          <h2 className="text-2xl font-black text-slate-800 mt-1">
                            {purchase.purchase_number}
                          </h2>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold ${
                              purchase.status === "completed"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : purchase.status === "cancelled"
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : "bg-amber-50 text-amber-600 border border-amber-100"
                            }`}>
                              Status: {purchase.status?.toUpperCase()}
                            </span>
                            <span className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold ${
                              purchase.payment_status === "paid"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : purchase.payment_status === "partially_paid"
                                ? "bg-blue-50 text-blue-600 border border-blue-100"
                                : "bg-red-50 text-red-650 border border-red-100"
                            }`}>
                              Payment: {purchase.payment_status?.replace("_", " ")?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="text-left md:text-right text-xs font-semibold text-slate-500 flex flex-col gap-1.5 justify-end">
                          <span className="flex items-center md:justify-end gap-1.5">
                            <Calendar size={13} className="text-slate-400" />
                            Date: {formatDate(purchase.purchase_date)}
                          </span>
                          {(purchase.invoice_number || purchase.supplier_invoice_number) && (
                            <span className="flex items-center md:justify-end gap-1.5">
                              <FileText size={13} className="text-slate-400" />
                              Supplier Invoice: {purchase.invoice_number || purchase.supplier_invoice_number}
                            </span>
                          )}
                          {purchase.invoice_date && (
                            <span className="flex items-center md:justify-end gap-1.5">
                              <Calendar size={13} className="text-slate-400" />
                              Invoice Date: {formatDate(purchase.invoice_date)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Info Blocks: Supplier vs Institution */}
                      <div className="grid md:grid-cols-2 gap-6 pb-4">
                        <div className="p-4 bg-slate-50/60 rounded-2xl border">
                          <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                            <Building2 size={13} className="text-orange-500" />
                            Supplier Details
                          </h4>
                          <div className="text-sm font-bold text-slate-800">
                            {purchase.supplier?.supplier_name || purchase.supplier_name}
                          </div>
                          {(purchase.supplier?.supplier_code || purchase.supplier_code) && (
                            <div className="text-xs font-semibold text-slate-450 mt-1">
                              Supplier Code: {purchase.supplier?.supplier_code || purchase.supplier_code}
                            </div>
                          )}
                          {(purchase.supplier?.mobile || purchase.mobile) && (
                            <div className="text-xs font-semibold text-slate-450 mt-1">
                              Mobile: {purchase.supplier?.mobile || purchase.mobile}
                            </div>
                          )}
                        </div>

                        <div className="p-4 bg-slate-50/60 rounded-2xl border">
                          <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                            <Clock size={13} className="text-orange-500" />
                            Metadata Logs
                          </h4>
                          <div className="text-xs font-semibold text-slate-650 flex flex-col gap-1">
                            <span>Created At: {new Date(purchase.created_at).toLocaleString()}</span>
                            {purchase.updated_at && (
                              <span>Updated At: {new Date(purchase.updated_at).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Items Grid */}
                      <div className="flex flex-col gap-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Invoice Items List
                        </h4>
                        <RationPurchaseItemsTable
                          items={(purchase.items || []).map((it) => ({
                            item_name: it.item_name,
                            item_code: it.item_code,
                            sku_id: it.sku_id,
                            barcode: it.barcode,
                            unit_code: it.unit?.unit_code || "",
                            quantity: it.purchase_information?.quantity || 0,
                            free_quantity: it.purchase_information?.free_quantity || 0,
                            unit_price: it.purchase_information?.unit_price || 0,
                            discount_percentage: it.purchase_information?.discount_percentage || 0,
                            gst_percentage: it.purchase_information?.gst_percentage || 0,
                            batch_number: it.batch?.batch_number || null,
                            expiry_date: it.batch?.expiry_date || null
                          }))}
                          readOnly={true}
                        />
                      </div>

                      {/* Totals and Notes */}
                      <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                        <div className="flex flex-col gap-2">
                          {purchase.notes && (
                            <div className="p-4 bg-slate-50/60 border rounded-2xl">
                              <h5 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                <Notebook size={12} className="text-orange-500" />
                                Notes / Remarks
                              </h5>
                              <p className="text-xs font-semibold text-slate-600 break-words whitespace-pre-wrap leading-relaxed">
                                {purchase.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="text-slate-800">{formatCurrency(purchase.sub_total)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Discount Total:</span>
                            <span className="text-red-505">-{formatCurrency(purchase.discount_amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST Total:</span>
                            <span className="text-slate-800">+{formatCurrency(purchase.gst_amount)}</span>
                          </div>
                          {purchase.other_charges > 0 && (
                            <div className="flex justify-between">
                              <span>Other Charges:</span>
                              <span className="text-slate-800">+{formatCurrency(purchase.other_charges)}</span>
                            </div>
                          )}
                          {Math.abs(purchase.round_off) > 0.001 && (
                            <div className="flex justify-between">
                              <span>Round Off:</span>
                              <span className="text-slate-500">
                                {purchase.round_off >= 0 ? "+" : ""}
                                {formatCurrency(purchase.round_off)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-2.5 font-black text-base text-slate-800">
                            <span>Grand Total:</span>
                            <span>{formatCurrency(purchase.grand_total)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Paid Amount:</span>
                            <span className="text-slate-800">{formatCurrency(purchase.paid_amount)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2 font-black text-slate-500">
                            <span>Balance Due:</span>
                            <span className="text-slate-700">{formatCurrency(purchase.balance_amount)}</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* ACTIONS TOOLBAR (hidden when printing) */}
                    {purchase.status !== "cancelled" && (
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-wrap items-center gap-3 print:hidden">
                        <span className="text-xs font-black text-slate-450 uppercase tracking-wider mr-auto">
                          Purchase Actions
                        </span>

                        {purchase.status === "draft" && (
                          <>
                            <Button
                              onClick={() =>
                                navigate(`/ration-inventory/purchases/edit/${purchase.id}`, {
                                  state: { institution_id: purchase.institution_id },
                                })
                              }
                            >
                              Edit Purchase
                            </Button>
                            <Button onClick={() => setShowComplete(true)}>
                              Complete Purchase
                            </Button>
                            <Button variant="secondary" onClick={() => setShowDelete(true)}>
                              Delete Draft
                            </Button>
                          </>
                        )}

                        {purchase.status === "completed" && (
                          <Button variant="secondary" onClick={() => setShowCancel(true)}>
                            Cancel Purchase
                          </Button>
                        )}
                      </div>
                    )}

                  </div>
                )
              )}

            </div>
          </div>
        </main>
      </div>

      {/* Action Modals */}
      {purchase && showComplete && (
        <CompleteRationPurchase
          purchase={purchase}
          onClose={() => setShowComplete(false)}
          onSuccess={() => handleActionSuccess("Ration purchase order completed successfully.")}
        />
      )}

      {purchase && showCancel && (
        <CancelRationPurchase
          purchase={purchase}
          onClose={() => setShowCancel(false)}
          onSuccess={() => handleActionSuccess("Ration purchase order cancelled successfully.")}
        />
      )}

      {purchase && showDelete && (
        <DeleteDraftRationPurchase
          purchase={purchase}
          onClose={() => setShowDelete(false)}
          onSuccess={() => handleActionSuccess("Draft purchase order deleted successfully.")}
        />
      )}
    </div>
  );
};

export default ViewRationPurchase;
