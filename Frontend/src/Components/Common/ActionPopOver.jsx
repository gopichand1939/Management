import { Edit, Eye, Trash2 } from "lucide-react";

const ActionPopOver = ({ onView, onEdit, onDelete }) => {
  const iconButtonClassName = `
    grid
    h-8
    w-8
    cursor-pointer
    place-items-center
    rounded-lg
    border
    border-slate-200
    bg-white
    text-slate-500
    transition-all
    duration-200
    hover:-translate-y-0.5
    hover:border-slate-300
    hover:bg-slate-50
    hover:text-slate-800
    shadow-sm
  `;

  return (
    <div
      className={`
        flex
        gap-1.5
      `}
    >
      {onView && (
        <button
          className={iconButtonClassName}
          title="View user"
          onClick={onView}
        >
          <Eye size={14} />
        </button>
      )}

      {onEdit && (
        <button
          className={iconButtonClassName}
          title="Edit user"
          onClick={onEdit}
        >
          <Edit size={14} />
        </button>
      )}

      {onDelete && (
        <button
          className={iconButtonClassName}
          title="Delete user"
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

export default ActionPopOver;
