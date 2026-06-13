import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Plus, UserCog } from "lucide-react";

import ActionPopOver from "../Common/ActionPopOver";
import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import SearchBar from "../Common/SearchBar";
import StatusBadge from "../Common/StatusBadge";
import Table from "../Common/Table";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";
import {
  PG_ADMIN_DELETE,
  PG_ADMIN_LIST,
  PG_ADMIN_MY_LIST,
  TOKEN_KEY,
} from "../../Utils/Constants";
import {
  hasMenuAction,
  MENU_ACTIONS,
} from "../../Utils/MenuPermissions";

const columns = [
  {
    key: "pg_admin_name",
    label: "PG Admin",
  },
  {
    key: "institution_name",
    label: "Institution",
  },
  {
    key: "email",
    label: "Email",
  },
  {
    key: "phone",
    label: "Phone",
  },
  {
    key: "status",
    label: "Status",
  },
];

const PGAdmin = () => {
  const navigate = useNavigate();
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";
  const canCreate =
    !isPgAdmin &&
    hasMenuAction(authUser, "/pg-admins", MENU_ACTIONS.CREATE);
  const canEdit = hasMenuAction(authUser, "/pg-admins", MENU_ACTIONS.EDIT);
  const canView = hasMenuAction(authUser, "/pg-admins", MENU_ACTIONS.VIEW);
  const canDelete = hasMenuAction(authUser, "/pg-admins", MENU_ACTIONS.DELETE);

  const [pgAdmins, setPgAdmins] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getPgAdmins = async () => {
      setError("");
      setLoading(true);

      try {
        const response = await fetch(
          isPgAdmin ? PG_ADMIN_MY_LIST : PG_ADMIN_LIST,
          {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "PG admin list failed");
          return;
        }

        setPgAdmins(data.pgAdmins || []);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    getPgAdmins();
  }, [isPgAdmin]);

  const filteredPgAdmins = useMemo(() => {
    return pgAdmins.filter((pgAdmin) => {
      const term = searchText.toLowerCase();

        return (
        pgAdmin.pg_admin_name?.toLowerCase().includes(term) ||
        pgAdmin.institution_name?.toLowerCase().includes(term) ||
        pgAdmin.email?.toLowerCase().includes(term)
      );
    });
  }, [pgAdmins, searchText]);

  const tableData = filteredPgAdmins.map((pgAdmin) => {
    return {
      ...pgAdmin,
      pg_admin_name: (
        <div className="flex items-center gap-3 text-left">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-100 bg-orange-50 text-orange-500">
            <UserCog size={15} />
          </span>
          <span className="font-bold text-slate-800">
            {pgAdmin.pg_admin_name || pgAdmin.name}
          </span>
        </div>
      ),
      institution_name: pgAdmin.institution_name || "-",
      status: <StatusBadge label={pgAdmin.status} />,
    };
  });

  const handleDelete = async (id) => {
    setError("");

    try {
      const response = await fetch(PG_ADMIN_DELETE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "PG admin delete failed");
        return;
      }

      const updatedList = pgAdmins.filter((pgAdmin) => {
        return pgAdmin.id !== id;
      });

      setPgAdmins(updatedList);
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  const renderActions = (pgAdmin) => {
    return (
      <ActionPopOver
        onView={canView ? () => navigate(`/pg-admins/view/${pgAdmin.id}`) : null}
        onEdit={canEdit ? () => navigate(`/pg-admins/edit/${pgAdmin.id}`) : null}
        onDelete={canDelete ? () => handleDelete(pgAdmin.id) : null}
      />
    );
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-6xl mx-auto w-full flex flex-col gap-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="text-left">
                  <h1 className="text-xl font-black text-slate-800 tracking-tight">
                    {isPgAdmin ? "Institution PG Admins" : "PG Admin Management"}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    {isPgAdmin
                      ? "View PG admins assigned to your institution"
                      : "Manage institution admin assignments"}
                  </p>
                </div>

                {canCreate && (
                  <button
                    className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition-all hover:bg-orange-600"
                    type="button"
                    onClick={() => navigate("/pg-admins/add")}
                  >
                    <Plus size={16} />
                    <span>Add PG Admin</span>
                  </button>
                )}
              </div>

              <div className="flex justify-start">
                <SearchBar
                  value={searchText}
                  placeholder={isPgAdmin ? "Search your details..." : "Search PG admin..."}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </div>

              <Error message={error} />

              {loading ? (
                <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm flex justify-center">
                  <PageLoader />
                </div>
              ) : (
                <Table
                  columns={columns}
                  data={tableData}
                  renderActions={canView || canEdit || canDelete ? renderActions : null}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PGAdmin;
