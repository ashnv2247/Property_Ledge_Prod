"use client";

import React, { useState } from "react";
import { ChevronDown, TrendingUp, DollarSign, PieChart, BarChart3, Sparkles } from "lucide-react";

export function FinancialDashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>("Jun");

  const financialMetrics = [
    {
      label: "Rental Income",
      amount: "$182,400",
      change: "+8.4%",
      isPositive: true,
    },
    {
      label: "Operating Expenses",
      amount: "$42,820",
      change: "-3.2%",
      isPositive: true,
    },
    {
      label: "Net Cashflow",
      amount: "$139,580",
      change: "+10.2%",
      isPositive: true,
    },
  ];

  const barData = [
    { month: "Jan", income: 80, expense: 35, val: "$28.4k" },
    { month: "Feb", income: 85, expense: 30, val: "$30.1k" },
    { month: "Mar", income: 90, expense: 45, val: "$32.0k" },
    { month: "Apr", income: 88, expense: 38, val: "$31.4k" },
    { month: "May", income: 95, expense: 40, val: "$34.2k" },
    { month: "Jun", income: 98, expense: 42, val: "$35.8k" },
  ];

  const expenseBreakdown = [
    { name: "Repairs & Maintenance", pct: "39%", color: "#00A99D" },
    { name: "Agency & Mgmt Fees", pct: "25%", color: "#38BDF8" },
    { name: "Council & Water Rates", pct: "18%", color: "#FBBF24" },
    { name: "Building Insurance", pct: "10%", color: "#A78BFA" },
    { name: "Depreciation & Other", pct: "8%", color: "#64788D" },
  ];

  return (
    <div className="w-full rounded-2xl border border-white/[0.06] bg-[#08182A]/90 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden text-foreground text-xs select-none">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-white/[0.04] flex items-center justify-between bg-[#061222]/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#008F83]/15 border border-[#008F83]/30 flex items-center justify-center text-[#00A99D] shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm sm:text-base text-white">
                ATO Real-Time Tax Telemetry
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                FY26 Live
              </span>
            </div>
            <p className="text-[11px] text-[#8FA3B8]">Automated Rental Schedules & Depreciation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#8FA3B8] hidden sm:inline">AU Standard</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {financialMetrics.map((m, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-white/[0.04] bg-[#071526]/80 hover:border-[#008F83]/30 transition-all space-y-1 group"
            >
              <span className="text-[9.5px] uppercase font-bold tracking-wider text-[#64788D]">
                {m.label}
              </span>
              <div className="text-xl font-bold font-heading text-white">
                {m.amount}
              </div>
              <div className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-400">
                <TrendingUp className="w-3 h-3" />
                <span>{m.change} vs prior FY</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts: Bar Chart + Donut Chart */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Income vs Expenses Bar Chart */}
          <div className="md:col-span-7 p-4 rounded-xl border border-white/[0.04] bg-[#071526]/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold text-xs text-white">
                Monthly Cash Velocity
              </span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1.5 text-[#8FA3B8]">
                  <span className="w-2 h-2 rounded-xs bg-[#00A99D]" /> Rent In
                </span>
                <span className="flex items-center gap-1.5 text-[#8FA3B8]">
                  <span className="w-2 h-2 rounded-xs bg-amber-500/80" /> Expense Out
                </span>
              </div>
            </div>

            {/* Custom Bar Visualization */}
            <div className="h-36 flex items-end justify-between gap-2 pt-4 px-2 border-b border-white/[0.04]">
              {barData.map((b, idx) => {
                const isSelected = selectedMonth === b.month;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedMonth(b.month)}
                    className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end cursor-pointer group"
                  >
                    <div className="w-full flex items-end justify-center gap-1.5 h-28">
                      {/* Income Bar */}
                      <div
                        style={{ height: `${b.income}%` }}
                        className={`w-3 sm:w-3.5 rounded-t-sm transition-all duration-300 ${
                          isSelected ? "bg-[#00A99D] shadow-sm shadow-[#00A99D]/50" : "bg-[#00A99D]/70 group-hover:bg-[#00A99D]"
                        }`}
                      />
                      {/* Expense Bar */}
                      <div
                        style={{ height: `${b.expense}%` }}
                        className={`w-3 sm:w-3.5 rounded-t-sm transition-all duration-300 ${
                          isSelected ? "bg-amber-500" : "bg-amber-500/60 group-hover:bg-amber-500"
                        }`}
                      />
                    </div>
                    <span className={`text-[10px] font-mono transition-colors ${
                      isSelected ? "text-[#00A99D] font-bold" : "text-[#8FA3B8]"
                    }`}>
                      {b.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expenses Breakdown Donut Chart */}
          <div className="md:col-span-5 p-4 rounded-xl border border-white/[0.04] bg-[#071526]/60 flex flex-col justify-between">
            <span className="font-heading font-semibold text-xs text-white">
              ATO Expense Tax Categories
            </span>

            <div className="flex items-center gap-4 py-2">
              {/* Donut SVG */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#00A99D"
                    strokeWidth="15"
                    strokeDasharray="93 145"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#38BDF8"
                    strokeWidth="15"
                    strokeDasharray="60 178"
                    strokeDashoffset="-93"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#FBBF24"
                    strokeWidth="15"
                    strokeDasharray="43 195"
                    strokeDashoffset="-153"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#A78BFA"
                    strokeWidth="15"
                    strokeDasharray="24 214"
                    strokeDashoffset="-196"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-[11px] font-bold text-white font-mono">$42.8k</div>
                  <div className="text-[8px] text-[#8FA3B8] uppercase">Claimed</div>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1 text-[10px] flex-1">
                {expenseBreakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[#8FA3B8] truncate">{item.name}</span>
                    </div>
                    <span className="font-semibold text-white ml-1">{item.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
