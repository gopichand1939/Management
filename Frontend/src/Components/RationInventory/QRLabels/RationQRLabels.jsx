import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { QRCodeSVG } from "qrcode.react";
import { 
  Printer, 
  Settings, 
  Search, 
  Columns, 
  CheckSquare, 
  Square,
  Sparkles,
  Grid3X3,
  Sliders,
  FileText
} from "lucide-react";

import PageLoader from "../../Common/PageLoader";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import {
  RATION_ITEM_LIST,
  GET_QR_CODE,
  GET_CATOGORY,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const PRESETS = [
  {
    name: "Avery 5160 / 8160 (3 cols x 10 rows)",
    cols: 3,
    width: 250,
    height: 100,
    gap: 12,
    qrSize: 50,
    padding: 8,
  },
  {
    name: "Compact Labels (4 cols x 12 rows)",
    cols: 4,
    width: 190,
    height: 85,
    gap: 8,
    qrSize: 42,
    padding: 6,
  },
  {
    name: "Mini stickers (5 cols x 15 rows)",
    cols: 5,
    width: 150,
    height: 70,
    gap: 6,
    qrSize: 36,
    padding: 4,
  },
  {
    name: "Large Labels (2 cols x 7 rows)",
    cols: 2,
    width: 360,
    height: 130,
    gap: 16,
    qrSize: 64,
    padding: 12,
  }
];

const RationQRLabels = () => {
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || !authUser?.institution_id;

  // Items and settings state
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Control selections
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id ? String(authUser.institution_id) : ""
  );
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [limit, setLimit] = useState(50); // Fetch up to 50 items for easy sheet printing

  // Selection states
  const [selectedItems, setSelectedItems] = useState({}); // { itemId: true/false }
  const [printQuantities, setPrintQuantities] = useState({}); // { itemId: quantity }

  // Custom layout configurations (Avery style)
  const [currentPreset, setCurrentPreset] = useState(0);
  const [customCols, setCustomCols] = useState(3);
  const [labelWidth, setLabelWidth] = useState(230);
  const [labelHeight, setLabelHeight] = useState(90);
  const [gridGap, setGridGap] = useState(10);
  const [qrSize, setQrSize] = useState(48);
  const [labelPadding, setLabelPadding] = useState(8);

  // Content toggles
  const [showItemName, setShowItemName] = useState(true);
  const [showSkuId, setShowSkuId] = useState(true);
  const [showItemCode, setShowItemCode] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(false);

  // Reference for print container
  const printAreaRef = useRef(null);

  // Apply preset values
  const applyPreset = (index) => {
    setCurrentPreset(index);
    const preset = PRESETS[index];
    setCustomCols(preset.cols);
    setLabelWidth(preset.width);
    setLabelHeight(preset.height);
    setGridGap(preset.gap);
    setQrSize(preset.qrSize);
    setLabelPadding(preset.padding);
  };

  // Initial preset application
  useEffect(() => {
    applyPreset(0);
  }, []);

  // Fetch institutions if super admin
  useEffect(() => {
    const fetchInstitutions = async () => {
      if (!isSuperAdmin) return;
      try {
        const response = await fetch(GET_INSTITUTION_LIST, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        const data = await response.json();
        if (response.ok) {
          const list = data.institutions || data.data || [];
          setInstitutions(list);
          if (list.length > 0 && !selectedInstitutionId) {
            setSelectedInstitutionId(String(list[0].id));
          }
        }
      } catch (err) {
        console.error("Failed to load institutions:", err);
      }
    };
    fetchInstitutions();
  }, [isSuperAdmin]);

  // Fetch categories based on chosen institution
  useEffect(() => {
    const fetchCategories = async () => {
      const instId = authUser?.institution_id || selectedInstitutionId;
      if (!instId) return;
      try {
        const response = await fetch(GET_CATOGORY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ institution_id: Number(instId) }),
        });
        const data = await response.json();
        if (response.ok) {
          setCategories(data.categories || data.data || []);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    fetchCategories();
  }, [selectedInstitutionId, authUser]);

  // Helper to load selection maps from array list
  const handleFetchedData = (itemList) => {
    setItems(itemList);
    const initialSelections = {};
    const initialQuantities = {};
    itemList.forEach((item) => {
      initialSelections[item.id] = true;
      initialQuantities[item.id] = 1;
    });
    setSelectedItems(initialSelections);
    setPrintQuantities(initialQuantities);
  };

  // Fetch items with dedicated GET_QR_CODE API and fallback to RATION_ITEM_LIST
  const fetchItems = async () => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) return;
    setLoading(true);
    setError("");
    try {
      // First attempt to query GET_QR_CODE API
      const response = await fetch(GET_QR_CODE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: Number(instId),
          page: 1,
          limit: Number(limit),
          search: searchText,
          category_id: categoryFilter ? Number(categoryFilter) : null,
          status: "active",
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.warn("GET_QR_CODE response not valid JSON. Falling back to RATION_ITEM_LIST.", e);
        throw new Error("FALLBACK_TRIGGER");
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch QR codes");
      }

      handleFetchedData(data.data || []);
    } catch (err) {
      console.log("Querying RATION_ITEM_LIST as fallback endpoint...");
      // Graceful fallback to standard RATION_ITEM_LIST route (which returns items and barcodes)
      try {
        const fallbackRes = await fetch(RATION_ITEM_LIST, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            institution_id: Number(instId),
            page: 1,
            limit: Number(limit),
            search: searchText,
            category_id: categoryFilter ? Number(categoryFilter) : null,
            status: "active",
          }),
        });

        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok) {
          handleFetchedData(fallbackData.data || []);
        } else {
          setError(fallbackData.message || "Failed to load ration items");
        }
      } catch (fallbackErr) {
        setError(fallbackErr.message || "Something went wrong while fetching items");
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger item fetch when filters modify
  useEffect(() => {
    fetchItems();
  }, [selectedInstitutionId, authUser, categoryFilter, limit]);

  // Handle checking/unchecking single item
  const toggleItemSelection = (id) => {
    setSelectedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Handle select all / deselect all
  const toggleSelectAll = () => {
    const allSelected = items.every((it) => selectedItems[it.id]);
    const updated = {};
    items.forEach((it) => {
      updated[it.id] = !allSelected;
    });
    setSelectedItems(updated);
  };

  // Handle quantity change
  const setQuantity = (id, val) => {
    const qty = Math.max(1, Math.min(100, Number(val)));
    setPrintQuantities((prev) => ({
      ...prev,
      [id]: qty,
    }));
  };

  // Build grid of labels based on selection & quantity count
  const printGridList = [];
  items.forEach((item) => {
    if (selectedItems[item.id]) {
      const qty = printQuantities[item.id] || 1;
      for (let i = 0; i < qty; i++) {
        printGridList.push(item);
      }
    }
  });

  const handlePrint = () => {
    window.print();
  };

  if (!authUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <PageLoader />
      </div>
    );
  }

  const selectClassName = "h-8 pl-3 pr-8 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all cursor-pointer appearance-none min-w-[120px]";

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />
      
      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />
        
        {/* Main Content Pane */}
        <main className="flex-1 w-full pt-4 pb-8 px-4 md:px-6 print:p-0 print:bg-white print:overflow-visible">
          
          {/* Header Title Bar */}
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center print:hidden text-left">
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Grid3X3 className="text-orange-500" size={20} />
                QR Labels Designer
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Configure Avery sticker layout, spacing parameters, and print generated barcode stickers.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                disabled={printGridList.length === 0}
                className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-semibold py-2 px-4 shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
              >
                <Printer size={16} />
                Print Labels Sheet
              </button>
            </div>
          </div>

          {/* Form and Preview Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start print:block">
            
            {/* LEFT PANEL: Layout adjustments & controls */}
            <div className="xl:col-span-4 flex flex-col gap-5 print:hidden">
              
              {/* Avery presets selector */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-left">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sparkles size={14} className="text-orange-500" />
                  Sticker Templates
                </h3>
                <div className="flex flex-col gap-2">
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(idx)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                        currentPreset === idx
                          ? "border-orange-500 bg-orange-50/50 text-orange-600 font-bold"
                          : "border-slate-150 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>{preset.name}</span>
                      <span className="text-[10px] uppercase font-bold opacity-60">
                        {preset.cols} Cols
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom spacing sliders */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-left">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sliders size={14} className="text-orange-500" />
                  Dimensions & Spacing
                </h3>
                
                <div className="flex flex-col gap-4 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-500 mb-1 font-semibold">
                      <span>Columns per Row</span>
                      <span className="text-slate-800 font-bold">{customCols} cols</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={customCols}
                      onChange={(e) => {
                        setCurrentPreset(-1);
                        setCustomCols(Number(e.target.value));
                      }}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-slate-500 mb-1 font-semibold">
                        <span>Label Width</span>
                        <span className="text-slate-800 font-bold">{labelWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min="120"
                        max="400"
                        value={labelWidth}
                        onChange={(e) => {
                          setCurrentPreset(-1);
                          setLabelWidth(Number(e.target.value));
                        }}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-500 mb-1 font-semibold">
                        <span>Label Height</span>
                        <span className="text-slate-800 font-bold">{labelHeight}px</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={labelHeight}
                        onChange={(e) => {
                          setCurrentPreset(-1);
                          setLabelHeight(Number(e.target.value));
                        }}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-slate-500 mb-1 font-semibold">
                        <span>Padding</span>
                        <span className="text-slate-800 font-bold">{labelPadding}px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="24"
                        value={labelPadding}
                        onChange={(e) => {
                          setCurrentPreset(-1);
                          setLabelPadding(Number(e.target.value));
                        }}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-500 mb-1 font-semibold">
                        <span>QR Size</span>
                        <span className="text-slate-800 font-bold">{qrSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="24"
                        max="100"
                        value={qrSize}
                        onChange={(e) => {
                          setCurrentPreset(-1);
                          setQrSize(Number(e.target.value));
                        }}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-500 mb-1 font-semibold">
                      <span>Grid Gap (Spacing)</span>
                      <span className="text-slate-800 font-bold">{gridGap}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="32"
                      value={gridGap}
                      onChange={(e) => {
                        setCurrentPreset(-1);
                        setGridGap(Number(e.target.value));
                      }}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Label content toggles */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-left">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText size={14} className="text-orange-500" />
                  Sticker Label Content
                </h3>
                
                <div className="flex flex-col gap-3 text-xs font-semibold text-slate-600">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showItemName}
                      onChange={(e) => setShowItemName(e.target.checked)}
                      className="rounded border-slate-350 text-orange-500 focus:ring-orange-500/20 bg-slate-50 w-4 h-4 cursor-pointer"
                    />
                    <span>Show Item Name</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showSkuId}
                      onChange={(e) => setShowSkuId(e.target.checked)}
                      className="rounded border-slate-350 text-orange-500 focus:ring-orange-500/20 bg-slate-50 w-4 h-4 cursor-pointer"
                    />
                    <span>Show SKU ID</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showItemCode}
                      onChange={(e) => setShowItemCode(e.target.checked)}
                      className="rounded border-slate-350 text-orange-500 focus:ring-orange-500/20 bg-slate-50 w-4 h-4 cursor-pointer"
                    />
                    <span>Show Item Code</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showBarcodeText}
                      onChange={(e) => setShowBarcodeText(e.target.checked)}
                      className="rounded border-slate-350 text-orange-500 focus:ring-orange-500/20 bg-slate-50 w-4 h-4 cursor-pointer"
                    />
                    <span>Show Barcode Text</span>
                  </label>
                </div>
              </div>
            </div>

            {/* MID/RIGHT PANEL: Items selection queue & preview sheet */}
            <div className="xl:col-span-8 flex flex-col gap-5 print:block">
              
              {/* Item selection table / list */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm print:hidden text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Select Items to Print ({items.filter(it => selectedItems[it.id]).length} Selected)
                  </h3>
                  
                  {/* Filters and searches */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Super admin institution picker */}
                    {isSuperAdmin && institutions.length > 0 && (
                      <select
                        value={selectedInstitutionId}
                        onChange={(e) => setSelectedInstitutionId(e.target.value)}
                        className={selectClassName}
                      >
                        {institutions.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Category Filter */}
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className={selectClassName}
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>

                    {/* Search */}
                    <div className="relative flex items-center text-slate-400">
                      <Search size={14} className="absolute left-3" />
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchItems()}
                        className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1 text-xs font-semibold text-slate-700 outline-none w-36 focus:border-slate-400 focus:bg-white transition"
                      />
                    </div>

                    <button 
                      onClick={fetchItems}
                      className="rounded-xl bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 font-bold text-white transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex h-36 items-center justify-center">
                    <span className="text-xs text-slate-400">Loading inventory items...</span>
                  </div>
                ) : error ? (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-xs text-red-500 font-semibold">
                    {error}
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                    <span className="text-xs text-slate-400">No active items found. Make sure items are added in Item Master.</span>
                  </div>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto custom-scrollbar border border-slate-150 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-150 bg-slate-50 text-slate-500 font-bold sticky top-0 z-10">
                          <th className="py-2.5 px-3 w-10 text-center">
                            <button
                              onClick={toggleSelectAll}
                              className="text-slate-450 hover:text-slate-700 cursor-pointer"
                            >
                              {items.every((it) => selectedItems[it.id]) ? (
                                <CheckSquare size={16} className="text-orange-500" />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </th>
                          <th className="py-2.5 px-3">Item Name</th>
                          <th className="py-2.5 px-3">SKU ID</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 w-28 text-center">Print Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {items.map((item) => {
                          const isSelected = selectedItems[item.id];
                          const qty = printQuantities[item.id] || 1;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/40">
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => toggleItemSelection(item.id)}
                                  className="text-slate-450 hover:text-slate-700 cursor-pointer"
                                >
                                  {isSelected ? (
                                    <CheckSquare size={16} className="text-orange-500" />
                                  ) : (
                                    <Square size={16} />
                                  )}
                                </button>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{item.item_name}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{item.sku_id || item.item_code}</td>
                              <td className="py-2.5 px-3">{item.category_name}</td>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={qty}
                                  onChange={(e) => setQuantity(item.id, e.target.value)}
                                  disabled={!isSelected}
                                  className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center font-bold text-slate-800 text-xs outline-none disabled:opacity-30 disabled:cursor-not-allowed focus:border-slate-455 focus:bg-white transition"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SHEET PREVIEW AREA */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm print:border-0 print:bg-white print:p-0 print:shadow-none text-left">
                <div className="mb-4 flex items-center justify-between print:hidden">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Sticker Sheet Preview ({printGridList.length} Labels)</h3>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg">
                    Printable A4 Simulator
                  </div>
                </div>

                {printGridList.length === 0 ? (
                  <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                    <div className="text-center text-xs text-slate-450">
                      <Printer size={28} className="mx-auto mb-2 text-slate-400 opacity-60" />
                      Select items and quantities above to generate sticker sheets.
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex justify-center bg-slate-50/50 p-4 rounded-xl border border-slate-150 overflow-x-auto custom-scrollbar print:p-0 print:border-0 print:bg-white print:w-full print:overflow-visible">
                    
                    {/* The Grid Sheet container */}
                    <div
                      ref={printAreaRef}
                      className="bg-white p-6 shadow-md print:shadow-none print:p-0 print:bg-white printable-area"
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${customCols}, minmax(0, 1fr))`,
                        gap: `${gridGap}px`,
                        width: "100%",
                        maxWidth: `${customCols * labelWidth + (customCols - 1) * gridGap + 48}px`,
                        backgroundColor: "#ffffff",
                        color: "#0f172a",
                      }}
                    >
                      {printGridList.map((item, idx) => {
                        const qrCodeValue = item.barcode || item.item_code || item.sku_id || "";
                        
                        // Count the active lines to dynamically adjust space allocation
                        const activeLinesCount = [
                          showItemName,
                          showSkuId && item.sku_id,
                          showItemCode && item.item_code,
                          showBarcodeText
                        ].filter(Boolean).length;
                        
                        // Allocate safe vertical space per line (font size ~ 10-12px + margins/lineHeight)
                        const verticalPaddingAndMargins = (2 * labelPadding) + (activeLinesCount * 13) + 4;
                        const maxQrHeight = labelHeight - verticalPaddingAndMargins;
                        
                        // Restrict QR code size to fit within the physical sticker box, with a safe minimum of 20px
                        const actualQrSize = Math.max(20, Math.min(qrSize, maxQrHeight));
                        
                        // Helper to render a centered text line constrained to QR width with auto-adjusted font size
                        const renderTextLine = (val) => {
                          if (!val) return null;
                          const textStr = String(val);
                          const len = textStr.length || 1;
                          const calculatedFontSize = Math.max(5, Math.min(13, Math.floor(actualQrSize / (len * 0.6))));
                          const letterSpacing = len <= 6 ? "0.08em" : "0.02em";
                          const marginBetweenLines = activeLinesCount > 2 ? "3px" : "5px";

                          return (
                            <div
                              className="text-slate-900 font-mono"
                              style={{
                                width: `${actualQrSize}px`,
                                marginTop: marginBetweenLines,
                                fontSize: `${calculatedFontSize}px`,
                                letterSpacing: letterSpacing,
                                fontWeight: "700",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "clip",
                                lineHeight: "1.1",
                              }}
                            >
                              {textStr}
                            </div>
                          );
                        };

                        return (
                          <div
                            key={`${item.id}-${idx}`}
                            className="border border-slate-200 rounded flex flex-col items-center justify-center overflow-hidden bg-white print:border-slate-300"
                            style={{
                              width: `${labelWidth}px`,
                              height: `${labelHeight}px`,
                              padding: `${labelPadding}px`,
                              boxSizing: "border-box",
                            }}
                          >
                            {/* QR Code SVG */}
                            <div 
                              className="flex items-center justify-center qr-code-container bg-white"
                              style={{
                                width: `${actualQrSize}px`,
                                height: `${actualQrSize}px`,
                              }}
                            >
                              <QRCodeSVG
                                value={qrCodeValue}
                                size={256}
                                bgColor="#ffffff"
                                fgColor="#000000"
                                level="H"
                                includeMargin={true}
                                className="qr-code-svg"
                                style={{ width: "100%", height: "100%" }}
                              />
                            </div>

                            {/* Dynamically toggleable centered info fields */}
                            {showItemName && renderTextLine(item.item_name)}
                            {showSkuId && item.sku_id && renderTextLine(item.sku_id)}
                            {showItemCode && item.item_code && renderTextLine(item.item_code)}
                            {showBarcodeText && renderTextLine(qrCodeValue)}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* Global CSS style block for browser print output formatting */}
      <style>{`
        /* Disable image smoothing to keep QR modules perfectly sharp */
        .qr-code-svg {
          image-rendering: -moz-crisp-edges;
          image-rendering: -o-crisp-edges;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          shape-rendering: crispEdges;
        }
        .qr-code-svg path {
          shape-rendering: crispEdges;
        }

        @media print {
          /* Hide all page content by default */
          body * {
            visibility: hidden !important;
          }
          /* Restore visibility for the print sheet grid container and its children */
          .printable-area, .printable-area * {
            visibility: visible !important;
          }
          /* Position the print sheet grid container at the absolute top-left */
          .printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            display: grid !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          body, html {
            background-color: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            height: auto !important;
            width: auto !important;
          }
        }
      `}</style>
    </div>
  );
};

export default RationQRLabels;
