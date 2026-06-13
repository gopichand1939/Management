import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Users as UsersIcon,
  UserCheck,
  Shield as ShieldIcon,
  UserX,
} from "lucide-react";

import ActionPopOver from "../Common/ActionPopOver";
import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import StatusBadge from "../Common/StatusBadge";
import Table from "../Common/Table";
import SearchBar from "../Common/SearchBar";

import useDeleteUser from "../../Hooks/useDeleteUser";
import useFetchUserData from "../../Hooks/useFetchUserData";
import {
  REGISTERED_USER_LIST,
  TOKEN_KEY,
} from "../../Utils/Constants";
import {
  setUserError,
  setUserList,
  setUserLoading,
} from "../../Redux/User/UserSlice";

const columns = [
  {
    key: "name",
    label: "Name",
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
    key: "role",
    label: "Role",
  },
];

const User = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { users, loading, error, token } = useFetchUserData();
  const { handleDelete } = useDeleteUser();
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const getRegisteredUsers = async () => {
      dispatch(setUserLoading(true));
      dispatch(setUserError(""));

      try {
        const response = await fetch(REGISTERED_USER_LIST, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const responseText = await response.text();

        if (responseText.startsWith("<")) {
          dispatch(setUserError("Backend API is not returning JSON"));
          return;
        }

        const data = JSON.parse(responseText);

        if (!response.ok) {
          dispatch(setUserError(data.message || "User list failed"));
          return;
        }

        dispatch(setUserList(data.users || []));
      } catch (apiError) {
        dispatch(setUserError(apiError.message));
      } finally {
        dispatch(setUserLoading(false));
      }
    };

    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (token || savedToken) {
      getRegisteredUsers();
    }
  }, [dispatch, token]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const term = searchText.toLowerCase();
      return (
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term)
      );
    });
  }, [searchText, users]);

  // Calculate dynamic stats
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status?.toLowerCase() === "active").length;
  const adminCount = users.filter(
    (u) =>
      u.role?.toLowerCase() === "admin" ||
      u.role?.toLowerCase() === "administrator"
  ).length;
  const inactiveCount = users.filter((u) => u.status?.toLowerCase() === "inactive").length;

  const activePercent = totalCount ? Math.round((activeCount / totalCount) * 100) : 0;
  const adminPercent = totalCount ? Math.round((adminCount / totalCount) * 100) : 0;
  const inactivePercent = totalCount ? Math.round((inactiveCount / totalCount) * 100) : 0;

  const tableData = filteredUsers.map((user) => ({
    ...user,
    name: (
      <div className="flex items-center gap-3 text-left">
        <span className="w-8 h-8 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-100 uppercase">
          {user.name.charAt(0)}
        </span>
        <span className="font-bold text-slate-800">{user.name}</span>
      </div>
    ),
    role: (
      <span className={`
        px-2
        py-0.5
        rounded-md
        text-xs
        font-semibold
        border
        inline-block
        ${
          user.role?.toLowerCase() === "admin" || user.role?.toLowerCase() === "administrator"
            ? "bg-purple-50 text-purple-600 border-purple-100"
            : user.role?.toLowerCase() === "editor"
            ? "bg-blue-50 text-blue-600 border-blue-100"
            : "bg-amber-50 text-amber-600 border-amber-100"
        }
      `}>
        {user.role}
      </span>
    ),
    status: <StatusBadge label={user.status} />,
  }));

  const renderActions = (user) => {
    return (
      <ActionPopOver
        onView={() => navigate(`/users/view/${user.id}`)}
        onEdit={() => navigate(`/users/edit/${user.id}`)}
        onDelete={() => handleDelete(user.id)}
      />
    );
  };

  return (
    <div
      className={`
        flex
        flex-col
        gap-5
      `}
    >
      {/* Page Header */}
      <div
        className={`
          flex
          flex-col
          md:flex-row
          md:items-center
          justify-between
          gap-3
        `}
      >
        <div className="text-left">
          <h1
            className={`
              text-xl
              font-black
              text-slate-800
              tracking-tight
            `}
          >
            User Management
          </h1>
          <p
            className={`
              text-xs
              text-slate-500
              mt-1
            `}
          >
            Manage and monitor all users in your workspace
          </p>
        </div>

        <button
          className={`
            inline-flex
            h-10
            w-fit
            items-center
            justify-center
            gap-2
            rounded-lg
            bg-orange-500
            px-4
            text-sm
            font-bold
            text-white
            shadow-sm
            shadow-orange-500/20
            transition-all
            duration-200
            hover:bg-orange-600
            hover:shadow-md
            hover:shadow-orange-500/25
          `}
          type="button"
          onClick={() => navigate("/users/add")}
        >
          <Plus size={16} />
          <span>Add New User</span>
        </button>
      </div>

      {/* Quick Summary Cards Section */}
      <div
        className={`
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-4
          gap-4
        `}
      >
        {/* Total Users */}
        <div
          className={`
            bg-white
            border
            border-slate-100
            rounded-xl
            p-4
            shadow-sm
            hover:shadow-md
            transition-all
            duration-200
            text-left
            flex
            items-center
            gap-4
          `}
        >
          <div
            className={`
              w-10
              h-10
              rounded-lg
              bg-orange-50
              flex
              items-center
              justify-center
              text-orange-500
            `}
          >
            <UsersIcon size={18} />
          </div>
          <div>
            <span
              className={`
                text-[10px]
                font-extrabold
                text-slate-400
                uppercase
                tracking-wider
                block
              `}
            >
              Total Users
            </span>
            <strong
              className={`
                text-2xl
                font-black
                text-slate-800
                mt-0.5
                block
              `}
            >
              {totalCount}
            </strong>
            <span
              className={`
                text-[10px]
                text-emerald-500
                font-bold
                block
                mt-0.5
              `}
            >
              +12 this month
            </span>
          </div>
        </div>

        {/* Active Users */}
        <div
          className={`
            bg-white
            border
            border-slate-100
            rounded-xl
            p-4
            shadow-sm
            hover:shadow-md
            transition-all
            duration-200
            text-left
            flex
            items-center
            gap-4
          `}
        >
          <div
            className={`
              w-10
              h-10
              rounded-lg
              bg-emerald-50
              flex
              items-center
              justify-center
              text-emerald-500
            `}
          >
            <UserCheck size={18} />
          </div>
          <div>
            <span
              className={`
                text-[10px]
                font-extrabold
                text-slate-400
                uppercase
                tracking-wider
                block
              `}
            >
              Active Users
            </span>
            <strong
              className={`
                text-2xl
                font-black
                text-slate-800
                mt-0.5
                block
              `}
            >
              {activeCount}
            </strong>
            <span
              className={`
                text-[10px]
                text-emerald-500
                font-bold
                block
                mt-0.5
              `}
            >
              {activePercent}% of total
            </span>
          </div>
        </div>

        {/* Administrators */}
        <div
          className={`
            bg-white
            border
            border-slate-100
            rounded-xl
            p-4
            shadow-sm
            hover:shadow-md
            transition-all
            duration-200
            text-left
            flex
            items-center
            gap-4
          `}
        >
          <div
            className={`
              w-10
              h-10
              rounded-lg
              bg-purple-50
              flex
              items-center
              justify-center
              text-purple-600
            `}
          >
            <ShieldIcon size={18} />
          </div>
          <div>
            <span
              className={`
                text-[10px]
                font-extrabold
                text-slate-400
                uppercase
                tracking-wider
                block
              `}
            >
              Administrators
            </span>
            <strong
              className={`
                text-2xl
                font-black
                text-slate-800
                mt-0.5
                block
              `}
            >
              {adminCount}
            </strong>
            <span
              className={`
                text-[10px]
                text-purple-500
                font-bold
                block
                mt-0.5
              `}
            >
              {adminPercent}% of total
            </span>
          </div>
        </div>

        {/* Inactive Users */}
        <div
          className={`
            bg-white
            border
            border-slate-100
            rounded-xl
            p-4
            shadow-sm
            hover:shadow-md
            transition-all
            duration-200
            text-left
            flex
            items-center
            gap-4
          `}
        >
          <div
            className={`
              w-10
              h-10
              rounded-lg
              bg-slate-50
              flex
              items-center
              justify-center
              text-slate-500
            `}
          >
            <UserX size={18} />
          </div>
          <div>
            <span
              className={`
                text-[10px]
                font-extrabold
                text-slate-400
                uppercase
                tracking-wider
                block
              `}
            >
              Inactive Users
            </span>
            <strong
              className={`
                text-2xl
                font-black
                text-slate-800
                mt-0.5
                block
              `}
            >
              {inactiveCount}
            </strong>
            <span
              className={`
                text-[10px]
                text-slate-500
                font-bold
                block
                mt-0.5
              `}
            >
              {inactivePercent}% of total
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar Section */}
      <div
        className={`
          flex
          flex-col
          sm:flex-row
          items-stretch
          sm:items-center
          justify-start
          gap-3
        `}
      >
        <SearchBar
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search by name, email or role..."
        />
      </div>

      {/* Table Section (TableContainer) */}
      <div className="flex flex-col gap-4">
        <Error message={error} />

        {loading ? (
          <div
            className={`
              overflow-hidden
              rounded-xl
              border
              border-slate-100
              bg-white
              shadow-sm
              p-6
              flex
              justify-center
            `}
          >
            <PageLoader />
          </div>
        ) : (
          <Table
            columns={[...columns, { key: "status", label: "Status" }]}
            data={tableData}
            renderActions={renderActions}
          />
        )}
      </div>
    </div>
  );
};

export default User;
