import Navbar from "../../Components/Layout/Navbar";
import Sidebar from "../../Components/Layout/Sidebar";
import User from "../../Components/User/User";

const UserPage = () => {
  return (
    <div
      className={`
        grid
        min-h-screen
        grid-cols-1
        bg-slate-50
        lg:grid-cols-[270px_minmax(0,1fr)]
      `}
    >
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        {/* MainContent */}
        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          {/* OutletWrapper */}
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            {/* PageContainer */}
            <div className="max-w-6xl mx-auto w-full">
              <User />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserPage;
