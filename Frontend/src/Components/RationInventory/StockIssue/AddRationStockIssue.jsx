import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Calendar } from "lucide-react";

import PageLoader from "../../Common/PageLoader";
import RationItemScanner from "../Purchase/RationItemScanner";
import RationStockIssueForm from "./RationStockIssueForm";
import Sidebar from "../../Layout/Sidebar";
import Navbar from "../../Layout/Navbar";
import {
  RATION_STOCK_ISSUE_APPROVED_REQUEST_VIEW,
  RATION_STOCK_ISSUE_NEXT_NUMBER,
  RATION_STOCK_ISSUE_CREATE,
  TOKEN_KEY
} from "../../../Utils/Constants";

const AddRationStockIssue = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const scannerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    issue_number: "",
    issue_date: new Date().toISOString().substring(0, 10),
    request_number: "",
    required_date: "",
    meal_type: "",
    priority: "",
    remarks: "",
    kitchen_request_id: requestId
  });

  const [items, setItems] = useState([]);
  const [scannedIndex, setScannedIndex] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const instId = authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
        if (!instId) {
          throw new Error("Institution selection required");
        }

        // Fetch Next Issue Number
        const nextNumRes = await fetch(RATION_STOCK_ISSUE_NEXT_NUMBER, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ institution_id: Number(instId) })
        });
        const nextNumData = await nextNumRes.json();
        const issueNumber = nextNumRes.ok ? nextNumData.data?.issue_number : "Auto-generating...";

        // Fetch Approved Request Details
        const viewRes = await fetch(RATION_STOCK_ISSUE_APPROVED_REQUEST_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            request_id: Number(requestId),
            institution_id: Number(instId)
          })
        });
        const viewData = await viewRes.json();

        if (!viewRes.ok) {
          throw new Error(viewData.message || "Failed to load kitchen request");
        }

        const header = viewData.data?.header;
        const dbItems = viewData.data?.items || [];

        setFormData((prev) => ({
          ...prev,
          issue_number: issueNumber,
          request_number: header.request_number,
          required_date: header.required_date,
          meal_type: header.meal_type_name,
          priority: header.priority,
          kitchen_request_id: header.id
        }));

        // Map items and initialize issue_quantity and FIFO batch defaults
        const mappedItems = dbItems.map((item) => {
          const firstBatch = item.batches && item.batches.length > 0 ? item.batches[0] : null;
          return {
            ...item,
            issue_quantity: "",
            batch_number: firstBatch ? firstBatch.batch_number : "",
            expiry_date: firstBatch ? firstBatch.expiry_date : "",
            remarks: ""
          };
        });

        setItems(mappedItems);

      } catch (err) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [requestId, authUser]);

  // QR / Barcode Scan Matcher
  const handleItemScanned = (scannedItem) => {
    setScannedIndex(null);
    setToast(null);

    // Look for scanned barcode or ID match in approved request items
    const matchIndex = items.findIndex(
      (item) => item.item_id === scannedItem.id || (scannedItem.barcode && item.barcode === scannedItem.barcode)
    );

    if (matchIndex === -1) {
      setToast({ message: "This item is not part of the approved kitchen request", type: "error" });
      return;
    }

    setScannedIndex(matchIndex);
    setToast({ message: `Scanned: ${scannedItem.item_name}. Focus set to row.`, type: "success" });

    // Focus and select input field for this index
    setTimeout(() => {
      const el = document.getElementById(`issue-qty-input-${matchIndex}`);
      if (el) {
        el.focus();
        el.select();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const handleConfirmIssue = async () => {
    setError(null);

    const issueItems = items
      .filter((item) => item.issue_quantity && parseFloat(item.issue_quantity) > 0)
      .map((item) => ({
        kitchen_request_item_id: item.kitchen_request_item_id,
        item_id: item.item_id,
        issue_quantity: parseFloat(item.issue_quantity),
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null,
        remarks: item.remarks || null
      }));

    if (issueItems.length === 0) {
      setError("Please specify an issue quantity greater than 0 for at least one item.");
      return;
    }

    // Validation checks
    for (const issueItem of issueItems) {
      const originalItem = items.find((i) => i.kitchen_request_item_id === issueItem.kitchen_request_item_id);
      const remaining = parseFloat(originalItem.remaining_quantity || 0);
      const stock = parseFloat(originalItem.current_stock || 0);

      if (issueItem.issue_quantity > remaining) {
        setError(`Issue quantity for ${originalItem.item_name} cannot exceed remaining approved quantity (${remaining}).`);
        return;
      }
      if (issueItem.issue_quantity > stock) {
        setError(`Issue quantity for ${originalItem.item_name} cannot exceed current stock (${stock}).`);
        return;
      }
      if (originalItem.batch_tracking && (!issueItem.batch_number || !issueItem.batch_number.trim())) {
        setError(`Batch number is required for item ${originalItem.item_name}.`);
        return;
      }
      if (originalItem.expiry_tracking && !issueItem.expiry_date) {
        setError(`Expiry date is required for item ${originalItem.item_name}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const instId = authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
      const response = await fetch(RATION_STOCK_ISSUE_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          institution_id: Number(instId),
          kitchen_request_id: Number(formData.kitchen_request_id),
          issue_date: formData.issue_date,
          remarks: formData.remarks,
          items: issueItems
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create stock issue");
      }

      navigate("/ration-inventory/stock-issue");

    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center text-left">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">New Stock Issue</h1>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  Scan item barcode or manually search and enter issue quantities.
                </p>
              </div>
            </div>

            {/* QR/Barcode Scanner Section */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-orange-500" />
                Barcode & QR Code Scanner
              </h3>
              <RationItemScanner
                ref={scannerRef}
                onItemSelected={handleItemScanned}
                institutionId={Number(authUser?.institution_id || sessionStorage.getItem("selected_institution_id"))}
              />

              {toast && (
                <div className={`mt-4 p-3 text-xs font-bold rounded-xl border ${
                  toast.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-red-50 text-red-700 border-red-100"
                }`}>
                  {toast.message}
                </div>
              )}
            </div>

            {/* Stock Issue Form */}
            <RationStockIssueForm
              formData={formData}
              setFormData={setFormData}
              items={items}
              setItems={setItems}
              scannedIndex={scannedIndex}
              onConfirm={handleConfirmIssue}
              onCancel={() => navigate("/ration-inventory/stock-issue")}
              submitting={submitting}
              error={error}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddRationStockIssue;

