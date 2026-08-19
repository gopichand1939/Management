import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
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
  FileText,
  X,
  AlertCircle,
  Building2,
  Barcode,
  Layers
} from "lucide-react";

import PageLoader from "../../Common/PageLoader";
import Button from "../../Common/Button";
import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import Barcode128SVG from "./Barcode128SVG";
import {
  CATALOG_ITEM_LIST,
  CATALOG_CATEGORY_DROPDOWN,
  GET_INSTITUTION_LIST,
  TOKEN_KEY,
} from "../../../Utils/Constants";

const PRESETS = [
  {
    name: "Avery 5160 / 8160 (3 cols x 10 rows)",
    cols: 3,
    width: 250,
    height: 110,
    gap: 12,
    barcodeHeight: 35,
    padding: 8,
  },
  {
    name: "Compact Labels (4 cols x 12 rows)",
    cols: 4,
    width: 190,
    height: 90,
    gap: 8,
    barcodeHeight: 28,
    padding: 6,
  },
  {
    name: "Continuous Thermal Roll (1 col x 1 row)",
    cols: 1,
    width: 320,
    height: 140,
    gap: 16,
    barcodeHeight: 45,
    padding: 12,
  },
  {
    name: "Large Shipping Labels (2 cols x 7 rows)",
    cols: 2,
    width: 360,
    height: 150,
    gap: 16,
    barcodeHeight: 50,
    padding: 12,
  }
];

