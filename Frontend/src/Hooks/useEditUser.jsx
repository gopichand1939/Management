import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { editUser } from "../Redux/User/UserSlice";

const useEditUser = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { users } = useSelector((state) => state.user);

  const currentUser = useMemo(() => {
    return users.find((user) => String(user.id) === id);
  }, [id, users]);

  const [formData, setFormData] = useState(currentUser || {});

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    dispatch(editUser(formData));
    navigate("/super-admins");
  };

  return {
    formData,
    handleChange,
    handleSubmit,
  };
};

export default useEditUser;
