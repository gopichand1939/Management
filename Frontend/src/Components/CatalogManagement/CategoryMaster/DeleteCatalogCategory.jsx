import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "../../Common/Button";
import { CATALOG_CATEGORY_DELETE, TOKEN_KEY } from "../../../Utils/Constants";

const DeleteCatalogCategory = ({
  category,
  onClose,
  onDeleted,
  setToast,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!category) return;
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(CATALOG_CATEGORY_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: Number(category.id) }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || "Failed to delete category";
        setError(msg);
        setToast({ message: msg, type: "error" });
        return;
      }

      setToast({
        message: "Catalog category deleted successfully",
        type: "success",
      });
      onDeleted();
      onClose();
    } catch (err) {
      const msg = err.message || "Failed to delete category";
      setError(msg);
      setToast({ message: msg, type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl text-left">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-950">Delete Category</h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed">
          Are you sure you want to delete the category{" "}
          <span className="font-bold text-slate-900">"{category?.category_name}"</span>
          {category?.category_code ? ` (${category.category_code})` : ""}? 
          All items mapped to this category will have their category reference set to empty.
        </p>

        {error && (
          <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3 mb-5 flex gap-2">
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            className="!bg-rose-600 hover:!bg-rose-700 active:!bg-rose-800 text-white font-bold"
          >
            {deleting ? "Deleting..." : "Delete Category"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteCatalogCategory;
