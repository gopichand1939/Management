import { useState } from "react";
import { useSelector } from "react-redux";

const useRegister = () => {
  const { loading, error } = useSelector((state) => state.user);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
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

export default useRegister;