const BarcodePrinting = () => {
  const { authUser } = useSelector((state) => state.user);
  const isSuperAdmin = authUser?.role === "super_admin" || !authUser?.institution_id;

  // States
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter selections
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(
    authUser?.institution_id ? String(authUser.institution_id) : ""
  );
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [limit, setLimit] = useState(100); // Higher fetch limit for batch stickers

  // Selections & Quantities maps
  const [selectedItems, setSelectedItems] = useState({}); // { itemId: true/false }
  const [printQuantities, setPrintQuantities] = useState({}); // { itemId: quantity }

  // Dimensions Spacing & Presets configurations
  const [currentPreset, setCurrentPreset] = useState(0);
  const [customCols, setCustomCols] = useState(3);
  const [labelWidth, setLabelWidth] = useState(250);
  const [labelHeight, setLabelHeight] = useState(110);
  const [gridGap, setGridGap] = useState(12);
  const [barcodeHeight, setBarcodeHeight] = useState(35);
  const [labelPadding, setLabelPadding] = useState(8);

  // Content display toggles
  const [showItemName, setShowItemName] = useState(true);
  const [showSkuId, setShowSkuId] = useState(true);
  const [showProductCode, setShowProductCode] = useState(false);
  const [showPrice, setShowPrice] = useState(true);

  // Print Mode State
  const [printMode, setPrintMode] = useState("batch"); // "batch" or "single"
  const [singleSelectItem, setSingleSelectItem] = useState("");
  const [singlePrintQty, setSinglePrintQty] = useState(100);

  // Fullscreen Design State
  const [isFullscreenDesigner, setIsFullscreenDesigner] = useState(false);

  // Advanced Dimension adjustments
  const [titleFontSize, setTitleFontSize] = useState(10);
  const [footerFontSize, setFooterFontSize] = useState(8);
  const [textAlignment, setTextAlignment] = useState("center"); // "left", "center", "right"

  // Apply preset parameters
  const applyPreset = (index) => {
    setCurrentPreset(index);
    const preset = PRESETS[index];
    setCustomCols(preset.cols);
    setLabelWidth(preset.width);
    setLabelHeight(preset.height);
    setGridGap(preset.gap);
    setBarcodeHeight(preset.barcodeHeight);
    setLabelPadding(preset.padding);
  };

  // Run initial preset apply
  useEffect(() => {
    applyPreset(0);
  }, []);

  // Fetch institutions for Super Admin
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

  // Load category filters
  useEffect(() => {
    const fetchCategories = async () => {
      const instId = authUser?.institution_id || selectedInstitutionId;
      if (!instId) return;
      try {
        const response = await fetch(CATALOG_CATEGORY_DROPDOWN, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ institution_id: Number(instId) }),
        });
        const data = await response.json();
        if (response.ok) {
          setCategories(data.data || []);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    fetchCategories();
  }, [selectedInstitutionId, authUser]);

  // Fetch items list
  const fetchItems = async () => {
    const instId = authUser?.institution_id || selectedInstitutionId;
    if (!instId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(CATALOG_ITEM_LIST, {
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch items list");
      }

      const list = data.data || [];
      setItems(list);
      
      if (list.length > 0 && !singleSelectItem) {
        setSingleSelectItem(String(list[0].id));
      }

      // Auto-select all items with default quantity of 1
      const defaultSelections = {};
      const defaultQuantities = {};
      list.forEach((item) => {
        defaultSelections[item.id] = true;
        defaultQuantities[item.id] = 1;
      });
      setSelectedItems(defaultSelections);
      setPrintQuantities(defaultQuantities);
    } catch (err) {
      setError(err.message || "Error loading items");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-trigger load on institution changes
  useEffect(() => {
    fetchItems();
  }, [selectedInstitutionId, authUser]);

  // Item Checkbox selections toggles
  const handleItemSelectToggle = (itemId) => {
    setSelectedItems((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
  };

  const handleSelectAllToggle = () => {
    const allSelected = items.every((item) => selectedItems[item.id]);
    const updatedSelections = {};
    items.forEach((item) => {
      updatedSelections[item.id] = !allSelected;
    });
    setSelectedItems(updatedSelections);
  };

  // Print quantities handlers
  const [qtyWarning, setQtyWarning] = useState("");

  const handleQuantityChange = (itemId, val) => {
    const parsed = parseInt(val, 10);
    const qty = Math.min(1000, Math.max(1, parsed || 1));
    if (parsed > 1000) {
      setQtyWarning("Quantity automatically capped at 1,000 labels per item to prevent browser crashes.");
      setTimeout(() => setQtyWarning(""), 5000);
    }
    setPrintQuantities((current) => ({
      ...current,
      [itemId]: qty,
    }));
  };

  // Generate flattened array of selected print cards repeating based on quantities
  const getFlattenedPrintItems = () => {
    const list = [];
    if (printMode === "single") {
      const selectedItem = items.find(item => String(item.id) === String(singleSelectItem));
      if (selectedItem) {
        const qty = Number(singlePrintQty) || 1;
        for (let i = 0; i < qty; i++) {
          list.push({ ...selectedItem, printIndex: `single-${selectedItem.id}-${i}` });
        }
      }
    } else {
      items.forEach((item) => {
        if (selectedItems[item.id]) {
          const qty = printQuantities[item.id] || 1;
          for (let i = 0; i < qty; i++) {
            list.push({ ...item, printIndex: `batch-${item.id}-${i}` });
          }
        }
      });
    }
    return list;
  };

  const flattenedList = getFlattenedPrintItems();

  const handlePrintTrigger = () => {
    window.print();
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)] print:block print:bg-white print:p-0">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden print:block print:h-auto print:overflow-visible">
        <div className="print:hidden">
          <Navbar />
        </div>

        <main className="flex-1 p-6 md:p-8 print:p-0 print:m-0">
          
          {/* Dashboard Header Bar */}
          <div className="mx-auto max-w-[1440px] print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex flex-col gap-1 text-left">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Barcode Label Manager
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  Design, format, and batch print Code 128 retail stickers
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFullscreenDesigner(true)}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition cursor-pointer"
                >
                  <Sliders size={16} className="text-orange-500" />
                  Customize & Live Print (Fullscreen)
                </button>

                <button
                  onClick={handlePrintTrigger}
                  disabled={flattenedList.length === 0}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-md hover:bg-orange-600 disabled:opacity-60 transition cursor-pointer"
                >
                  <Printer size={16} />
                  Print Labels ({flattenedList.length})
                </button>
              </div>
            </div>

            {/* Grid control panels */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: Controls & Adjustments */}
              <div className="xl:col-span-4 flex flex-col gap-6">
                
                {/* Print Mode Selector Card */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-left">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Barcode size={14} className="text-orange-500" />
                    Print Mode
                  </h3>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-150 mb-4">
                    <button
                      onClick={() => setPrintMode("batch")}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                        printMode === "batch"
                          ? "bg-orange-500 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Batch Print
                    </button>
                    <button
                      onClick={() => setPrintMode("single")}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                        printMode === "single"
                          ? "bg-orange-500 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Single Product
                    </button>
                  </div>

                  {printMode === "single" && (
                    <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Select Product
                        </label>
                        <select
                          value={singleSelectItem}
                          onChange={(e) => setSingleSelectItem(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-400"
                        >
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Label Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={singlePrintQty}
                          onChange={(e) => setSinglePrintQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 text-center outline-none focus:border-orange-400"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Spacing presets */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-left">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Sparkles size={14} className="text-orange-500" />
                    Sticker Presets
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
                          {preset.cols} {preset.cols === 1 ? "Col" : "Cols"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimension adjustments */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-left">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Sliders size={14} className="text-orange-500" />
                    Dimensions & Margins
                  </h3>
                  
                  <div className="flex flex-col gap-4 text-xs font-semibold">
                    <div>
                      <div className="flex justify-between text-slate-500 mb-1">
                        <span>Columns per Row</span>
                        <span className="text-slate-800 font-bold">{customCols} columns</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="6"
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
                        <div className="flex justify-between text-slate-500 mb-1">
                          <span>Sticker Width</span>
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
                        <div className="flex justify-between text-slate-500 mb-1">
                          <span>Sticker Height</span>
                          <span className="text-slate-800 font-bold">{labelHeight}px</span>
                        </div>
                        <input
                          type="range"
                          min="60"
                          max="250"
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
                        <div className="flex justify-between text-slate-500 mb-1">
                          <span>Gap / Spacing</span>
                          <span className="text-slate-800 font-bold">{gridGap}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          value={gridGap}
                          onChange={(e) => {
                            setCurrentPreset(-1);
                            setGridGap(Number(e.target.value));
                          }}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-500 mb-1">
                          <span>Inner Padding</span>
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
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-500 mb-1">
                        <span>Barcode Height</span>
                        <span className="text-slate-800 font-bold">{barcodeHeight}px</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="80"
                        value={barcodeHeight}
                        onChange={(e) => {
                          setCurrentPreset(-1);
                          setBarcodeHeight(Number(e.target.value));
                        }}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-slate-500 mb-1">
                          <span>Title Size</span>
                          <span className="text-slate-800 font-bold">{titleFontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="6"
                          max="20"
                          value={titleFontSize}
                          onChange={(e) => setTitleFontSize(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-500 mb-1">
                          <span>Footer Size</span>
                          <span className="text-slate-800 font-bold">{footerFontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="6"
                          max="16"
                          value={footerFontSize}
                          onChange={(e) => setFooterFontSize(Number(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-slate-500 mb-1.5">Item Title Alignment</span>
                      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50 border border-slate-150 rounded-lg">
                        {["left", "center", "right"].map((align) => (
                          <button
                            key={align}
                            onClick={() => setTextAlignment(align)}
                            className={`py-1 rounded text-[10px] uppercase font-black transition cursor-pointer ${
                              textAlignment === align
                                ? "bg-slate-700 text-slate-100"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content filters and toggles */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-left">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings size={14} className="text-orange-500" />
                    Sticker Elements
                  </h3>
                  <div className="flex flex-col gap-3.5 text-xs font-bold text-slate-600">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showItemName}
                        onChange={(e) => setShowItemName(e.target.checked)}
                        className="h-4 w-4 rounded-sm border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span>Print Item Name</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSkuId}
                        onChange={(e) => setShowSkuId(e.target.checked)}
                        className="h-4 w-4 rounded-sm border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span>Print SKU Suffix Text</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showProductCode}
                        onChange={(e) => setShowProductCode(e.target.checked)}
                        className="h-4 w-4 rounded-sm border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span>Print Product Code</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPrice}
                        onChange={(e) => setShowPrice(e.target.checked)}
                        className="h-4 w-4 rounded-sm border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span>Print Price Tag</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Items List selector */}
              <div className="xl:col-span-8 flex flex-col gap-6">
                
                {/* Search / filter block */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-left flex flex-wrap items-center justify-between gap-4">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex min-h-[38px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 transition bg-white shadow-sm text-xs font-semibold">
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="Search item to select..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-slate-400 bg-white shadow-sm text-xs font-semibold">
                      <Layers size={14} />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="border-0 bg-transparent text-slate-800 outline-none"
                      >
                        <option value="">All Categories</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.category_name}</option>
                        ))}
                      </select>
                    </div>

                    {isSuperAdmin && (
                      <div className="flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-slate-400 bg-white shadow-sm text-xs font-semibold">
                        <Building2 size={14} />
                        <select
                          value={selectedInstitutionId}
                          onChange={(e) => setSelectedInstitutionId(e.target.value)}
                          className="border-0 bg-transparent text-slate-800 outline-none"
                        >
                          {institutions.map((inst) => (
                            <option key={inst.id} value={inst.id}>{inst.institution_name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <Button onClick={fetchItems} className="!py-2 !px-4 !text-xs">
                      Search
                    </Button>
                  </div>
                </div>

                {/* Table selector list */}
                {loading ? (
                  <div className="flex justify-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <PageLoader />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 text-xs font-semibold">
                    No active items found matching filters.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                      <table className="w-full border-collapse text-left text-xs text-slate-600">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50 font-black text-slate-400 uppercase tracking-wider sticky top-0 bg-white z-10">
                            <th className="px-5 py-3 w-12 text-center">
                              <button
                                type="button"
                                onClick={handleSelectAllToggle}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                {items.every((item) => selectedItems[item.id]) ? (
                                  <CheckSquare size={16} className="text-orange-500" />
                                ) : (
                                  <Square size={16} />
                                )}
                              </button>
                            </th>
                            <th className="px-5 py-3">Item Name</th>
                            <th className="px-5 py-3">SKU</th>
                            <th className="px-5 py-3">Price</th>
                            <th className="px-5 py-3 text-right">Print Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {items.map((item) => {
                            const isChecked = !!selectedItems[item.id];
                            return (
                              <tr key={item.id} className={`hover:bg-slate-50/50 ${isChecked ? "bg-orange-50/20" : ""}`}>
                                <td className="px-5 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleItemSelectToggle(item.id)}
                                  >
                                    {isChecked ? (
                                      <CheckSquare size={16} className="text-orange-500" />
                                    ) : (
                                      <Square size={16} />
                                    )}
                                  </button>
                                </td>
                                <td className="px-5 py-3 text-left">
                                  <div className="font-bold text-slate-900">{item.name}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{item.category_name || "Uncategorized"}</div>
                                </td>
                                <td className="px-5 py-3 font-mono uppercase text-slate-500">{item.sku || "—"}</td>
                                <td className="px-5 py-3 font-bold">${parseFloat(item.price || 0).toFixed(2)}</td>
                                <td className="px-5 py-3 text-right">
                                  <input
                                    type="number"
                                    min="1"
                                    max={1000}
                                    value={printQuantities[item.id] || 1}
                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                    disabled={!isChecked}
                                    className="w-16 border border-slate-200 rounded-lg p-1 text-center font-bold outline-none text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 disabled:opacity-50"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* PREVIEW CONTAINER SECTION */}
            <div className="mt-8 text-left print:hidden">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Grid3X3 size={14} className="text-orange-500" />
                Live Print Preview ({flattenedList.length} Labels)
              </h3>
              
              {qtyWarning && (
                <div className="mb-4 p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{qtyWarning}</span>
                </div>
              )}

              {flattenedList.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl py-12 text-center text-xs font-semibold text-slate-400 bg-white">
                  Select products from the table above and input quantities to see a live preview.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl p-6 bg-slate-100 max-h-[500px] overflow-y-auto">
                  {flattenedList.length > 150 && (
                    <div className="mb-4 p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 text-xs font-bold flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>Showing first 150 labels for preview performance. All {flattenedList.length} labels will be printed.</span>
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${customCols}, minmax(0, 1fr))`,
                      gap: `${gridGap}px`,
                      justifyContent: "start",
                    }}
                  >
                    {flattenedList.slice(0, 150).map((item, idx) => (
                      <div
                        key={item.printIndex || idx}
                        style={{
                          width: `${labelWidth}px`,
                          height: `${labelHeight}px`,
                          padding: `${labelPadding}px`,
                        }}
                        className="bg-white border border-slate-200 shadow-xs flex flex-col justify-between items-center overflow-hidden rounded-md text-center"
                      >
                        {/* Name */}
                        {showItemName && (
                          <div
                            style={{
                              fontSize: `${titleFontSize}px`,
                              textAlign: textAlignment,
                            }}
                            className="font-black text-slate-900 truncate w-full px-1"
                          >
                            {item.name}
                          </div>
                        )}

                        {/* Barcode representation */}
                        <div className="w-full flex-1 flex items-center justify-center min-h-0 py-1">
                          <Barcode128SVG
                            text={item.barcode || item.sku || "000000"}
                            width={labelWidth - 2 * labelPadding}
                            height={barcodeHeight}
                          />
                        </div>

                        {/* Meta text footer */}
                        <div
                          style={{ fontSize: `${footerFontSize}px` }}
                          className="w-full flex justify-between items-center gap-2 font-black text-slate-500 px-1 select-none"
                        >
                          <div className="truncate flex-1 text-left uppercase">
                            {showSkuId && (item.sku || "—")}
                            {showProductCode && item.product_code && item.product_code !== item.sku && ` / Code: ${item.product_code}`}
                          </div>
                          {showPrice && (
                            <div className="text-slate-900 font-black">
                              ${parseFloat(item.price || 0).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* DYNAMIC SCREEN PRINT CONTAINER */}
          {flattenedList.length > 0 && (
            <div className="hidden print:block print:bg-white print:m-0 print:p-0">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${customCols}, minmax(0, 1fr))`,
                  gap: `${gridGap}px`,
                  justifyContent: "start",
                  margin: "0 auto",
                  backgroundColor: "white"
                }}
              >
                {flattenedList.map((item, idx) => (
                  <div
                    key={item.printIndex || idx}
                    style={{
                      width: `${labelWidth}px`,
                      height: `${labelHeight}px`,
                      padding: `${labelPadding}px`,
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "4px",
                      pageBreakInside: "avoid"
                    }}
                  >
                    {showItemName && (
                      <div style={{ fontSize: `${titleFontSize}px`, fontWeight: "900", color: "#0f172a", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: textAlignment }}>
                        {item.name}
                      </div>
                    )}
                    <div style={{ width: "100%", display: "flex", flex: "1", alignItems: "center", justifyContent: "center", minHeight: "0" }}>
                      <Barcode128SVG
                        text={item.barcode || item.sku || "000000"}
                        width={labelWidth - 2 * labelPadding}
                        height={barcodeHeight}
                      />
                    </div>
                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: `${footerFontSize}px`, fontWeight: "900", color: "#64748b", boxSizing: "border-box" }}>
                      <div style={{ textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1", textAlign: "left" }}>
                        {showSkuId && (item.sku || "—")}
                        {showProductCode && item.product_code && item.product_code !== item.sku && ` / ${item.product_code}`}
                      </div>
                      {showPrice && (
                        <div style={{ color: "#0f172a", fontWeight: "900" }}>
                          ${parseFloat(item.price || 0).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {isFullscreenDesigner && (
        <div className="fixed inset-0 z-50 bg-slate-955 flex flex-col print:hidden font-sans">
          {/* Top Navbar */}
          <div className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Sliders size={20} />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Premium Barcode Workspace</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  {printMode === "single"
                    ? `Single Item: "${items.find(i => String(i.id) === String(singleSelectItem))?.name || 'Selected Item'}" (${singlePrintQty} labels)`
                    : `Batch Print: ${Object.values(selectedItems).filter(Boolean).length} items selected (${flattenedList.length} labels)`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintTrigger}
                disabled={flattenedList.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer"
              >
                <Printer size={14} />
                Print Now ({flattenedList.length} Labels)
              </button>
              <button
                onClick={() => setIsFullscreenDesigner(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                <X size={14} />
                Exit Designer
              </button>
            </div>
          </div>

          {/* Main workspace */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] overflow-hidden">
            {/* Left panel Controls */}
            <div className="bg-slate-900 border-r border-slate-800 p-6 overflow-y-auto flex flex-col gap-6 text-slate-300 text-left">
              {/* Print Mode Section */}
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Print Mode</h3>
                <div className="grid grid-cols-2 gap-2 bg-slate-850 p-1.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setPrintMode("batch")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                      printMode === "batch"
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Batch Select
                  </button>
                  <button
                    onClick={() => setPrintMode("single")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                      printMode === "single"
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Single Product Bulk
                  </button>
                </div>
              </div>

              {/* Single Product Config */}
              {printMode === "single" && (
                <div className="bg-slate-850 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      1. Select Product
                    </label>
                    <select
                      value={singleSelectItem}
                      onChange={(e) => setSingleSelectItem(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:border-orange-500 focus:outline-hidden"
                    >
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      2. Total Label Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={1000}
                      value={singlePrintQty}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        const val = Math.min(1000, Math.max(1, parsed || 1));
                        if (parsed > 1000) {
                          setQtyWarning("Quantity automatically capped at 1,000 labels per item to prevent browser crashes.");
                          setTimeout(() => setQtyWarning(""), 5000);
                        }
                        setSinglePrintQty(val);
                      }}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 text-center focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Batch Product Config */}
              {printMode === "batch" && (
                <div className="bg-slate-850 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 max-h-[300px] overflow-y-auto">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Configure Quantities
                  </span>
                  {items.map((item) => {
                    const isChecked = !!selectedItems[item.id];
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-xs border-b border-slate-800/60 pb-2 last:border-b-0 last:pb-0">
                        <button
                          type="button"
                          onClick={() => handleItemSelectToggle(item.id)}
                          className="flex-1 text-left font-bold text-slate-200 hover:text-orange-400 truncate cursor-pointer flex items-center gap-2"
                        >
                          <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-700 bg-slate-900'}`}>
                            {isChecked && <div className="h-2 w-2 bg-white rounded-xs" />}
                          </div>
                          <span className="truncate">{item.name}</span>
                        </button>
                        
                        {isChecked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.id, (printQuantities[item.id] || 1) - 1)}
                              className="h-6 w-6 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer select-none"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={1000}
                              value={printQuantities[item.id] || 1}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="w-10 h-6 bg-slate-900 border border-slate-800 text-slate-200 text-center font-black text-xs rounded-lg focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.id, (printQuantities[item.id] || 1) + 1)}
                              className="h-6 w-6 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer select-none"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Preset selection */}
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dimensions Preset</h3>
                <div className="flex flex-col gap-2">
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(idx)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                        currentPreset === idx
                          ? "border-orange-500 bg-orange-500/10 text-orange-400 font-bold"
                          : "border-slate-800 bg-slate-850 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <span>{preset.name}</span>
                      <span className="text-[9px] uppercase font-bold opacity-60">
                        {preset.cols} {preset.cols === 1 ? "Col" : "Cols"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Size Tuning */}
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Size & Padding Tuning</h3>
                <div className="flex flex-col gap-4 text-xs font-bold text-slate-400">
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span>Columns per Row</span>
                      <span className="text-orange-400">{customCols} cols</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={customCols}
                      onChange={(e) => {
                        setCurrentPreset(-1);
                        setCustomCols(Number(e.target.value));
                      }}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span>Label Width</span>
                        <span className="text-orange-400">{labelWidth}px</span>
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
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span>Label Height</span>
                        <span className="text-orange-400">{labelHeight}px</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="250"
                        value={labelHeight}
                        onChange={(e) => {
                          setCurrentPreset(-1);
                          setLabelHeight(Number(e.target.value));
                        }}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span>Label Gap</span>
                        <span className="text-orange-400">{gridGap}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="40"
                        value={gridGap}
                        onChange={(e) => {
                          setCurrentPreset(-1);
                          setGridGap(Number(e.target.value));
                        }}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span>Label Padding</span>
                        <span className="text-orange-400">{labelPadding}px</span>
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
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span>Barcode Height</span>
                      <span className="text-orange-400">{barcodeHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="80"
                      value={barcodeHeight}
                      onChange={(e) => {
                        setCurrentPreset(-1);
                        setBarcodeHeight(Number(e.target.value));
                      }}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span>Title Size</span>
                        <span className="text-orange-400">{titleFontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="20"
                        value={titleFontSize}
                        onChange={(e) => setTitleFontSize(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span>Meta text Size</span>
                        <span className="text-orange-400">{footerFontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="16"
                        value={footerFontSize}
                        onChange={(e) => setFooterFontSize(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block mb-2">Item Title Alignment</span>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-850 border border-slate-800 rounded-lg">
                      {["left", "center", "right"].map((align) => (
                        <button
                          key={align}
                          onClick={() => setTextAlignment(align)}
                          className={`py-1 rounded text-[10px] uppercase font-black transition cursor-pointer ${
                            textAlignment === align
                              ? "bg-slate-700 text-slate-100"
                              : "text-slate-500 hover:text-slate-350"
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Elements Toggles */}
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Printed Elements</h3>
                <div className="flex flex-col gap-2.5 text-xs font-bold text-slate-400">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showItemName}
                      onChange={(e) => setShowItemName(e.target.checked)}
                      className="h-4 w-4 rounded-sm border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500"
                    />
                    <span>Print Item Name</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSkuId}
                      onChange={(e) => setShowSkuId(e.target.checked)}
                      className="h-4 w-4 rounded-sm border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500"
                    />
                    <span>Print SKU text</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showProductCode}
                      onChange={(e) => setShowProductCode(e.target.checked)}
                      className="h-4 w-4 rounded-sm border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500"
                    />
                    <span>Print Product Code</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="h-4 w-4 rounded-sm border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500"
                    />
                    <span>Print Price Tag</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right preview display */}
            <div className="flex-1 bg-slate-950 p-8 overflow-auto flex justify-center items-start">
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-full">
                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 text-left">
                  Sheet Print Preview
                </span>
                
                {flattenedList.length === 0 ? (
                  <div className="py-24 px-12 text-slate-500 text-xs font-bold text-center border border-slate-800 rounded-2xl bg-slate-900/20 max-w-lg">
                    Select a product and configure the labels count to generate a live print preview sheet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {qtyWarning && (
                      <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold rounded-xl flex items-center gap-2">
                        <AlertCircle size={14} />
                        <span>{qtyWarning}</span>
                      </div>
                    )}
                    {flattenedList.length > 150 && (
                      <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold rounded-xl flex items-center gap-2">
                        <AlertCircle size={14} />
                        <span>Showing first 150 labels for preview performance. All {flattenedList.length} labels will be printed.</span>
                      </div>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${customCols}, minmax(0, 1fr))`,
                        gap: `${gridGap}px`,
                        justifyContent: "start",
                      }}
                      className="p-4 bg-slate-900 rounded-2xl border border-slate-800"
                    >
                      {flattenedList.slice(0, 150).map((item, idx) => { return (
                      <div
                        key={item.printIndex || idx}
                        style={{
                          width: `${labelWidth}px`,
                          height: `${labelHeight}px`,
                          padding: `${labelPadding}px`,
                        }}
                        className="bg-white border border-slate-200 shadow-xs flex flex-col justify-between items-center overflow-hidden rounded-md text-center"
                      >
                        {/* Name */}
                        {showItemName && (
                          <div
                            style={{
                              fontSize: `${titleFontSize}px`,
                              textAlign: textAlignment,
                            }}
                            className="font-black text-slate-900 truncate w-full px-1"
                          >
                            {item.name}
                          </div>
                        )}

                        {/* Barcode representation */}
                        <div className="w-full flex-1 flex items-center justify-center min-h-0 py-1">
                          <Barcode128SVG
                            text={item.barcode || item.sku || "000000"}
                            width={labelWidth - 2 * labelPadding}
                            height={barcodeHeight}
                          />
                        </div>

                        {/* Meta text footer */}
                        <div
                          style={{ fontSize: `${footerFontSize}px` }}
                          className="w-full flex justify-between items-center gap-2 font-black text-slate-500 px-1 select-none"
                        >
                          <div className="truncate flex-1 text-left uppercase">
                            {showSkuId && (item.sku || "—")}
                            {showProductCode && item.product_code && item.product_code !== item.sku && ` / Code: ${item.product_code}`}
                          </div>
                          {showPrice && (
                            <div className="text-slate-900 font-black">
                              ${parseFloat(item.price || 0).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default BarcodePrinting;
