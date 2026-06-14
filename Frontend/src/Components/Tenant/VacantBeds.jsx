import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { BedDouble, Building2, Search, Sparkles, Users, Warehouse } from "lucide-react";

import Error from "../Common/Error";
import PageLoader from "../Common/PageLoader";
import TenantShell from "./TenantShell";
import RoomCard from "../Institution/components/RoomCard";
import { TENANT_VACANT_BEDS, INSTITUTION_LIST, PG_ADMIN_MY_INSTITUTION } from "../../Utils/Constants";
import {
  buildMetricCards,
  getAuthHeaders,
  groupVacantBeds,
} from "./tenantHelpers";

const VacantBeds = () => {
  const { authUser } = useSelector((state) => state.user);
  const isPgAdmin = authUser?.role === "pg_admin";

  const [beds, setBeds] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSetupData = async () => {
      setLoading(true);
      setError("");

      try {
        const [bedsResponse, institutionsResponse] = await Promise.all([
          fetch(TENANT_VACANT_BEDS, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({}),
          }),
          fetch(isPgAdmin ? PG_ADMIN_MY_INSTITUTION : INSTITUTION_LIST, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({}),
          }),
        ]);

        const bedsData = await bedsResponse.json();
        const institutionsData = await institutionsResponse.json();

        if (!bedsResponse.ok) {
          throw new Error(bedsData.message || "Bed layout fetch failed");
        }

        if (!institutionsResponse.ok) {
          throw new Error(institutionsData.message || "Institutions fetch failed");
        }

        const bedList = bedsData.beds || [];
        const institutionList = institutionsData.institutions || [];

        setBeds(bedList);
        setInstitutions(institutionList);

        if (institutionList.length > 0) {
          setSelectedInstitutionId(String(institutionList[0].id));
        }
      } catch (apiError) {
        setError(apiError.message || "Bed layout setup failed");
      } finally {
        setLoading(false);
      }
    };

    fetchSetupData();
  }, [isPgAdmin]);

  const filteredBeds = useMemo(() => {
    const term = searchText.toLowerCase();

    return beds.filter((bed) => {
      return (
        bed.institution_name?.toLowerCase().includes(term) ||
        bed.floor_name?.toLowerCase().includes(term) ||
        bed.room_number?.toLowerCase().includes(term) ||
        bed.bed_number?.toLowerCase().includes(term)
      );
    });
  }, [beds, searchText]);

  const filteredHierarchy = useMemo(() => {
    return groupVacantBeds(filteredBeds, institutions);
  }, [filteredBeds, institutions]);

  const selectedHierarchy = useMemo(() => {
    if (!selectedInstitutionId) {
      return null;
    }

    return (
      filteredHierarchy.find((institution) => Number(institution.id) === Number(selectedInstitutionId)) ||
      null
    );
  }, [filteredHierarchy, selectedInstitutionId]);

  const metricCards = buildMetricCards([
    {
      label: "Vacant Beds",
      value: filteredBeds.filter((bed) => bed.status === "vacant").length,
      icon: BedDouble,
      color: "from-emerald-500 to-teal-500 bg-emerald-50 border-emerald-100",
    },
    {
      label: "Locked Beds",
      value: filteredBeds.filter((bed) => bed.status !== "vacant").length,
      icon: Sparkles,
      color: "from-rose-500 to-red-500 bg-rose-50 border-rose-100",
    },
    {
      label: "Total Buildings",
      value: new Set(filteredBeds.map((bed) => bed.institution_name)).size,
      icon: Building2,
      color: "from-sky-500 to-blue-500 bg-sky-50 border-sky-100",
    },
    {
      label: "Shared Rooms",
      value: new Set(filteredBeds.map((bed) => `${bed.institution_id}-${bed.floor_id}-${bed.room_id}`)).size,
      icon: Users,
      color: "from-violet-500 to-indigo-500 bg-violet-50 border-violet-100",
    },
  ]);

  return (
    <TenantShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-fadeIn">
        <div className="text-left border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Bed Availability Layout
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 font-bold">
            Full room structure with vacant beds in green and occupied or reserved beds locked in red.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metricCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.id}
                className="rounded-3xl border border-slate-150 bg-white p-4 text-left shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {card.label}
                    </span>
                    <span className="mt-2 block text-xl font-black leading-none tracking-tight text-slate-800">
                      {card.value}
                    </span>
                  </div>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${card.color.split(" ")[2]}`}>
                    <Icon size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 rounded-[32px] border border-slate-150 bg-white p-3 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.04)] md:flex-row">
          <div className="scrollbar-thin flex w-full gap-1 overflow-x-auto pb-1 md:w-auto md:pb-0">
            {institutions.map((institution) => {
              const isActive = String(institution.id) === selectedInstitutionId;

              return (
                <button
                  key={institution.id}
                  type="button"
                  onClick={() => setSelectedInstitutionId(String(institution.id))}
                  className={`cursor-pointer whitespace-nowrap rounded-xl px-4 py-2 text-[11px] font-black transition-all ${
                    isActive
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {institution.institution_name}
                </button>
              );
            })}
          </div>

          <div className="flex w-full shrink-0 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-slate-400 transition-all duration-200 focus-within:border-orange-500/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:shadow-sm md:max-w-xs">
            <Search size={14} />
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search floor, room, bed..."
              className="h-9 w-full border-0 bg-transparent text-xs font-semibold text-slate-850 outline-none placeholder:text-slate-455"
            />
          </div>
        </div>

        <Error message={error} />

        {loading ? (
          <div className="flex items-center justify-center rounded-[32px] border border-slate-100 bg-white p-16 shadow-sm">
            <PageLoader />
          </div>
        ) : !selectedHierarchy || selectedHierarchy.floors.length === 0 ? (
          <div className="rounded-[32px] border border-slate-150 bg-white p-20 text-center shadow-sm">
            <BedDouble size={36} className="mx-auto text-slate-350" />
            <h3 className="mt-3.5 text-base font-black text-slate-700">No Bed Layout Found</h3>
            <p className="mx-auto mt-1 max-w-xs text-xs font-bold text-slate-400">
              No bed structure matches the current building and search filters.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 text-left">
            {selectedHierarchy.floors.map((floor) => {
              const vacantCount = floor.rooms.reduce((sum, room) => {
                return sum + room.beds.filter((bed) => bed.status === "vacant").length;
              }, 0);
              const lockedCount = floor.rooms.reduce((sum, room) => {
                return sum + room.beds.filter((bed) => bed.status !== "vacant").length;
              }, 0);

              return (
                <section
                  key={floor.id}
                  className="flex flex-col gap-5 rounded-[36px] border border-slate-150 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-orange-100/50 bg-orange-50 text-orange-500">
                        <Warehouse size={16} />
                      </span>
                      <div>
                        <h3 className="text-sm font-black leading-tight text-slate-850">
                          {floor.floor_name}
                        </h3>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Level {floor.floor_number} • Category: {floor.gender_type || "Mixed"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500">
                      {floor.rooms.length} Rooms
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                      Vacant {vacantCount}
                    </span>
                    <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600">
                      Locked {lockedCount}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {floor.rooms.map((room) => {
                      const normalizedRoom = {
                        ...room,
                        floor_name: floor.floor_name,
                        beds: (room.beds || []).map((bed) => ({
                          ...bed,
                          status: bed.status === "vacant" ? "vacant" : "occupied",
                        })),
                      };

                      return (
                        <RoomCard
                          key={room.id}
                          room={normalizedRoom}
                          floorName={floor.floor_name}
                          isSelected={false}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </TenantShell>
  );
};

export default VacantBeds;
