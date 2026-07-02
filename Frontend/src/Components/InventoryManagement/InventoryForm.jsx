import {
  CalendarDays,
  ClipboardList,
  IndianRupee,
  Package,
  PackageCheck,
  Upload,
  StickyNote,
  Store,
  Tag,
  Layers3,
} from "lucide-react";
import { useState } from "react";

import Button from "../Common/Button";
import InputField from "../Common/InputField";

const categoryOptions = [
  "Furniture",
  "Electronics",
  "Electrical",
  "Bedding",
  "Kitchen",
  "Cleaning",
  "Plumbing",
  "Safety",
  "Other",
];

const supplierOptions = [
  "Vendor",
  "Local Vendor",
  "Online Purchase",
  "Owner",
  "Maintenance Team",
  "Other",
];

const conditionOptions = [
  "New",
  "Good",
  "Average",
  "Damaged",
  "Repair Required",
  "Other",
];

const remarksOptions = [
  "New purchase",
  "Replacement item",
  "Regular inventory item",
];

const floorManualOptions = [
  {
    id: "Not Required",
    floor_name: "Not Required",
  },
  {
    id: "Common Area",
    floor_name: "Common Area",
  },
  {
    id: "Store Room",
    floor_name: "Store Room",
  },
];

const roomManualOptions = [
  {
    room_number: "Not Required",
  },
  {
    room_number: "Common Area",
  },
  {
    room_number: "Store Room",
  },
];

