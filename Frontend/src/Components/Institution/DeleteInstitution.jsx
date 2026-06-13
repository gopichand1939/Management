import { Trash2 } from "lucide-react";

const DeleteInstitution = ({ onDelete }) => {
  return (
    <button
      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-red-50 hover:text-red-500"
      title="Delete institution"
      type="button"
      onClick={onDelete}
    >
      <Trash2 size={14} />
    </button>
  );
};

export default DeleteInstitution;
