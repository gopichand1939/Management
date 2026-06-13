import { Mail } from "lucide-react";

import Button from "../Common/Button";
import InputField from "../Common/InputField";

const ForgotPassword = () => {
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
        Reset Password
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
        Enter your email to request support.
      </p>

      <div
        className={`
          grid
          gap-4
        `}
      >
        <InputField
          label="Email"
          name="email"
          type="email"
          placeholder="admin@company.com"
          icon={Mail}
          onChange={() => {}}
        />

        <Button type="button">Send Request</Button>
      </div>
    </form>
  );
};

export default ForgotPassword;
