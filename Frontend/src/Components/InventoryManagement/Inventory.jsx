import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Plus,
} from "lucide-react";

import ActionPopOver from "../Common/ActionPopOver";
import Error from "../Common/Error";
import FilePreviewModal from "../Common/FilePreviewModal";
import PageLoader from "../Common/PageLoader";
import SearchBar from "../Common/SearchBar";
import StatusBadge from "../Common/StatusBadge";
import Table from "../Common/Table";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import {
  INVENTORY_DELETE,
  INVENTORY_LIST,
  TOKEN_KEY,
} from "../../Utils/Constants";
import {
  hasMenuAction,
  MENU_ACTIONS,
} from "../../Utils/MenuPermissions";

const columns = [
  {
    key: "photo",
    label: "Photo",
  },
  {
    key: "item_name",
    label: "Item",
  },
  {
    key: "category",
    label: "Category",
  },
  {
    key: "location",
    label: "Location",
  },
  {
    key: "quantity",
    label: "Qty",
  },
  {
    key: "purchase_price",
    label: "Unit Price",
  },
  {
    key: "total_amount",
    label: "Final Amount",
  },
  {
    key: "status",
    label: "Status",
  },
];

const getInventoryAmount = (inventory) => {
  return Number(inventory.purchase_price || 0) * Number(inventory.quantity || 0);
};

const getMonthKey = (date) => {
  if (!date) {
    return "";
  }

  return String(date).slice(0, 7);
};

