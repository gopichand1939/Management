import { useDispatch } from "react-redux";

import { deleteUser } from "../Redux/User/UserSlice";

const useDeleteUser = () => {
  const dispatch = useDispatch();

  const handleDelete = (id) => {
    dispatch(deleteUser(id));
  };

  return {
    handleDelete,
  };
};

export default useDeleteUser;
