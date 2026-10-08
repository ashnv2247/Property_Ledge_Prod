"use client";

import React, { useState } from "react";
import { CheckCircle2, Camera, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export function InspectionPhone() {
  const [checkedCount, setCheckedCount] = useState(5);

  const items = [
    { name: "Entry & Security Foyer", status: "Pass", room: "Exterior" },
    { name: "Kitchen & Rangehood", status: "Clean", room: "Interior" },
    { name: "Master Ensuite Bath", status: "Pristine", room: "Bathroom" },
    { name: "Smoke Alarms & Fire Safety", status: "Compliant", room: "Safety" },
    { name: "Air Conditioning & HVAC", status: "Operational", room: "Appliances" },
  ];

  return (
    <div className="relative mx-auto max-w-[290px] sm:max-w-[310px] rounded-[42px] border-[5px] border-white/10 bg-[#061222] shadow-2xl shadow-black/80 p-4 text-white select-none backdrop-blur-xl">
      {/* Top Dynamic Island / Camera Notch */}
      <div className="w-24 h-4.5 bg-black/90 rounded-full mx-auto mb-3 flex items-center justify-between px-3 border border-white/[0.05]">
        <div className="w-2 h-2 rounded-full bg-[#00A99D]/80 animate-pulse" />
        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white/10" />
      </div>

      {/* Phone Screen Content */}
      <div className="space-y-3.5 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
          <div>
            <span className="text-[9.5px] text-[#00A99D] uppercase font-bold tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> State Compliance
            </span>
            <div className="font-heading font-bold text-sm text-white mt-0.5">
              12 Anderson Street
            </div>
          </div>
          <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
            98% Complete
          </span>
        </div>

        {/* Room Checklist */}
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-[#08182A]/90 border border-white/[0.03] hover:border-[#008F83]/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <div>
                  <span className="font-semibold text-white text-[10.5px] block">{item.name}</span>
                  <span className="text-[9px] text-[#64788D]">{item.room}</span>
                </div>
              </div>
              <span className="text-[9.5px] font-mono text-[#00A99D] bg-[#008F83]/10 px-1.5 py-0.5 rounded">
                {item.status}
              </span>
            </div>
          ))}
        </div>

        {/* Photos Upload Count Bento */}
        <div className="p-2.5 rounded-xl border border-white/[0.04] bg-[#071526] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#008F83]/15 border border-[#008F83]/30 flex items-center justify-center text-[#00A99D]">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10.5px] font-semibold text-white">Geotagged Evidence</div>
              <div className="text-[9px] text-[#8FA3B8]">Immutable timestamp</div>
            </div>
          </div>
          <span className="text-xs font-bold font-mono text-[#00A99D]">24 / 24</span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          className="w-full py-2.5 px-3 rounded-xl bg-[#008F83] hover:bg-[#00A99D] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#008F83]/20 transition-all active:scale-[0.98]"
        >
          <span>Sign & Dispatch Report</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Bar indicator */}
      <div className="w-28 h-1 bg-white/20 rounded-full mx-auto mt-3" />
    </div>
  );
}
