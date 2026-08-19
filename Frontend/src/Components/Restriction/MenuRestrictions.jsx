import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Shield,
  Search,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  User,
  Building
} from "lucide-react";
import {
  TOKEN_KEY,
  GET_RESTRICTION_ADMINS,
  GET_RESTRICTION_RULES,
  GET_RESTRICTION_MENUS,
  GET_INSTITUTION_LIST
} from "../../Utils/Constants";
import Sidebar from "../Layout/Sidebar";
import Navbar from "../Layout/Navbar";

const MenuRestrictions = () => {
  const token = useSelector((state) => state.user.token) || localStorage.getItem(TOKEN_KEY);

  const [menuTree, setMenuTree] = useState([]);
  const [menuTreeLoading, setMenuTreeLoading] = useState(true);

  const [admins, setAdmins] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("all");
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [expandedParents, setExpandedParents] = useState({});

  const [menuVisibility, setMenuVisibility] = useState({});
  const [actionToggles, setActionToggles] = useState({});
  const [message, setMessage] = useState(null);

  // ─── Fetch dynamic menu tree from backend ───────────────────────────────────
  const fetchMenuTree = async () => {
    try {
      setMenuTreeLoading(true);
      const res = await fetch(GET_RESTRICTION_MENUS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        const tree = json.data || [];
        setMenuTree(tree);
        // All parents start collapsed by default
        setExpandedParents({});
      }
    } catch (err) {
      console.error("Failed to load menu tree:", err);
    } finally {
      setMenuTreeLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const response = await fetch(GET_INSTITUTION_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (response.ok) {
        setInstitutions(data.institutions || data.data || []);
      }
    } catch (err) {
      console.error("Failed to load institutions:", err);
    }
  };

  const fetchAdmins = async (instId = selectedInstitutionId) => {
    try {
      setLoading(true);
      const queryParam = instId && instId !== "all" ? `?institution_id=${instId}` : "";
      const res = await fetch(`${GET_RESTRICTION_ADMINS}${queryParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setAdmins(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuTree();
    fetchInstitutions();
  }, []);

  useEffect(() => {
    fetchAdmins(selectedInstitutionId);
  }, [selectedInstitutionId]);

  // ─── Build default visibility/actions from the dynamic tree ─────────────────
  const buildDefaults = (tree) => {
    const vis = {};
    const acts = {};
    tree.forEach(parent => {
      vis[parent.menu_id] = true;
      (parent.children || []).forEach(child => {
        vis[child.menu_id] = true;
        (child.actions || []).forEach(action => {
          acts[`${child.menu_id}-${action.action_id}`] = true;
        });
      });
    });
    return { vis, acts };
  };

  const fetchRules = async (adminId) => {
    try {
      setRulesLoading(true);
      const res = await fetch(`${GET_RESTRICTION_RULES}/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        const rules = json.data || [];

        // Start with all enabled defaults based on dynamic tree
        const { vis, acts } = buildDefaults(menuTree);

        // Apply disabled restrictions from DB
        rules.forEach(rule => {
          const mId = rule.menu_id;
          const aId = rule.action_id;
          const allowed = rule.is_allowed;

          if (allowed === false) {
            if (aId === null) {
              vis[mId] = false;
            } else {
              acts[`${mId}-${aId}`] = false;
              if (aId === 3) {
                vis[mId] = false;
              }
            }
          }
        });

        setMenuVisibility(vis);
        setActionToggles(acts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRulesLoading(false);
    }
  };

  const handleSelectAdmin = (admin) => {
    setSelectedAdmin(admin);
    fetchRules(admin.id);
    setMessage(null);
  };

  const toggleParent = (id) => {
    setMenuVisibility(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleChild = (id) => {
    setMenuVisibility(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAction = (childId, actionId) => {
    setActionToggles(prev => ({
      ...prev,
      [`${childId}-${actionId}`]: !prev[`${childId}-${actionId}`]
    }));
  };

  const toggleExpand = (id) => {
    setExpandedParents(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSave = async () => {
    if (!selectedAdmin) return;

    try {
      const payload = [];

      menuTree.forEach(parent => {
        // Skip synthetic/hardcoded menus that don't exist in the DB (string IDs)
        if (typeof parent.menu_id === "string") return;

        // Parent hidden override
        if (menuVisibility[parent.menu_id] === false) {
          payload.push({
            menu_id: parent.menu_id,
            action_id: null,
            is_allowed: false
          });
          // Also hide children
          (parent.children || []).forEach(child => {
            if (typeof child.menu_id === "string") return;
            payload.push({
              menu_id: child.menu_id,
              action_id: null,
              is_allowed: false
            });
          });
          return;
        }

        // Children processing
        (parent.children || []).forEach(child => {
          // Skip synthetic children
          if (typeof child.menu_id === "string") return;

          if (menuVisibility[child.menu_id] === false) {
            payload.push({
              menu_id: child.menu_id,
              action_id: null,
              is_allowed: false
            });
            payload.push({
              menu_id: child.menu_id,
              action_id: 3, // View
              is_allowed: false
            });
          } else {
            // Check each action toggle — push only disabled ones
            (child.actions || []).forEach(action => {
              const key = `${child.menu_id}-${action.action_id}`;
              if (actionToggles[key] === false) {
                payload.push({
                  menu_id: child.menu_id,
                  action_id: action.action_id,
                  is_allowed: false
                });
              }
            });
          }
        });
      });

      const res = await fetch(`${GET_RESTRICTION_RULES}/${selectedAdmin.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rules: payload })
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Restrictions updated successfully!" });
      } else {
        setMessage({ type: "error", text: json.message || "Failed to update permissions" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Connection error" });
    }
  };

  const filteredAdmins = admins.filter(admin => {
    const term = search.toLowerCase();
    return (
      admin.name?.toLowerCase().includes(term) ||
      admin.email?.toLowerCase().includes(term) ||
      admin.institution?.toLowerCase().includes(term)
    );
  });

  // Action label map for readable display
  const ACTION_LABELS = {
    1: "Add",
    2: "Edit",
    3: "View",
    4: "Delete",
    5: "List",
    6: "Approve",
    7: "Reject"
  };

  // Actions to show as checkboxes (exclude View=3 and List=5; those are covered by the visibility toggle)
  const INLINE_ACTION_IDS = [1, 2, 4, 6, 7];

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Sidebar />
      <div className="flex h-screen min-h-0 flex-col overflow-y-auto overflow-x-hidden">
        <Navbar />
        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8">
            <div className="max-w-6xl mx-auto w-full flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Menu Restrictions</h2>
                  <p className="text-xs text-slate-500 mt-1">Configure sidebar menu visibility and action toggles for Admins.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Left Side Pane: PG Admins List */}
                <div className="md:col-span-4 bg-white rounded-2xl border border-slate-150 p-4 shadow-sm h-[calc(100vh-210px)] min-h-[480px] flex flex-col">
                  <div className="flex flex-col gap-2 mb-4">
                    <select
                      value={selectedInstitutionId}
                      onChange={(e) => setSelectedInstitutionId(e.target.value)}
                      className="w-full bg-white rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-400"
                      aria-label="Filter by Institution"
                    >
                      <option value="all">All Institutions</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.institution_name || inst.name}
                        </option>
                      ))}
                    </select>

                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search Admin or Institution..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-50 rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs font-semibold placeholder-slate-400 focus:bg-white focus:border-slate-400 outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {loading ? (
                      <div className="text-center py-8 text-xs text-slate-400 font-bold uppercase tracking-wider">Loading Admins...</div>
                    ) : filteredAdmins.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 font-bold">No Admins Found</div>
                    ) : (
                      filteredAdmins.map(admin => {
                        const isActive = selectedAdmin?.id === admin.id;
                        return (
                          <button
                            key={admin.id}
                            onClick={() => handleSelectAdmin(admin)}
                            className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${isActive
                                ? "border-orange-500 bg-orange-50/50 shadow-sm"
                                : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                          >
                            <div className={`p-2 rounded-lg ${isActive ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                              <User size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-xs font-bold text-slate-900 truncate">{admin.name}</div>
                                <span className={`text-[9px] px-1 py-0.5 rounded font-black uppercase ${
                                  admin.role === "super_admin" 
                                    ? "bg-purple-100 text-purple-700" 
                                    : "bg-orange-100 text-orange-700"
                                }`}>
                                  {admin.role === "super_admin" ? "Super" : "PG"}
                                </span>
                              </div>
                              <div className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{admin.email}</div>
                              {admin.institution && (
                                <div className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                                  <Building size={10} />
                                  <span className="truncate">{admin.institution}</span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Side Pane: Restrictions Manager */}
                <div className="md:col-span-8 bg-white rounded-2xl border border-slate-150 p-6 shadow-sm h-[calc(100vh-210px)] min-h-[480px] flex flex-col">
                  {!selectedAdmin ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <Shield size={48} className="text-slate-300 mb-3" />
                      <div className="text-sm font-bold text-slate-900">Select an Admin</div>
                      <div className="text-xs text-slate-450 mt-1">Choose an Admin from the left list to configure their restrictions.</div>
                    </div>
                  ) : (
                    <>
                      {/* Header Info */}
                      <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">{selectedAdmin.name}</h3>
                          <div className="text-[11px] font-bold text-slate-400">{selectedAdmin.email}</div>
                        </div>
                        <button
                          onClick={handleSave}
                          className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition"
                        >
                          Save Restrictions
                        </button>
                      </div>

                      {message && (
                        <div className={`p-3 rounded-xl mb-4 flex items-center gap-2 text-xs font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                          }`}>
                          {message.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                          <span>{message.text}</span>
                        </div>
                      )}

                      {/* Collapsible Tree */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                        {rulesLoading || menuTreeLoading ? (
                          <div className="text-center py-12 text-xs text-slate-400 font-bold uppercase tracking-wider">Loading active configuration...</div>
                        ) : menuTree.length === 0 ? (
                          <div className="text-center py-12 text-xs text-slate-400 font-bold">No menus found in database.</div>
                        ) : (
                          menuTree.map(parent => {
                            const isParentExpanded = !!expandedParents[parent.menu_id];
                            const isParentVisible = menuVisibility[parent.menu_id] !== false;

                            return (
                              <div key={parent.menu_id} className="border border-slate-150 rounded-xl overflow-hidden bg-slate-50/50">
                                {/* Parent Header Row */}
                                <div className="flex items-center justify-between p-3.5 bg-white border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleExpand(parent.menu_id)}
                                      className="text-slate-400 hover:text-slate-600 p-0.5"
                                    >
                                      {isParentExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                    <span className="text-xs font-black text-slate-800">{parent.menu_name}</span>
                                  </div>

                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isParentVisible}
                                      onChange={() => toggleParent(parent.menu_id)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                                    <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      {isParentVisible ? "Show Module" : "Hide Module"}
                                    </span>
                                  </label>
                                </div>

                                {/* Child List */}
                                {isParentExpanded && (
                                  <div className="p-3 space-y-2">
                                    {!isParentVisible ? (
                                      <div className="text-center py-4 text-[11px] text-slate-400 font-bold italic">
                                        Entire parent module is hidden. All child sub-menus will be blocked.
                                      </div>
                                    ) : (parent.children || []).length === 0 ? (
                                      <div className="text-center py-4 text-[11px] text-slate-400 font-bold italic">
                                        No sub-menus found.
                                      </div>
                                    ) : (
                                      (parent.children || []).map(child => {
                                        const isChildVisible = menuVisibility[child.menu_id] !== false;

                                        // Only show action checkboxes for INLINE_ACTION_IDS that actually exist on this child
                                        const inlineActions = (child.actions || []).filter(a =>
                                          INLINE_ACTION_IDS.includes(a.action_id)
                                        );

                                        return (
                                          <div key={child.menu_id} className="bg-white border border-slate-100 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                            <div className="flex items-center justify-between md:justify-start gap-4">
                                              <span className="text-xs font-bold text-slate-700">{child.menu_name}</span>

                                              <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={isChildVisible}
                                                  onChange={() => toggleChild(child.menu_id)}
                                                  className="sr-only peer"
                                                />
                                                <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
                                                <span className="ml-1.5 text-[9px] font-bold text-slate-400 uppercase">
                                                  {isChildVisible ? "Visible" : "Hidden"}
                                                </span>
                                              </label>
                                            </div>

                                            {/* Dynamic Action Checkboxes */}
                                            {isChildVisible && inlineActions.length > 0 && (
                                              <div className="flex items-center gap-4 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0 flex-wrap">
                                                {inlineActions.map(action => (
                                                  <label key={action.action_id} className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      checked={actionToggles[`${child.menu_id}-${action.action_id}`] !== false}
                                                      onChange={() => toggleAction(child.menu_id, action.action_id)}
                                                      className="rounded text-orange-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer border-slate-300"
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                      {ACTION_LABELS[action.action_id] || action.action_name}
                                                    </span>
                                                  </label>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MenuRestrictions;
