import { useState } from "react";
import { useSelector } from "react-redux";

const useLogin = () => {
  const { loading, error } = useSelector((state) => state.user);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  return {
    formData,
    loading,
    error,
    handleChange,
  };
};

export default useLogin;
