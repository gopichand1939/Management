import { Mail, Phone, Shield, UserRound } from "lucide-react";

import Button from "../Common/Button";
import InputField from "../Common/InputField";

const UserForm = ({ formData, onChange, onSubmit, buttonText }) => {
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
        shadow-sm
        animate-[floatIn_480ms_ease]
      `}
      onSubmit={onSubmit}
    >
      <div
        className={`
          grid
          gap-4
        `}
      >
        <InputField
          label="Name"
          name="name"
          value={formData.name || ""}
          placeholder="User name"
          icon={UserRound}
          onChange={onChange}
        />

        <InputField
          label="Email"
          name="email"
          type="email"
          value={formData.email || ""}
          placeholder="user@company.com"
          icon={Mail}
          onChange={onChange}
        />

        <InputField
          label="Phone"
          name="phone"
          value={formData.phone || ""}
          placeholder="Phone number"
          icon={Phone}
          onChange={onChange}
        />

        <InputField
          label="Role"
          name="role"
          value={formData.role || ""}
          placeholder="admin"
          icon={Shield}
          onChange={onChange}
        />

        <Button type="submit">{buttonText}</Button>
      </div>
    </form>
  );
};

export default UserForm;
