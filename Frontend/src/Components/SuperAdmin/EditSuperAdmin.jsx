import useEditUser from "../../Hooks/useEditUser";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import SuperAdminForm from "./SuperAdminForm";

const EditSuperAdmin = () => {
  const {
    formData,
    handleChange,
    handleSubmit,
  } = useEditUser();

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-[440px] mx-auto w-full flex flex-col gap-6 md:gap-8">
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Edit Super Admin
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Update super admin profile and permission role
                </p>
              </div>

              <SuperAdminForm
                formData={formData}
                buttonText="Update Super Admin"
                onChange={handleChange}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditSuperAdmin;
