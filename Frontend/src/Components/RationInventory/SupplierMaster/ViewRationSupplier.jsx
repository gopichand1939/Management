import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  AlignLeft,
  Clock3,
  Hash,
  User,
  Phone,
  Mail,
  FileText,
  CreditCard,
  MapPin,
  ArrowLeft
} from "lucide-react";

import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import StatusBadge from "../../Common/StatusBadge";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import Button from "../../Common/Button";
import {
  RATION_SUPPLIER_VIEW,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const formatDate = (value) => {
  if (!value) {
    return "-";
  }
  try {
    return new Date(value).toLocaleString();
  } catch (e) {
    return String(value);
  }
};

const ViewRationSupplier = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useSelector((state) => state.user);
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const getSupplier = async () => {
      setLoading(true);
      setError("");

      try {
        const instId = location.state?.institution_id || authUser?.institution_id || sessionStorage.getItem("selected_institution_id");
        const response = await fetch(RATION_SUPPLIER_VIEW, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            institution_id: instId ? Number(instId) : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Ration supplier fetch failed");
          return;
        }

        setSupplier(data.data || null);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    getSupplier();
  }, [id]);

  const details = supplier
    ? [
        {
          key: "name",
          label: "Supplier Name",
          value: supplier.supplier_name || "-",
          icon: User,
        },
        {
          key: "code",
          label: "Supplier Code",
          value: supplier.supplier_code || "-",
          icon: Hash,
        },
        {
          key: "contact_person",
          label: "Contact Person",
          value: supplier.contact_person || "-",
          icon: User,
        },
        {
          key: "phone",
          label: "Phone Number",
          value: supplier.phone || "-",
          icon: Phone,
        },
        {
          key: "alternate_phone",
          label: "Alternate Phone",
          value: supplier.alternate_phone || "-",
          icon: Phone,
        },
        {
          key: "email",
          label: "Email Address",
          value: supplier.email || "-",
          icon: Mail,
        },
        {
          key: "gst_number",
          label: "GST Number",
          value: supplier.gst_number || "-",
          icon: FileText,
        },
        {
          key: "pan_number",
          label: "PAN Number",
          value: supplier.pan_number || "-",
          icon: CreditCard,
        },
        {
          key: "city",
          label: "City",
          value: supplier.city || "-",
          icon: MapPin,
        },
        {
          key: "state",
          label: "State",
          value: supplier.state || "-",
          icon: MapPin,
        },
        {
          key: "pincode",
          label: "Pincode",
          value: supplier.pincode || "-",
          icon: MapPin,
        },
        {
          key: "payment_terms",
          label: "Payment Terms",
          value: supplier.payment_terms || "-",
          icon: CreditCard,
        },
        {
          key: "address",
          label: "Address",
          value: supplier.address || "-",
          icon: MapPin,
        },
        {
          key: "description",
          label: "Description",
          value: supplier.description || "-",
          icon: AlignLeft,
        },
        {
          key: "created_at",
          label: "Created Date",
          value: formatDate(supplier.created_at),
          icon: Clock3,
        },
        {
          key: "updated_at",
          label: "Updated Date",
          value: formatDate(supplier.updated_at),
          icon: Clock3,
        },
      ]
    : [];

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
            <div className="max-w-[720px] mx-auto w-full flex flex-col gap-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-left">
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    Supplier Details
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    View ration supplier master information
                  </p>
                </div>
                <Button
                  variant="secondary"
                  icon={ArrowLeft}
                  onClick={() => navigate("/ration-inventory/supplier-master")}
                >
                  Back to List
                </Button>
              </div>

              <Error message={error} />

              {loading ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                supplier && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm grid gap-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-black text-slate-800">
                          {supplier.supplier_name}
                        </h2>
                        <p className="text-sm font-semibold text-slate-400 mt-1">
                          {supplier.supplier_code || "No Code"}
                        </p>
                      </div>

                      <StatusBadge label={supplier.status || "active"} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {details.map((detail) => {
                        const Icon = detail.icon;

                        return (
                          <div
                            key={detail.key}
                            className={`rounded-xl border border-slate-100 bg-slate-50/70 p-4 ${
                              detail.key === "address" || detail.key === "description" ? "md:col-span-2" : ""
                            }`}
                          >
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                              <Icon size={14} className="text-orange-500" />
                              {detail.label}
                            </span>
                            <p className="mt-2 text-sm font-semibold text-slate-700 break-words whitespace-pre-wrap">
                              {detail.value}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewRationSupplier;
