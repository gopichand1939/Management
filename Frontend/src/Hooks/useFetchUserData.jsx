import { useSelector } from "react-redux";

const useFetchUserData = () => {
  const { users, loading, error, token } = useSelector((state) => state.user);

  return {
    users,
    loading,
    error,
    token,
  };
};

export default useFetchUserData;
