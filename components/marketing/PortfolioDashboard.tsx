"use client";

import React, { useState } from "react";
import { Plus, Building2, MapPin, DollarSign, TrendingUp, Sparkles, Filter } from "lucide-react";

export function PortfolioDashboard() {
  const [filter, setFilter] = useState<string>("All");

  const propertySummary = [
    { label: "Total Assets", count: "24", sub: "+2 this month", trend: "+8.3%", icon: Building2 },
    { label: "Occupancy Rate", count: "95.8%", sub: "23 of 24 leased", trend: "High", icon: Sparkles },
    { label: "Gross Yield", count: "5.4%", sub: "Above AU avg", trend: "+0.3%", icon: TrendingUp },
    { label: "Monthly Rent", count: "$68.4k", sub: "100% collected", trend: "+4.1%", icon: DollarSign },
  ];

  const properties = [
    {
      address: "12 Anderson Street",
      type: "House",
      location: "Sydney, NSW",
      occupancy: "Occupied",
      rent: "$2,400 / mo",
      yield: "5.8%",
      status: "Active",
      tenant: "Sarah Parker",
    },
    {
      address: "7 Park Avenue",
      type: "Townhouse",
      location: "Melbourne, VIC",
      occupancy: "Occupied",
      rent: "$3,180 / mo",
      yield: "5.2%",
      status: "Active",
      tenant: "Liam & Zoe Chen",
    },
    {
      address: "46 Collins Street",
      type: "Apartment",
      location: "Melbourne, VIC",
      occupancy: "Occupied",
      rent: "$2,890 / mo",
      yield: "6.1%",
      status: "Active",
      tenant: "Marcus Vance",
    },
    {
      address: "10 Waverley Road",
      type: "House",
      location: "Brisbane, QLD",
      occupancy: "Occupied",
      rent: "$1,890 / mo",
      yield: "5.4%",
      status: "Active",
      tenant: "Chloe Higgins",
    },
    {
      address: "8 Ocean Drive",
      type: "Apartment",
      location: "Gold Coast, QLD",
      occupancy: "Vacant",
      rent: "$2,100 / mo",
      yield: "—",
      status: "Listing",
      tenant: "Pending Application",
    },
  ];

  const filteredProperties = filter === "All" 
    ? properties 
    : properties.filter(p => p.occupancy === filter);

  return (
    <div className="w-full rounded-2xl border border-border dark:border-white/[0.06] bg-surface dark:bg-[#08182A]/90 backdrop-blur-xl shadow-xl dark:shadow-2xl dark:shadow-black/40 overflow-hidden text-foreground text-xs select-none">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-border dark:border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-subtle/50 dark:bg-[#061222]/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 dark:bg-[#008F83]/15 dark:border-[#008F83]/30 flex items-center justify-center text-accent dark:text-[#008F83] shrink-0 shadow-xs">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm sm:text-base text-foreground dark:text-white tracking-tight">
                Live Portfolio Matrix
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-accent/15 text-accent dark:bg-[#008F83]/20 dark:text-[#00A99D] border border-accent/25 dark:border-[#008F83]/30">
                24 Properties
              </span>
            </div>
            <p className="text-[11px] text-muted dark:text-[#8FA3B8]">
              Automated Australian real-estate asset management
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-surface-subtle dark:bg-[#071526] p-1 rounded-xl border border-border dark:border-white/[0.04]">
          {["All", "Occupied", "Vacant"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-all ${
                filter === tab
                  ? "bg-accent dark:bg-[#008F83] text-white shadow-xs"
                  : "text-muted dark:text-[#8FA3B8] hover:text-foreground dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Metric Summary Bento Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {propertySummary.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-3 rounded-xl border border-border dark:border-white/[0.04] bg-surface-subtle/60 dark:bg-[#071526]/80 hover:border-accent/40 dark:hover:border-[#008F83]/30 transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase font-bold tracking-wider text-muted/80 dark:text-[#64788D]">
                    {item.label}
                  </span>
                  <Icon className="w-3 h-3 text-muted dark:text-[#8FA3B8] group-hover:text-accent dark:group-hover:text-[#008F83] transition-colors" />
                </div>
                <div className="text-lg sm:text-xl font-bold font-heading text-foreground dark:text-white">
                  {item.count}
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted dark:text-[#8FA3B8] truncate">{item.sub}</span>
                  <span className="text-accent dark:text-[#00A99D] font-semibold">{item.trend}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Properties Table */}
        <div className="overflow-x-auto rounded-xl border border-border dark:border-white/[0.04] bg-surface-subtle/30 dark:bg-[#071526]/40">
          <table className="w-full text-left border-collapse min-w-[540px]">
            <thead>
              <tr className="border-b border-border dark:border-white/[0.04] text-[10px] uppercase tracking-wider text-muted dark:text-[#64788D] font-heading bg-surface-subtle/80 dark:bg-[#061222]/30">
                <th className="py-2.5 px-3.5 font-semibold">Property Address</th>
                <th className="py-2.5 px-3 font-semibold">Tenant</th>
                <th className="py-2.5 px-3 font-semibold">Location</th>
                <th className="py-2.5 px-3 font-semibold">Occupancy</th>
                <th className="py-2.5 px-3 font-semibold">Rent</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 dark:divide-white/[0.03] text-[11px]">
              {filteredProperties.map((p, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-150 group"
                >
                  <td className="py-2.5 px-3.5 font-medium text-foreground dark:text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent dark:bg-[#008F83]" />
                    {p.address}
                  </td>
                  <td className="py-2.5 px-3 text-muted dark:text-[#8FA3B8]">{p.tenant}</td>
                  <td className="py-2.5 px-3 text-muted dark:text-[#8FA3B8]">{p.location}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-semibold border ${
                        p.occupancy === "Occupied"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {p.occupancy}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-foreground dark:text-white">{p.rent}</td>
                  <td className="py-2.5 px-3.5 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9.5px] font-semibold ${
                        p.status === "Active"
                          ? "bg-accent/10 text-accent border border-accent/20 dark:bg-[#008F83]/15 dark:text-[#00A99D] dark:border-[#008F83]/30"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
