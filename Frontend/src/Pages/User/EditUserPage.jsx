import Navbar from "../../Components/Layout/Navbar";
import Sidebar from "../../Components/Layout/Sidebar";
import EditUser from "../../Components/User/EditUser";

const EditUserPage = () => {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex min-h-screen flex-col overflow-x-hidden">
        <Navbar />

        {/* MainContent */}
        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          {/* OutletWrapper */}
          <div className="flex-1 w-full pt-12 lg:pt-16 pb-16 px-6 md:px-8">
            {/* PageContainer */}
            <div className="max-w-[440px] mx-auto w-full flex flex-col gap-6 md:gap-8">
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Edit User Details</h1>
                <p className="text-sm text-slate-500 mt-1">Update user profile and permission role</p>
              </div>
              <EditUser />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditUserPage;
