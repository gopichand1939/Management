import { useDispatch } from "react-redux";
import { deleteUser, setUserError } from "../Redux/User/UserSlice";
import { SUPER_ADMIN_DELETE, TOKEN_KEY } from "../Utils/Constants";

const useDeleteUser = () => {
  const dispatch = useDispatch();

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this super admin?")) {
      return;
    }

    dispatch(setUserError(""));

    try {
      const response = await fetch(SUPER_ADMIN_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        dispatch(setUserError(data.message || "Super admin delete failed"));
        return;
      }

      dispatch(deleteUser(id));
    } catch (apiError) {
      dispatch(setUserError(apiError.message));
    }
  };

  return {
    handleDelete,
  };
};

export default useDeleteUser;
