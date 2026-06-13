import { Trash2 } from "lucide-react";

const DeleteUser = ({ onDelete }) => {
  return (
    <button className="icon-button" title="Delete user" onClick={onDelete}>
      <Trash2 size={16} />
    </button>
  );
};

export default DeleteUser;
