import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { TrendingUp, PieChart as PieIcon, BarChart2 } from "lucide-react";

const InventoryDashboardCharts = ({
  stockStatus = {},
  purchaseTrend = [],
  issueTrend = [],
  categoryStock = []
}) => {

  // 1. Stock Status Donut Chart Data
  const stockStatusData = [
    { name: "In Stock", value: stockStatus.in_stock || 0, color: "#10b981", gradId: "url(#inStockGrad)" },
    { name: "Low Stock", value: stockStatus.low_stock || 0, color: "#f59e0b", gradId: "url(#lowStockGrad)" },
    { name: "Out of Stock", value: stockStatus.out_of_stock || 0, color: "#ef4444", gradId: "url(#outOfStockGrad)" }
  ].filter(item => item.value > 0);

  // 2. Trend Merging logic: Combine Purchase Daily amounts and Issue Daily quantities
  const datesSet = new Set([
    ...purchaseTrend.map((p) => p.date),
    ...issueTrend.map((i) => i.date)
  ]);
  const sortedDates = Array.from(datesSet).sort((a, b) => new Date(a) - new Date(b));

  const trendData = sortedDates.map((d) => {
    const p = purchaseTrend.find((item) => item.date === d);
    const i = issueTrend.find((item) => item.date === d);
    return {
      date: new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      "Purchases Amount (₹)": p ? p.amount : 0,
      "Issues Quantity": i ? i.quantity : 0
    };
  });

  // 3. Category Valuation data
  const barChartData = categoryStock
    .slice(0, 8) // Limit to top 8 categories
    .map((c) => ({
      name: c.category_name,
      "Valuation (₹)": c.stock_value,
      "Quantity": c.total_quantity
    }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Chart 1: Stock Status Distribution */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left lg:col-span-1 min-h-[350px]">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
          <PieIcon size={14} className="text-orange-500" />
          Stock Status Distribution
        </h3>
        {stockStatusData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs font-bold text-slate-400">
            No stock status details recorded
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="inStockGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="lowStockGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="outOfStockGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={stockStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stockStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.gradId} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: "#1e293b", border: "none", borderRadius: "12px", fontSize: "11px", color: "#fff" }}
                    itemStyle={{ color: "#fff", fontWeight: "bold" }}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={(value) => [`${value} Items`, "Count"]} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2.5 border-t border-slate-100/60 pt-4">
              {stockStatusData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-bold text-slate-650">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-slate-800">{item.value} Item(s)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chart 2: Purchase vs Issue Daily Trend */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left lg:col-span-2 min-h-[350px]">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-orange-500" />
          Purchase & Issue Activity Trend
        </h3>
        {trendData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs font-bold text-slate-400">
            No transaction records in this date range
          </div>
        ) : (
          <div className="flex-1 h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} />
                <Tooltip 
                  contentStyle={{ background: "#1e293b", border: "none", borderRadius: "12px", fontSize: "11px", color: "#fff", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                  itemStyle={{ color: "#fff", fontWeight: "bold" }}
                  labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 10 }} />
                <Area type="monotone" dataKey="Purchases Amount (₹)" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPurchases)" />
                <Area type="monotone" dataKey="Issues Quantity" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIssues)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 3: Category Valuation breakdown */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left lg:col-span-3 min-h-[320px]">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
          <BarChart2 size={14} className="text-orange-500" />
          Top Category Valuations (Current Stock value)
        </h3>
        {barChartData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs font-bold text-slate-400">
            No category valuations details available
          </div>
        ) : (
          <div className="flex-1 h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="barValuationGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} />
                <Tooltip 
                  contentStyle={{ background: "#1e293b", border: "none", borderRadius: "12px", fontSize: "11px", color: "#fff", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                  itemStyle={{ color: "#fff", fontWeight: "bold" }}
                  labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                  formatter={(value) => [`₹${parseFloat(value).toLocaleString()}`, "Valuation"]} 
                />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="Valuation (₹)" fill="url(#barValuationGrad)" radius={[5, 5, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryDashboardCharts;
