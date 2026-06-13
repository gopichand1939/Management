import { Lock, Mail, Phone, UserPlus, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import Button from "../Common/Button";
import Error from "../Common/Error";
import InputField from "../Common/InputField";
import useRegister from "../../Hooks/useRegister";
import { USER_REGISTER } from "../../Utils/Constants";
import {
  setAuthUser,
  setUserError,
  setUserLoading,
} from "../../Redux/User/UserSlice";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    formData,
    loading,
    error,
    handleChange,
  } = useRegister();

  const handleSubmit = async (event) => {
    event.preventDefault();

    dispatch(setUserLoading(true));
    dispatch(setUserError(""));

    try {
      const response = await fetch(USER_REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        dispatch(setUserError(data.message || "Registration failed"));
        return;
      }

      dispatch(setAuthUser(data));
      navigate("/dashboard");
    } catch (errorData) {
      dispatch(setUserError(errorData.message));
    } finally {
      dispatch(setUserLoading(false));
    }
  };

  return (
    <form
      className={`
        bg-white
        border
        border-slate-100
        rounded-2xl
        w-full
        max-w-[440px]
        p-8
        shadow-md
        animate-[floatIn_480ms_ease]
      `}
      onSubmit={handleSubmit}
    >
      <h1
        className={`
          mb-2
          mt-0
          text-2xl
          font-extrabold
          tracking-tight
          text-slate-900
        `}
      >
        Create Admin
      </h1>
      <p
        className={`
          mb-7
          mt-0
          text-xs
          leading-normal
          text-slate-400
        `}
      >
        Register a secure enterprise account.
      </p>

      <div
        className={`
          grid
          gap-4
        `}
      >
        <InputField
          label="Name"
          name="name"
          value={formData.name}
          placeholder="Full name"
          icon={UserRound}
          onChange={handleChange}
        />

        <InputField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          placeholder="admin@company.com"
          icon={Mail}
          onChange={handleChange}
        />

        <InputField
          label="Phone"
          name="phone"
          value={formData.phone}
          placeholder="Phone number"
          icon={Phone}
          onChange={handleChange}
        />

        <InputField
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          placeholder="Create password"
          icon={Lock}
          onChange={handleChange}
        />

        <Error message={error} />

        <Button icon={UserPlus} type="submit" disabled={loading}>
          {loading ? "Creating" : "Register"}
        </Button>

        <Link
          to="/login"
          className={`
            text-sm
            text-blue-400
            hover:text-blue-300
            transition-colors
            duration-200
            text-center
            mt-2
            block
          `}
        >
          Already have an account?
        </Link>
      </div>
    </form>
  );
};

export default Register;
