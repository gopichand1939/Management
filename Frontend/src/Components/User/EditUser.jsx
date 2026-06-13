import useEditUser from "../../Hooks/useEditUser";
import UserForm from "./UserForm";

const EditUser = () => {
  const {
    formData,
    handleChange,
    handleSubmit,
  } = useEditUser();

  return (
    <UserForm
      formData={formData}
      buttonText="Update User"
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
};

export default EditUser;
