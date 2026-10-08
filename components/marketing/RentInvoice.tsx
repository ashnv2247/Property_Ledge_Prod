"use client";

import React, { useState } from "react";
import { Download, CheckCircle2, FileText, ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";

export function RentInvoice() {
  const [activeStep, setActiveStep] = useState(3);

  const steps = [
    { title: "Invoice Dispatched", desc: "Automated via ATO Rules", time: "01 Aug" },
    { title: "Tenant Notified", desc: "SMS & In-App Push", time: "02 Aug" },
    { title: "PayID / Direct Debit", desc: "Instant Bank Transfer", time: "05 Aug" },
    { title: "Ledger Reconciled", desc: "Balanced to $0.00", time: "Just now" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center select-none">
      {/* Rent Invoice Glass Card */}
      <div className="md:col-span-6 rounded-2xl border border-white/[0.06] bg-[#08182A]/90 backdrop-blur-xl shadow-2xl shadow-black/40 p-5 sm:p-6 space-y-4 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#008F83]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#008F83]/15 border border-[#008F83]/30 flex items-center justify-center text-[#00A99D]">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-heading font-bold text-xs tracking-tight text-white block">
                Rent Invoice #INV-0042
              </span>
              <span className="text-[10px] text-[#8FA3B8]">12 Anderson Street</span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            PAID
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#071526]/80 border border-white/[0.04] flex items-baseline justify-between">
          <div>
            <div className="text-[9.5px] uppercase font-bold tracking-wider text-[#64788D]">
              Monthly Amount
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-heading text-white mt-0.5">
              $4,280.00
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#8FA3B8] block">Cleared Funds</span>
            <span className="text-xs font-semibold text-emerald-400 font-mono">100% Match</span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-white/[0.03]">
            <span className="text-[#8FA3B8]">Tenant</span>
            <span className="font-medium text-white">Sarah Parker</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/[0.03]">
            <span className="text-[#8FA3B8]">Payment Method</span>
            <span className="font-medium text-[#00A99D] flex items-center gap-1">
              <Zap className="w-3 h-3" /> PayID Instant
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#8FA3B8]">Tax Invoiced</span>
            <span className="font-medium text-white">Includes GST</span>
          </div>
        </div>

        <button
          type="button"
          className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#008F83] hover:bg-[#00A99D] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#008F83]/20 active:scale-[0.98]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Tax Receipt</span>
        </button>
      </div>

      {/* Animated Live Processing Timeline */}
      <div className="md:col-span-6 space-y-3 pl-2 sm:pl-4">
        <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#00A99D] mb-1 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> REAL-TIME LEDGER TELEMETRY
        </div>

        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`relative flex items-start gap-3 p-2.5 rounded-xl transition-all ${
              idx <= activeStep
                ? "bg-[#071526]/80 border border-white/[0.04]"
                : "bg-transparent border border-transparent opacity-40"
            }`}
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white font-heading">
                  {step.title}
                </span>
                <span className="text-[9.5px] font-mono text-[#64788D]">{step.time}</span>
              </div>
              <div className="text-[10.5px] text-[#8FA3B8]">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
