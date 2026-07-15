import { Edit, Eye, Trash2 } from "lucide-react";

const ActionPopOver = ({ onView, onEdit, onDelete, actions }) => {
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

  if (actions && Array.isArray(actions)) {
    return (
      <div className="flex gap-1.5">
        {actions.map((act, index) => {
          if (!act) return null;
          const Icon = act.icon;
          return (
            <button
              key={index}
              className={`${iconButtonClassName} ${act.className || ""}`}
              title={act.label}
              onClick={act.onClick}
            >
              {Icon ? <Icon size={14} /> : null}
            </button>
          );
        })}
      </div>
    );
  }

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
