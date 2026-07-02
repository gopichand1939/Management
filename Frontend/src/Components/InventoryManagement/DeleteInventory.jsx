import { Trash2 } from "lucide-react";

const DeleteInventory = ({ onDelete }) => {
  return (
    <button className="icon-button" title="Delete inventory" onClick={onDelete}>
      <Trash2 size={16} />
    </button>
  );
};

export default DeleteInventory;
