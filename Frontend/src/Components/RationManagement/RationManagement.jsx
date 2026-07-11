import { useMemo, useState } from "react";
import { AlertTriangle, Archive, ArrowDown, ArrowRight, Boxes, IndianRupee, Download, PackagePlus, Plus, Scale, ShoppingCart, Soup, Trash2, TrendingDown, Warehouse, X } from "lucide-react";

import Button from "../Common/Button";
import SearchBar from "../Common/SearchBar";
import Table from "../Common/Table";
import Header from "../Layout/Header";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import { consumption, lowStock, purchaseHistory, stock, wastage } from "./rationData";

const availableStock = (item) => item.openingStock + item.purchased - item.consumed - item.wastage;
const statusFor = (item) => {
  const available = availableStock(item);
  if (available <= item.minimumStock * 0.75) return "Critical";
  if (available <= item.minimumStock) return "Low Stock";
  return "Healthy";
};

const StatusPill = ({ status }) => {
  const style = status === "Healthy" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "Low Stock" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-rose-200 bg-rose-50 text-rose-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${style}`}>{status}</span>;
};

const Section = ({ title, subtitle, children, action }) => (
  <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div><h2 className="text-lg font-extrabold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div>{action}
    </div>{children}
  </section>
);

const RationManagement = () => {
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(false);
  const stockRows = useMemo(() => stock.filter((item) => `${item.itemName} ${item.category} ${item.unit}`.toLowerCase().includes(query.toLowerCase())).map((item) => ({ ...item, available: `${availableStock(item)} ${item.unit}`, status: <StatusPill status={statusFor(item)} /> })), [query]);
  const showDemoToast = () => { setToast(true); window.setTimeout(() => setToast(false), 2200); };
  const summary = [
    ["Total Items", "45 Items", Boxes, "bg-blue-50 text-blue-600"], ["Available Stock", "785 KG", Warehouse, "bg-emerald-50 text-emerald-600"], ["Today's Consumption", "48 KG", Soup, "bg-violet-50 text-violet-600"], ["Today's Wastage", "3 KG", Trash2, "bg-rose-50 text-rose-600"], ["Low Stock Items", "5 Items", AlertTriangle, "bg-amber-50 text-amber-600"], ["Today's Purchase Value", "₹18,750", IndianRupee, "bg-orange-50 text-orange-600"],
  ];
  const tableColumns = [{ key: "itemName", label: "Item Name" }, { key: "category", label: "Category" }, { key: "unit", label: "Unit" }, { key: "openingStock", label: "Opening Stock" }, { key: "purchased", label: "Purchased" }, { key: "consumed", label: "Consumed" }, { key: "wastage", label: "Wastage" }, { key: "available", label: "Available Stock" }, { key: "minimumStock", label: "Minimum Stock" }, { key: "status", label: "Status" }];

  return <div className="flex min-h-screen bg-slate-50/70"><Sidebar /><div className="flex min-w-0 flex-1 flex-col"><Navbar /><main className="flex-1 p-4 sm:p-6 lg:p-8">
    <Header title="Ration Management" subtitle="Monitor stock, purchases, consumption and wastage from one place." />
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{summary.map(([label, value, Icon, style]) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${style}`}><Icon size={19} /></div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p></div>)}</div>
    <div className="mt-6 space-y-6">
      <Section title="Current Stock" subtitle="Live calculated balance across ration inventory." action={<SearchBar value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stock..." />}><Table columns={tableColumns} data={stockRows} /></Section>
      <Section title="Purchase History" subtitle="Recent supplies received by institution."><Table columns={[{key:"purchaseId",label:"Purchase ID"},{key:"date",label:"Date"},{key:"supplier",label:"Supplier"},{key:"item",label:"Item"},{key:"quantity",label:"Quantity"},{key:"unit",label:"Unit"},{key:"amount",label:"Amount"},{key:"institution",label:"Institution"}]} data={purchaseHistory} /></Section>
      <Section title="Daily Consumption" subtitle="Meal-wise ration usage for daily service."><Table columns={[{key:"date",label:"Date"},{key:"mealType",label:"Meal Type"},{key:"item",label:"Item"},{key:"quantityUsed",label:"Quantity Used"},{key:"unit",label:"Unit"},{key:"remarks",label:"Remarks"}]} data={consumption} /></Section>
      <Section title="Wastage" subtitle="Recorded stock loss with reasons and accountability."><Table columns={[{key:"date",label:"Date"},{key:"item",label:"Item"},{key:"quantity",label:"Quantity"},{key:"reason",label:"Reason"},{key:"recordedBy",label:"Recorded By"}]} data={wastage} /></Section>
      <Section title="Low Stock Alert" subtitle="Items that need purchase attention."><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{lowStock.map(item => <article key={item.id} className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4"><div className="flex items-start justify-between"><div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 text-amber-700"><AlertTriangle size={18}/></div><span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold uppercase text-rose-700">Need Purchase</span></div><h3 className="mt-4 font-extrabold text-slate-900">{item.item}</h3><p className="mt-2 text-xs text-slate-500">Available <b className="text-slate-800">{item.available} {item.unit}</b></p><p className="mt-1 text-xs text-slate-500">Minimum <b className="text-slate-800">{item.minimum} {item.unit}</b></p></article>)}</div></Section>
      <Section title="Stock Flow Visualization" subtitle="Today’s movement for the primary stock category."><div className="flex flex-col items-stretch justify-center gap-3 rounded-2xl bg-slate-50 p-5 md:flex-row md:items-center">{[["Opening Stock","500 KG",Archive],["Purchased","120 KG",ShoppingCart],["Consumed","95 KG",Soup],["Wastage","5 KG",TrendingDown],["Available Stock","520 KG",Warehouse]].map(([label,value,Icon], index) => <div key={label} className="contents"><div className="min-w-[150px] rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm"><Icon className="mx-auto mb-2 text-orange-500" size={21}/><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p></div>{index < 4 && <div className="flex items-center justify-center font-extrabold text-slate-400"><ArrowDown className="md:hidden"/><div className="hidden items-center gap-2 md:flex"><span>{index === 0 ? "+" : "−"}</span><ArrowRight size={18}/></div></div>}</div>)}</div></Section>
      <Section title="Monthly Statistics" subtitle="Inventory performance overview for July 2026."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Total Purchased","2,480 KG",PackagePlus],["Total Consumed","2,105 KG",Soup],["Total Wastage","86 KG",Scale],["Current Inventory Value","₹2,84,500",IndianRupee]].map(([label,value,Icon]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-5"><Icon className="mb-4 text-orange-500" size={22}/><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p></div>)}</div></Section>
      <Section title="Quick Actions" subtitle="Common ration operations for this demonstration."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Button icon={Plus} onClick={showDemoToast}>Add Purchase</Button><Button icon={Soup} onClick={showDemoToast}>Record Consumption</Button><Button icon={Trash2} onClick={showDemoToast}>Record Wastage</Button><Button icon={Download} variant="secondary" onClick={showDemoToast}>Export Report</Button></div></Section>
    </div>
  </main></div>{toast && <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-4 text-sm font-bold text-white shadow-2xl"><span className="grid h-7 w-7 place-items-center rounded-full bg-orange-500">!</span>Demo Only<button onClick={() => setToast(false)} className="ml-2 text-slate-400 hover:text-white"><X size={16}/></button></div>}</div>;
};

export default RationManagement;
