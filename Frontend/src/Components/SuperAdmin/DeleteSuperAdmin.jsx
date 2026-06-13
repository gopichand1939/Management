import { Trash2 } from "lucide-react";

const DeleteSuperAdmin = ({ onDelete }) => {
  return (
    <button className="icon-button" title="Delete super admin" onClick={onDelete}>
      <Trash2 size={16} />
    </button>
  );
};

export default DeleteSuperAdmin;
