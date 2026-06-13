import useAddUser from "../../Hooks/useAddUser";
import UserForm from "./UserForm";

const AddUser = () => {
  const {
    formData,
    handleChange,
    handleSubmit,
  } = useAddUser();

  return (
    <UserForm
      formData={formData}
      buttonText="Add User"
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
};

export default AddUser;
