import Button from "../../Common/Button";

const DeleteRationCategory = ({
  category,
  loading = false,
  onClose,
  onConfirm,
}) => {
  if (!category) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
        <div className="text-left">
          <h2 className="text-xl font-black text-slate-800">Delete Category</h2>
          <p className="mt-2 text-sm text-slate-500">
            Delete <span className="font-bold text-slate-700">{category.category_name}</span>.
            Are you sure you want to delete this category? This action cannot be undone.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Delete Category"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteRationCategory;
