import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Search, Camera, X, RefreshCw } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

import Button from "../../Common/Button";
import SearchBar from "../../Common/SearchBar";
import InputField from "../../Common/InputField";
import Error from "../../Common/Error";
import PageLoader from "../../Common/PageLoader";
import {
  RATION_ITEM_SCAN,
  RATION_ITEM_LIST,
  TOKEN_KEY
} from "../../../Utils/Constants";

const RationItemScanner = forwardRef(({ onItemSelected, institutionId }, ref) => {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // Search Modal state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Camera Scan state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [html5Qrcode, setHtml5Qrcode] = useState(null);
  const [cameraError, setCameraError] = useState("");

  const scannerContainerId = "reader-container";

  // Expose focus function to parent
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      focusInput();
    }
  }));

  // Auto-focus input on mount
  useEffect(() => {
    focusInput();
  }, []);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleBarcodeChange = (e) => {
    setBarcode(e.target.value);
  };

  // Parse code and call scan API
  const processBarcode = async (rawCode) => {
    let cleanCode = (rawCode || "").trim();
    if (!cleanCode) {
      setError("Please scan or enter a barcode");
      return;
    }

    // Remove ITEM: prefix if present
    if (cleanCode.toUpperCase().startsWith("ITEM:")) {
      cleanCode = cleanCode.substring(5);
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(RATION_ITEM_SCAN, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barcode: cleanCode,
          institution_id: institutionId ? Number(institutionId) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError("Item not found");
        } else {
          setError(data.message || "Unable to fetch item details");
        }
        setBarcode("");
        focusInput();
        return;
      }

      const item = data.data;
      if (item) {
        onItemSelected(item);
        setBarcode("");
      }
    } catch (e) {
      setError("Unable to fetch item details");
      setBarcode("");
      focusInput();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      processBarcode(barcode);
    }
  };

  const handleClear = () => {
    setBarcode("");
    setError("");
    focusInput();
  };

  // Item Search
  const searchItems = async (query) => {
    setSearching(true);
    try {
      const response = await fetch(RATION_ITEM_LIST, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: institutionId ? Number(institutionId) : undefined,
          search: query,
          status: "active",
          page: 1,
          limit: 30,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.data || []);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (searchModalOpen) {
      searchItems(searchQuery);
    }
  }, [searchQuery, searchModalOpen]);

  const handleSelectSearchResult = (item) => {
    onItemSelected(item);
    setSearchModalOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    focusInput();
  };

  // Camera scanner integration
  const startCamera = async () => {
    setCameraError("");
    try {
      const html5QrCodeInstance = new Html5Qrcode(scannerContainerId);
      setHtml5Qrcode(html5QrCodeInstance);

      const qrCodeSuccessCallback = (decodedText) => {
        // Stop scanning and close modal
        html5QrCodeInstance.stop().then(() => {
          setCameraModalOpen(false);
          setHtml5Qrcode(null);
          // Process the scanned code
          processBarcode(decodedText);
        }).catch(() => {
          setCameraModalOpen(false);
          setHtml5Qrcode(null);
          processBarcode(decodedText);
        });
      };

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      await html5QrCodeInstance.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback
      );
    } catch (err) {
      console.error("Camera scan error:", err);
      setCameraError("Camera permission was denied. Use barcode entry or item search.");
    }
  };

  const stopCamera = async () => {
    if (html5Qrcode) {
      try {
        await html5Qrcode.stop();
      } catch (err) {
        console.error("Stop camera error:", err);
      }
      setHtml5Qrcode(null);
    }
    setCameraModalOpen(false);
    focusInput();
  };

  useEffect(() => {
    if (cameraModalOpen) {
      // Delay slightly to ensure DOM element is ready
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [cameraModalOpen]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 text-left">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Scan QR / Barcode or Enter Manually
        </label>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <InputField
              ref={inputRef}
              name="barcode"
              value={barcode}
              placeholder="Scan barcode or enter manually (e.g. RAT000001)"
              onChange={handleBarcodeChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="pr-10"
            />
            {loading && (
              <div className="absolute right-3 top-3.5 text-slate-400">
                <RefreshCw size={16} className="animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => processBarcode(barcode)}
              disabled={loading || !barcode}
            >
              Scan
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClear}
              disabled={loading}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={Search}
              onClick={() => setSearchModalOpen(true)}
              disabled={loading}
            >
              Search Item
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={Camera}
              onClick={() => setCameraModalOpen(true)}
              disabled={loading}
            >
              Camera Scan
            </Button>
          </div>
        </div>
      </div>

      <Error message={error} />

      {/* Manual Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b pb-4 text-left">
              <div>
                <h3 className="text-lg font-black text-slate-800">Search Item</h3>
                <p className="text-xs text-slate-500 mt-0.5">Find item by name, SKU ID, or code</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchModalOpen(false);
                  focusInput();
                }}
                className="text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 relative">
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type item name, SKU ID, barcode, or code..."
                className="w-full"
              />
            </div>

            <div className="flex-1 overflow-y-auto mt-4 min-h-[250px] border border-slate-100 rounded-xl bg-slate-50/50 p-2">
              {searching ? (
                <div className="flex h-40 items-center justify-center">
                  <PageLoader />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm font-semibold text-slate-400">
                  No active items found
                </div>
              ) : (
                <div className="grid gap-2">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSearchResult(item)}
                      className="flex items-center gap-4 bg-white border border-slate-100 rounded-xl p-3.5 hover:border-orange-500/50 hover:shadow-sm transition cursor-pointer text-left"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.item_name}
                          className="h-10 w-10 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-xs">
                          {item.item_name?.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">
                          {item.item_name}
                        </h4>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400 font-semibold">
                          <span>Code: {item.item_code}</span>
                          <span>SKU: {item.sku_id}</span>
                          <span>Barcode: {item.barcode}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold bg-slate-100 text-slate-700 rounded-lg px-2 py-1">
                          {item.unit_code}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera QR Modal */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b pb-4 text-left">
              <div>
                <h3 className="text-lg font-black text-slate-800">Scan QR / Barcode</h3>
                <p className="text-xs text-slate-500 mt-0.5">Align barcode within the scanning box</p>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center">
              {cameraError ? (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-red-600 text-xs font-semibold leading-relaxed text-left w-full">
                  {cameraError}
                </div>
              ) : (
                <div
                  id={scannerContainerId}
                  className="w-full overflow-hidden rounded-xl border bg-slate-950 aspect-square max-h-[300px]"
                />
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="button" variant="secondary" onClick={stopCamera}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
});

export default RationItemScanner;
