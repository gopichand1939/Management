import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import InventoryForm from "./InventoryForm";
import {
  GET_FLOOR_LIST,
  GET_INSTITUTION_LIST,
  GET_ROOM_LIST,
  INVENTORY_UPDATE,
  INVENTORY_VIEW,
  TOKEN_KEY,
} from "../../Utils/Constants";

const manualFloorValues = ["Not Required", "Common Area", "Store Room"];

const EditInventory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [institutions, setInstitutions] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [formData, setFormData] = useState({
    institution_id: "",
    item_name: "",
    category: "",
    floor_id: "",
    floor_label: "",
    floor_mode: "",
    room_no: "",
    quantity: "",
    purchase_date: "",
    purchase_price: "",
    supplier_name: "",
    condition: "",
    status: "",
    remarks: "",
    item_photo: null,
    item_photo_file: null,
  });

  const requestHeaders = {
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
    "Content-Type": "application/json",
  };

  const fetchDropdownData = async (url, body = {}) => {
    const response = await fetch(url, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Dropdown fetch failed");
    }

    return data.data || [];
  };

  useEffect(() => {
    const getInventory = async () => {
      setPageLoading(true);
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

        const inventory = data.inventory || {};

        setFormData({
          institution_id: inventory.institution_id || "",
          item_name: inventory.item_name || "",
          category: inventory.category || "",
          floor_id: inventory.floor_id || "",
          floor_label: inventory.floor_label || "",
          floor_mode: inventory.floor_id ? "" : inventory.floor_label ? "manual_custom" : "",
          room_no: inventory.room_no || "",
          quantity: inventory.quantity || "",
          purchase_date: inventory.purchase_date?.slice(0, 10) || "",
          purchase_price: inventory.purchase_price || "",
          supplier_name: inventory.supplier_name || "",
          condition: inventory.condition || "",
          status: inventory.status || "active",
          remarks: inventory.remarks || "",
          item_photo: inventory.item_photo || null,
          item_photo_file: null,
        });
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setPageLoading(false);
      }
    };

    getInventory();
  }, [id]);

  useEffect(() => {
    const getInstitutions = async () => {
      setLoadingInstitutions(true);
      setError("");

      try {
        const institutionList = await fetchDropdownData(GET_INSTITUTION_LIST);
        setInstitutions(institutionList);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    getInstitutions();
  }, []);

  useEffect(() => {
    const getFloors = async () => {
      if (!formData.institution_id) {
        setFloors([]);
        return;
      }

      setLoadingFloors(true);
      setError("");

      try {
        const floorList = await fetchDropdownData(GET_FLOOR_LIST, {
          institution_id: formData.institution_id,
        });
        setFloors(floorList);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingFloors(false);
      }
    };

    getFloors();
  }, [formData.institution_id]);

  useEffect(() => {
    const getRooms = async () => {
      if (
        !formData.institution_id ||
        !formData.floor_id ||
        manualFloorValues.includes(formData.floor_id)
      ) {
        setRooms([]);
        return;
      }

      setLoadingRooms(true);
      setError("");

      try {
        const roomList = await fetchDropdownData(GET_ROOM_LIST, {
          institution_id: formData.institution_id,
          floor_id: formData.floor_id,
        });
        setRooms(roomList);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoadingRooms(false);
      }
    };

    getRooms();
  }, [formData.institution_id, formData.floor_id]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "institution_id") {
      setFormData({
        ...formData,
        institution_id: value,
        floor_id: "",
        floor_label: "",
        floor_mode: "",
        room_no: "",
      });
      return;
    }

    if (name === "floor_select") {
      if (value === "manual_custom") {
        setFormData({
          ...formData,
          floor_id: "",
          floor_label: "",
          floor_mode: "manual_custom",
          room_no: "",
        });
        return;
      }

      if (value.startsWith("manual:")) {
        setFormData({
          ...formData,
          floor_id: "",
          floor_label: value.replace("manual:", ""),
          floor_mode: "",
          room_no: "",
        });
        return;
      }

      setFormData({
        ...formData,
        floor_id: value,
        floor_label: "",
        floor_mode: "",
        room_no: "",
      });
      return;
    }

    if (name === "floor_label") {
      setFormData({
        ...formData,
        floor_id: "",
        floor_label: value,
        floor_mode: "manual_custom",
        room_no: "",
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFileChange = (event) => {
    setFormData({
      ...formData,
      item_photo_file: event.target.files?.[0] || null,
    });
  };

  const buildInventoryFormData = () => {
    const payload = new FormData();

    payload.append("id", id);

    Object.entries(formData).forEach(([key, value]) => {
      if (key === "item_photo_file" || key === "item_photo") {
        return;
      }

      payload.append(key, value || "");
    });

    if (formData.item_photo_file) {
      payload.append("item_photo", formData.item_photo_file);
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(INVENTORY_UPDATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: buildInventoryFormData(),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Inventory update failed");
        return;
      }

      navigate("/inventory");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-[720px] mx-auto w-full flex flex-col gap-6 md:gap-8">
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Edit Inventory
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Update institution inventory item details
                </p>
              </div>

              <Error message={error} />

              {pageLoading ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm p-6 flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                <InventoryForm
                  formData={formData}
                  buttonText={loading ? "Updating..." : "Update Inventory"}
                  onChange={handleChange}
                  onFileChange={handleFileChange}
                  onSubmit={handleSubmit}
                  institutions={institutions}
                  floors={floors}
                  rooms={rooms}
                  loadingInstitutions={loadingInstitutions}
                  loadingFloors={loadingFloors}
                  loadingRooms={loadingRooms}
                  disabled={loading}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditInventory;
