import { useState } from "react";
import { Coins, Search, Plus, TrendingDown, Calendar, Receipt, Landmark } from "lucide-react";
import Navbar from "../Layout/Navbar";
import Sidebar from "../Layout/Sidebar";

const initialExpenses = [
  { id: 1, title: "Plumbing repair block B", category: "Maintenance", amount: 1200, date: "2026-06-15", status: "Approved" },
  { id: 2, title: "Office tea & snacks", category: "Pantry", amount: 450, date: "2026-06-15", status: "Approved" },
  { id: 3, title: "Broadband internet bill", category: "Utilities", amount: 1899, date: "2026-06-14", status: "Pending" },
  { id: 4, title: "Printer paper packets", category: "Supplies", amount: 650, date: "2026-06-12", status: "Approved" },
  { id: 5, title: "Electrician labor charge", category: "Maintenance", amount: 800, date: "2026-06-10", status: "Rejected" },
];

const DailyExpenses = () => {
  const [searchText, setSearchText] = useState("");

  const filteredExpenses = initialExpenses.filter((expense) => {
    const term = searchText.toLowerCase();
    return (
      expense.title.toLowerCase().includes(term) ||
      expense.category.toLowerCase().includes(term) ||
      expense.status.toLowerCase().includes(term)
    );
  });

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

        <main className="flex flex-1 flex-col bg-slate-50 min-h-0">
          <div className="flex-1 w-full pt-7 lg:pt-8 pb-8 px-6 md:px-8 text-left">
            <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight">
                    Daily Expenses
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Track and manage daily operational expenses
                  </p>
                </div>

                <button
                  className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition-all duration-200 hover:bg-orange-600 hover:shadow-md"
                  type="button"
                >
                  <Plus size={16} />
                  <span>Add Expense</span>
                </button>
              </div>

              {/* Stats Widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                    <Coins size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Today's Expenses
                    </span>
                    <strong className="text-2xl font-black text-slate-800 mt-0.5 block">
                      ₹1,650.00
                    </strong>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <TrendingDown size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      This Month Total
                    </span>
                    <strong className="text-2xl font-black text-slate-800 mt-0.5 block">
                      ₹4,999.00
                    </strong>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <Landmark size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Approved Budget Limit
                    </span>
                    <strong className="text-2xl font-black text-slate-800 mt-0.5 block">
                      ₹50,000.00
                    </strong>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex w-full shrink-0 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 text-slate-400 transition-all duration-200 focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:shadow-sm max-w-xs">
                <Search size={14} />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search expenses..."
                  className="h-9 w-full border-0 bg-transparent text-xs font-semibold text-slate-850 outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Expense Title</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100">
                              <Receipt size={14} />
                            </span>
                            <span className="font-extrabold text-slate-800">{expense.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] border border-slate-200 bg-slate-50 text-slate-600">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-extrabold">₹{expense.amount}</td>
                        <td className="px-6 py-4 text-slate-400 flex items-center gap-1.5 mt-2.5">
                          <Calendar size={12} />
                          <span>{expense.date}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] border ${
                              expense.status === "Approved"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : expense.status === "Pending"
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-rose-50 text-rose-600 border-rose-100"
                            }`}
                          >
                            {expense.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-10 text-center text-slate-400 font-semibold">
                          No expenses found matching the search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DailyExpenses;
