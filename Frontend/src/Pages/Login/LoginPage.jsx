import Login from "../../Components/Auth/Login";

const LoginPage = () => {
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
      <Login />
    </main>
  );
};

export default LoginPage;
