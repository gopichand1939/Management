import Register from "../../Components/Auth/Register";

const RegisterPage = () => {
  return (
    <main
      className={`
        grid
        min-h-screen
        place-items-center
        p-6
        bg-slate-50
      `}
    >
      <Register />
    </main>
  );
};

export default RegisterPage;
