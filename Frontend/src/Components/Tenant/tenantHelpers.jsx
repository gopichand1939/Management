export const tenantOnboardingSteps = [
  "Choose Building",
  "Floor Selection",
  "Room Selection",
  "Bed Selection",
  "Booking Details",
  "Guardian Details",
  "Documents Upload",
  "Payment Setup",
  "Review & Confirm",
];

export const getAuthHeaders = () => {
  return {
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
    "Content-Type": "application/json",
  };
};

export const getApiOrigin = () => {
  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  return apiBaseUrl.replace(/\/api\/?$/, "");
};

export const getAssetUrl = (fileUrl) => {
  if (!fileUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  return `${getApiOrigin()}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`;
};

export const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

export const defaultTenantForm = {
  institution_id: "",
  admission: {
    floor_id: "",
    room_id: "",
    bed_id: "",
    check_in_date: getTodayDate(),
    expected_checkout_date: "",
  },
  basic_details: {
    full_name: "",
    phone: "",
    email: "",
    gender: "male",
    date_of_birth: "",
    occupation: "",
    company_name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  },
  guardian_details: {
    guardian_name: "",
    guardian_phone: "",
    guardian_relation: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  },
  profile_photo_file: null,
  documents: [
    {
      document_name: "Aadhaar",
      document_type: "aadhaar",
      document_number: "",
      file: null,
    },
    {
      document_name: "PAN",
      document_type: "pan",
      document_number: "",
      file: null,
    },
  ],
  payment: {
    agreed_monthly_rent: "",
    amount: "",
    payment_type: "admission",
    payment_mode: "cash",
    payment_date: getTodayDate(),
    billing_cycle_type: "anniversary",
    reference_number: "",
    notes: "",
    status: "completed",
    payment_proof_file: null,
  },
  notes: "",
  status: "pending_verification",
  security_deposit: "",
  deposit_paid: "",
  refundable_amount: "",
  deposit_refund_status: "pending",
};

export const groupVacantBeds = (beds, institutions) => {
  const institutionMap = new Map(
    (institutions || []).map((institution) => [Number(institution.id), institution])
  );

  const groupedInstitutions = [];
  const institutionLookup = new Map();

  (beds || []).forEach((bed) => {
    const institutionId = Number(bed.institution_id);
    const floorId = Number(bed.floor_id);
    const roomId = Number(bed.room_id);

    let institution = institutionLookup.get(institutionId);
    if (!institution) {
      const institutionMeta = institutionMap.get(institutionId) || {};
      institution = {
        id: institutionId,
        institution_name: bed.institution_name || institutionMeta.institution_name || "-",
        institution_code: institutionMeta.institution_code || "",
        floors: [],
      };
      institutionLookup.set(institutionId, institution);
      groupedInstitutions.push(institution);
    }

    let floor = institution.floors.find((item) => Number(item.id) === floorId);
    if (!floor) {
      floor = {
        id: floorId,
        floor_name: bed.floor_name || `Floor ${bed.floor_number || ""}`.trim(),
        floor_number: Number(bed.floor_number || 0),
        gender_type: "mixed",
        rooms: [],
      };
      institution.floors.push(floor);
    }

    let room = floor.rooms.find((item) => Number(item.id) === roomId);
    if (!room) {
      room = {
        id: roomId,
        room_number: bed.room_number || "-",
        room_type: bed.room_type || "double",
        capacity: Number(bed.capacity || 0),
        rent_amount: Number(bed.rent_amount || 0),
        attached_bathroom: false,
        status: "active",
        beds: [],
      };
      floor.rooms.push(room);
    }

    room.beds.push({
      id: Number(bed.id),
      bed_number: bed.bed_number || "-",
      bed_type: bed.bed_type || "single",
      rent_override: bed.rent_override,
      status: bed.status || "vacant",
    });
  });

  groupedInstitutions.forEach((institution) => {
    institution.floors.sort((firstFloor, secondFloor) => {
      return firstFloor.floor_number - secondFloor.floor_number;
    });

    institution.floors.forEach((floor) => {
      floor.rooms.sort((firstRoom, secondRoom) => {
        return String(firstRoom.room_number).localeCompare(String(secondRoom.room_number), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
    });
  });

  return groupedInstitutions;
};

export const buildTenantStats = (institution) => {
  const floors = institution?.floors || [];
  const totalFloors = floors.length;
  const totalRooms = floors.reduce((sum, floor) => sum + floor.rooms.length, 0);
  const totalBeds = floors.reduce((sum, floor) => {
    return sum + floor.rooms.reduce((roomSum, room) => roomSum + room.beds.length, 0);
  }, 0);

  return {
    totalFloors,
    totalRooms,
    totalBeds,
    occupiedBeds: 0,
    occupancyPercent: 0,
  };
};

export const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDisplayDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const getStatusBadgeClassName = (status) => {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "active" || normalizedStatus === "verified" || normalizedStatus === "vacant") {
    return "border-emerald-100 bg-emerald-50 text-emerald-600";
  }

  if (normalizedStatus === "pending" || normalizedStatus === "pending_verification" || normalizedStatus === "notice_period") {
    return "border-amber-100 bg-amber-50 text-amber-600";
  }

  if (normalizedStatus === "vacated") {
    return "border-sky-100 bg-sky-50 text-sky-600";
  }

  if (normalizedStatus === "blocked" || normalizedStatus === "rejected" || normalizedStatus === "maintenance") {
    return "border-rose-100 bg-rose-50 text-rose-600";
  }

  if (normalizedStatus === "reserved") {
    return "border-violet-100 bg-violet-50 text-violet-600";
  }

  return "border-slate-100 bg-slate-50 text-slate-600";
};

export const buildMetricCards = (items) => {
  return items.map((item) => ({
    ...item,
    id: item.label.toLowerCase().replace(/\s+/g, "-"),
  }));
};

export const buildCreatePayload = (formData) => {
  return {
    institution_id: Number(formData.institution_id),
    admission: {
      floor_id: Number(formData.admission.floor_id),
      room_id: Number(formData.admission.room_id),
      bed_id: Number(formData.admission.bed_id),
      check_in_date: formData.admission.check_in_date || null,
      expected_checkout_date: formData.admission.expected_checkout_date || null,
    },
    basic_details: {
      full_name: String(formData.basic_details.full_name || "").trim(),
      phone: String(formData.basic_details.phone || "").trim(),
      email: String(formData.basic_details.email || "").trim(),
      gender: formData.basic_details.gender || null,
      date_of_birth: formData.basic_details.date_of_birth || null,
      occupation: String(formData.basic_details.occupation || "").trim(),
      company_name: String(formData.basic_details.company_name || "").trim(),
      address: String(formData.basic_details.address || "").trim(),
      city: String(formData.basic_details.city || "").trim(),
      state: String(formData.basic_details.state || "").trim(),
      pincode: String(formData.basic_details.pincode || "").trim(),
    },
    guardian_details: {
      guardian_name: String(formData.guardian_details.guardian_name || "").trim(),
      guardian_phone: String(formData.guardian_details.guardian_phone || "").trim(),
      guardian_relation: String(formData.guardian_details.guardian_relation || "").trim(),
      emergency_contact_name: String(
        formData.guardian_details.emergency_contact_name || ""
      ).trim(),
      emergency_contact_phone: String(
        formData.guardian_details.emergency_contact_phone || ""
      ).trim(),
    },
    documents: (formData.documents || []).map((document) => ({
      document_name: String(document.document_name || "").trim(),
      document_type: String(document.document_type || "").trim(),
      document_number: String(document.document_number || "").trim(),
      document_url: String(document.document_url || "").trim(),
    })),
    payment: {
      agreed_monthly_rent:
        formData.payment.agreed_monthly_rent === ""
          ? null
          : Number(formData.payment.agreed_monthly_rent),
      amount: formData.payment.amount === "" ? null : Number(formData.payment.amount),
      payment_type: formData.payment.payment_type || null,
      payment_mode: formData.payment.payment_mode || null,
      payment_date: formData.payment.payment_date || null,
      billing_cycle_type: formData.payment.billing_cycle_type || "anniversary",
      reference_number: String(formData.payment.reference_number || "").trim(),
      notes: String(formData.payment.notes || "").trim(),
      status: formData.payment.status || "completed",
      verification_status:
        (formData.payment.status || "completed") === "completed"
          ? "verified"
          : "pending",
    },
    notes: String(formData.notes || "").trim(),
    status: formData.status || "pending_verification",
    security_deposit:
      formData.security_deposit === "" ? null : Number(formData.security_deposit),
    deposit_paid:
      formData.deposit_paid === "" ? null : Number(formData.deposit_paid),
    refundable_amount:
      formData.refundable_amount === "" ? null : Number(formData.refundable_amount),
    deposit_refund_status: formData.deposit_refund_status || "pending",
  };
};

export const buildCreateFormData = (formData) => {
  const payload = buildCreatePayload(formData);
  const multipartData = new FormData();

  multipartData.append("institution_id", String(payload.institution_id));
  multipartData.append("admission", JSON.stringify(payload.admission));
  multipartData.append("basic_details", JSON.stringify(payload.basic_details));
  multipartData.append("guardian_details", JSON.stringify(payload.guardian_details));
  multipartData.append("payment", JSON.stringify({
    ...payload.payment,
    payment_proof_url: null,
  }));
  multipartData.append("notes", payload.notes || "");
  multipartData.append("status", payload.status || "pending_verification");
  multipartData.append("security_deposit", payload.security_deposit ?? "");
  multipartData.append("deposit_paid", payload.deposit_paid ?? "");
  multipartData.append("refundable_amount", payload.refundable_amount ?? "");
  multipartData.append("deposit_refund_status", payload.deposit_refund_status || "pending");

  const documentMetadata = (formData.documents || []).map((document) => ({
    document_name: document.document_name,
    document_type: document.document_type,
    document_number: document.document_number,
  }));

  multipartData.append("documents", JSON.stringify(documentMetadata));

  if (formData.profile_photo_file) {
    multipartData.append("profile_photo", formData.profile_photo_file);
  }

  if (formData.payment.payment_proof_file) {
    multipartData.append("payment_proof", formData.payment.payment_proof_file);
  }

  (formData.documents || []).forEach((document) => {
    if (!document.file) {
      return;
    }

    if (document.document_type === "aadhaar") {
      multipartData.append("aadhaar_file", document.file);
      return;
    }

    if (document.document_type === "pan") {
      multipartData.append("pan_file", document.file);
      return;
    }

    multipartData.append("document_files", document.file);
  });

  return multipartData;
};
