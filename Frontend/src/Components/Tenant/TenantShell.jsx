import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";

const TenantShell = ({ children }) => {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full px-6 pb-8 pt-7 md:px-8 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TenantShell;