const getMonthLabel = (monthKey) => {
  if (!monthKey) {
    return "";
  }

  const monthDate = new Date(`${monthKey}-01T00:00:00`);

  return monthDate.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const Inventory = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const [inventories, setInventories] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const canCreate = hasMenuAction(authUser, "/inventory", MENU_ACTIONS.CREATE);
  const canEdit = hasMenuAction(authUser, "/inventory", MENU_ACTIONS.EDIT);
  const canView = hasMenuAction(authUser, "/inventory", MENU_ACTIONS.VIEW);
  const canDelete = hasMenuAction(authUser, "/inventory", MENU_ACTIONS.DELETE);

  const getInventoryList = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(INVENTORY_LIST, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Inventory list failed");
        return;
      }

      setInventories(data.inventories || []);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getInventoryList();
  }, []);

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm("Delete this inventory item?");

    if (!shouldDelete) {
      return;
    }

    setError("");

    try {
      const response = await fetch(INVENTORY_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Inventory delete failed");
        return;
      }

      setInventories((currentInventories) => {
        return currentInventories.filter((inventory) => inventory.id !== id);
      });
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  const monthlyReports = useMemo(() => {
    const reportMap = new Map();

    inventories.forEach((inventory) => {
      const monthKey = getMonthKey(inventory.purchase_date);

      if (!monthKey) {
        return;
      }

      const currentReport = reportMap.get(monthKey) || {
        monthKey,
        monthLabel: getMonthLabel(monthKey),
        itemCount: 0,
        quantity: 0,
        amount: 0,
      };

      currentReport.itemCount += 1;
      currentReport.quantity += Number(inventory.quantity || 0);
      currentReport.amount += getInventoryAmount(inventory);

      reportMap.set(monthKey, currentReport);
    });

    return Array.from(reportMap.values()).sort((firstReport, secondReport) => {
      return secondReport.monthKey.localeCompare(firstReport.monthKey);
    });
  }, [inventories]);

  const monthFilteredInventories = useMemo(() => {
    if (selectedMonth === "all") {
      return inventories;
    }

    return inventories.filter((inventory) => {
      return getMonthKey(inventory.purchase_date) === selectedMonth;
    });
  }, [inventories, selectedMonth]);

  const filteredInventories = useMemo(() => {
    return monthFilteredInventories.filter((inventory) => {
      const term = searchText.toLowerCase();

      return (
        inventory.item_name?.toLowerCase().includes(term) ||
        inventory.category?.toLowerCase().includes(term) ||
        inventory.supplier_name?.toLowerCase().includes(term) ||
        inventory.room_no?.toLowerCase().includes(term) ||
        inventory.inventory_id?.toLowerCase().includes(term)
      );
    });
  }, [monthFilteredInventories, searchText]);

  const activeMonthReport = monthlyReports.find((report) => {
    return report.monthKey === selectedMonth;
  });
  const totalCount = monthFilteredInventories.length;
  const totalQuantity = monthFilteredInventories.reduce((total, item) => {
    return total + Number(item.quantity || 0);
  }, 0);
  const totalValue = monthFilteredInventories.reduce((total, item) => {
    return total + getInventoryAmount(item);
  }, 0);

  const tableData = filteredInventories.map((inventory) => {
    const purchasePrice = Number(inventory.purchase_price || 0);
    const quantity = Number(inventory.quantity || 0);
    const totalAmount = purchasePrice * quantity;

    return {
      ...inventory,
      photo: inventory.item_photo?.file_url ? (
        <button
          type="button"
          onClick={() => setPreviewPhoto(inventory.item_photo)}
          className="block h-12 w-12 overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm transition-all hover:scale-105 hover:border-orange-200"
          title="Preview image"
        >
          <img
            src={inventory.item_photo.file_url}
            alt={inventory.item_name}
            className="h-full w-full object-cover"
          />
        </button>
      ) : (
        <span className="grid h-12 w-12 place-items-center rounded-lg border border-slate-100 bg-slate-50 text-xs font-bold text-slate-400">
          No
        </span>
      ),
      item_name: (
        <div className="flex items-center gap-3 text-left">
          <span className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-xs border border-orange-100 uppercase">
            {inventory.item_name?.charAt(0) || "I"}
          </span>
          <span>
            <span className="font-bold text-slate-800 block">{inventory.item_name}</span>
            <span className="text-xs text-slate-400">{inventory.inventory_id}</span>
          </span>
        </div>
      ),
      location: (
        <span className="text-slate-600">
          {inventory.institution_name || "Institution"} / {inventory.floor_name || "Not Required"} / {inventory.room_no}
        </span>
      ),
      purchase_price: `Rs. ${purchasePrice.toLocaleString("en-IN")}`,
      total_amount: `Rs. ${totalAmount.toLocaleString("en-IN")}`,
      status: <StatusBadge label={inventory.status} />,
    };
  });

  const renderActions = (inventory) => {
    return (
      <ActionPopOver
        onView={canView ? () => navigate(`/inventory/view/${inventory.id}`) : null}
        onEdit={canEdit ? () => navigate(`/inventory/edit/${inventory.id}`) : null}
        onDelete={canDelete ? () => handleDelete(inventory.id) : null}
      />
    );
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-4 lg:pt-5 pb-6 px-4 md:px-6">
            <div className="mx-auto w-full max-w-6xl flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="text-left">
                  <h1 className="text-xl font-black text-slate-800 tracking-tight">
                    Inventory Management
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage institution inventory items
                  </p>
                </div>

                {canCreate && (
                  <button
                    className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition-all duration-200 hover:bg-orange-600 hover:shadow-md hover:shadow-orange-500/25"
                    type="button"
                    onClick={() => navigate("/inventory/add")}
                  >
                    <Plus size={16} />
                    <span>Add Inventory</span>
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-3">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                      <CalendarDays size={18} />
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-500">
                        Monthly Purchase Report
                      </span>
                      <h2 className="mt-1 text-lg font-black text-slate-800">
                        {selectedMonth === "all"
                          ? "All purchase months"
                          : activeMonthReport?.monthLabel || "Selected month"}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Showing only months where inventory purchases exist
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-orange-50 px-4 py-3">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-orange-500">
                        Purchases
                      </span>
                      <strong className="mt-1 block text-xl font-black text-slate-800">
                        {totalCount}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-blue-50 px-4 py-3">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-blue-500">
                        Quantity
                      </span>
                      <strong className="mt-1 block text-xl font-black text-slate-800">
                        {totalQuantity}
                      </strong>
                    </div>

                    <div className="col-span-2 rounded-xl bg-emerald-50 px-4 py-3 sm:col-span-1">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                        Amount
                      </span>
                      <strong className="mt-1 block text-xl font-black text-slate-800">
                        Rs. {totalValue.toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMonth("all")}
                    className={`rounded-full border px-4 py-2 text-xs font-black transition-all ${
                      selectedMonth === "all"
                        ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                        : "border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500"
                    }`}
                  >
                    All Months
                  </button>

                  {monthlyReports.map((report) => (
                    <button
                      key={report.monthKey}
                      type="button"
                      onClick={() => setSelectedMonth(report.monthKey)}
                      className={`rounded-full border px-4 py-2 text-xs font-black transition-all ${
                        selectedMonth === report.monthKey
                          ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                          : "border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500"
                      }`}
                    >
                      {report.monthLabel} - {report.itemCount} purchases
                    </button>
                  ))}
                </div>
              </div>

              <SearchBar
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by item, category, supplier or room..."
              />

              <div className="flex flex-col gap-4">
                <Error message={error} />

                {loading ? (
                  <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                    <PageLoader />
                  </div>
                ) : (
                  <Table
                    columns={columns}
                    data={tableData}
                    renderActions={canView || canEdit || canDelete ? renderActions : null}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <FilePreviewModal
        file={previewPhoto}
        title="Inventory Image Preview"
        onClose={() => setPreviewPhoto(null)}
      />
    </div>
  );
};

export default Inventory;
