import { Users, Shield } from "lucide-react";
import Header from "../../Components/Layout/Header";
import Navbar from "../../Components/Layout/Navbar";
import Sidebar from "../../Components/Layout/Sidebar";
import AuthUser from "../../Components/User/AuthUser";
import useFetchUserData from "../../Hooks/useFetchUserData";

const Dashboard = () => {
  const { users } = useFetchUserData();

  return (
    <div
      className={`
        grid
        min-h-screen
        grid-cols-1
        lg:grid-cols-[270px_minmax(0,1fr)]
        bg-slate-50
      `}
    >
      <Sidebar />

      <div className="flex flex-col min-h-screen overflow-x-hidden">
        <Navbar />

        {/* MainContent */}
        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          {/* OutletWrapper */}
          <div className="flex-1 w-full pt-12 lg:pt-16 pb-16 px-6 md:px-8">
            {/* PageContainer */}
            <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 md:gap-8">
          <Header
            title="Dashboard"
            subtitle="Secure overview of users and admin activity."
          />

          <section
            className={`
              grid
              grid-cols-1
              gap-5
              xl:grid-cols-3
            `}
          >
            {/* Total Users */}
            <div
              className={`
                bg-white
                border
                border-slate-100
                rounded-2xl
                p-5
                shadow-sm
                flex
                items-center
                gap-4
                hover:shadow-md
                hover:-translate-y-0.5
                transition-all
                duration-200
              `}
            >
              <div
                className={`
                  w-12
                  h-12
                  rounded-xl
                  bg-red-50
                  flex
                  items-center
                  justify-center
                  text-red-500
                `}
              >
                <Users size={20} />
              </div>
              <div className="flex-1 text-left">
                <span
                  className={`
                    text-[10px]
                    font-extrabold
                    text-slate-400
                    uppercase
                    tracking-wider
                  `}
                >
                  Total Users
                </span>
                <strong
                  className={`
                    block
                    text-2xl
                    font-black
                    text-slate-800
                    mt-0.5
                  `}
                >
                  {users.length}
                </strong>
                <span
                  className={`
                    text-[10px]
                    text-emerald-500
                    font-bold
                    mt-0.5
                    block
                  `}
                >
                  +12 this month
                </span>
              </div>
            </div>

            {/* Active Roles */}
            <div
              className={`
                bg-white
                border
                border-slate-100
                rounded-2xl
                p-5
                shadow-sm
                flex
                items-center
                gap-4
                hover:shadow-md
                hover:-translate-y-0.5
                transition-all
                duration-200
              `}
            >
              <div
                className={`
                  w-12
                  h-12
                  rounded-xl
                  bg-emerald-50
                  flex
                  items-center
                  justify-center
                  text-emerald-500
                `}
              >
                <Shield size={20} className="fill-emerald-500/10" />
              </div>
              <div className="flex-1 text-left">
                <span
                  className={`
                    text-[10px]
                    font-extrabold
                    text-slate-400
                    uppercase
                    tracking-wider
                  `}
                >
                  Active Roles
                </span>
                <strong
                  className={`
                    block
                    text-2xl
                    font-black
                    text-slate-800
                    mt-0.5
                  `}
                >
                  1
                </strong>
                <span
                  className={`
                    text-[10px]
                    text-emerald-500
                    font-bold
                    mt-0.5
                    block
                  `}
                >
                  100% of total
                </span>
              </div>
            </div>

            {/* Auth User Profile Card */}
            <AuthUser />
          </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