const InventoryForm = ({
  formData,
  onChange,
  onFileChange,
  onSubmit,
  buttonText,
  institutions = [],
  floors = [],
  rooms = [],
  loadingInstitutions = false,
  loadingFloors = false,
  loadingRooms = false,
  disabled = false,
}) => {
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const selectClassName = `
    w-full
    border-0
    bg-transparent
    text-slate-800
    outline-none
    text-sm
  `;

  const renderSelect = ({
    label,
    name,
    value,
    options,
    placeholder,
    disabled: selectDisabled = false,
    getOptionLabel,
    getOptionValue,
  }) => {
    return (
      <div className="grid gap-1.5">
        <label
          htmlFor={name}
          className="text-xs font-bold text-slate-500 uppercase tracking-wider"
        >
          {label}
        </label>

        <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-slate-400 transition-all duration-200 focus-within:text-orange-500 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white shadow-sm">
          <select
            id={name}
            name={name}
            value={value || ""}
            onChange={onChange}
            disabled={selectDisabled}
            className={selectClassName}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={getOptionValue(option)} value={getOptionValue(option)}>
                {getOptionLabel(option)}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const itemPhotoPreview = formData.item_photo_file
    ? URL.createObjectURL(formData.item_photo_file)
    : formData.item_photo?.file_url || "";
  const roomOptions = [...roomManualOptions, ...rooms];
  const manualFloorNames = floorManualOptions.map((floor) => floor.floor_name);
  const isCustomFloor = formData.floor_mode === "manual_custom"
    || (!formData.floor_id && formData.floor_label && !manualFloorNames.includes(formData.floor_label));
  const floorSelectValue = isCustomFloor ? "manual_custom" : formData.floor_id
    || (manualFloorNames.includes(formData.floor_label) ? `manual:${formData.floor_label}` : "")
    || "";
  const floorSelectOptions = [
    ...floors.map((floor) => ({
      label: floor.floor_name,
      value: floor.id,
    })),
    ...floorManualOptions.map((floor) => ({
      label: floor.floor_name,
      value: `manual:${floor.floor_name}`,
    })),
    {
      label: "Manual Floor / Place",
      value: "manual_custom",
    },
  ];
  const showManualFloorInput = isCustomFloor;
  const roomInputOptions = roomOptions.map((room) => {
    return room.room_number;
  });

  const handlePhotoDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === "dragenter" || event.type === "dragover") {
      setIsDraggingPhoto(true);
      return;
    }

    if (event.type === "dragleave") {
      setIsDraggingPhoto(false);
    }
  };

  const handlePhotoDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingPhoto(false);

    const file = event.dataTransfer.files?.[0];

    if (!file || !onFileChange) {
      return;
    }

    onFileChange({
      target: {
        files: [file],
      },
    });
  };

  return (
    <form
      className={`
        bg-white
        border
        border-slate-100
        rounded-2xl
        w-full
        max-w-[720px]
        p-8
        shadow-sm
        animate-[floatIn_480ms_ease]
      `}
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {renderSelect({
          label: "Institution",
          name: "institution_id",
          value: formData.institution_id,
          options: institutions,
          placeholder: loadingInstitutions ? "Loading institutions..." : "Select institution",
          disabled: disabled || loadingInstitutions,
          getOptionLabel: (institution) => institution.institution_name,
          getOptionValue: (institution) => institution.id,
        })}

        <InputField
          label="Item Name"
          name="item_name"
          value={formData.item_name || ""}
          placeholder="Item name"
          icon={Package}
          onChange={onChange}
        />

        <InputField
          label="Category"
          name="category"
          value={formData.category || ""}
          placeholder="Select or type category"
          icon={Tag}
          list="inventory-category-options"
          options={categoryOptions}
          onChange={onChange}
        />

        {renderSelect({
          label: "Floor",
          name: "floor_select",
          value: floorSelectValue,
          options: floorSelectOptions,
          placeholder: loadingFloors ? "Loading floors..." : "Select floor",
          disabled: disabled || loadingFloors || !formData.institution_id,
          getOptionLabel: (floor) => floor.label,
          getOptionValue: (floor) => floor.value,
        })}

        {showManualFloorInput && (
          <InputField
            label="Manual Floor / Place"
            name="floor_label"
            value={formData.floor_label || ""}
            placeholder="Type floor or place"
            icon={Layers3}
            onChange={onChange}
          />
        )}

        <InputField
          label="Room No"
          name="room_no"
          value={formData.room_no || ""}
          placeholder={loadingRooms ? "Loading rooms..." : "Select or type room"}
          icon={ClipboardList}
          list="inventory-room-options"
          options={roomInputOptions}
          onChange={onChange}
        />

        <InputField
          label="Quantity"
          name="quantity"
          type="number"
          value={formData.quantity || ""}
          placeholder="Quantity"
          icon={PackageCheck}
          onChange={onChange}
        />

        <InputField
          label="Purchase Date"
          name="purchase_date"
          type="date"
          value={formData.purchase_date || ""}
          placeholder="Purchase date"
          icon={CalendarDays}
          onChange={onChange}
        />

        <InputField
          label="Purchase Price"
          name="purchase_price"
          type="number"
          value={formData.purchase_price || ""}
          placeholder="Purchase price"
          icon={IndianRupee}
          onChange={onChange}
        />

        <InputField
          label="Supplier Name"
          name="supplier_name"
          value={formData.supplier_name || ""}
          placeholder="Select or type supplier"
          icon={Store}
          list="inventory-supplier-options"
          options={supplierOptions}
          onChange={onChange}
        />

        <InputField
          label="Condition"
          name="condition"
          value={formData.condition || ""}
          placeholder="Select or type condition"
          icon={PackageCheck}
          list="inventory-condition-options"
          options={conditionOptions}
          onChange={onChange}
        />

        <div className="grid gap-1.5 md:col-span-2">
          <label
            htmlFor="item_photo"
            className="text-xs font-bold text-slate-500 uppercase tracking-wider"
          >
            Item Photo
          </label>

          <div
            className={`
              flex
              flex-col
              gap-3
              rounded-xl
              border
              border-dashed
              p-4
              transition-all
              duration-200
              ${
                isDraggingPhoto
                  ? "border-orange-400 bg-orange-50/40"
                  : "border-slate-200 bg-slate-50/50"
              }
            `}
            onDragEnter={handlePhotoDrag}
            onDragOver={handlePhotoDrag}
            onDragLeave={handlePhotoDrag}
            onDrop={handlePhotoDrop}
          >
            {itemPhotoPreview && (
              <img
                src={itemPhotoPreview}
                alt="Inventory item"
                className="h-28 w-28 rounded-xl border border-slate-100 object-cover shadow-sm"
              />
            )}

            <label
              htmlFor="item_photo"
              className="inline-flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100"
            >
              <Upload size={16} />
              <span>{itemPhotoPreview ? "Change Photo" : "Upload Photo"}</span>
            </label>

            <p className="text-xs font-semibold text-slate-400">
              Drag and drop image here, or click upload
            </p>

            <input
              id="item_photo"
              name="item_photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </div>

        <InputField
          label="Status"
          name="status"
          value={formData.status || ""}
          placeholder="active"
          icon={ClipboardList}
          onChange={onChange}
        />

        <InputField
          label="Remarks"
          name="remarks"
          value={formData.remarks || ""}
          placeholder="Select or type remarks"
          icon={StickyNote}
          list="inventory-remarks-options"
          options={remarksOptions}
          onChange={onChange}
        />

        <div className="md:col-span-2">
          <Button type="submit" disabled={disabled}>
            {buttonText}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default InventoryForm;
