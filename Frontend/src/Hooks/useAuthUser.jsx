import { useSelector } from "react-redux";

const useAuthUser = () => {
  const { authUser, token } = useSelector((state) => state.user);

  return {
    authUser,
    token,
  };
};

export default useAuthUser;
