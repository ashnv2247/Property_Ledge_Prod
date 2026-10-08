"use client";

import React from "react";
import { FileCheck2, CheckCircle2, ShieldCheck, Lock, Sparkles } from "lucide-react";

export function LeaseDocument() {
  const steps = [
    { title: "Standard AU Lease Drafted", desc: "State Residential Tenancies Act Compliant", status: "Done" },
    { title: "Digital Review & ID Verification", desc: "100-Point Identity Verification", status: "Done" },
    { title: "Dual Cryptographic Signature", desc: "SHA-256 Tamper-Proof Audit Trail", status: "Done" },
    { title: "Rental Bond Lodgement Ready", desc: "Automated NSW/VIC/QLD Authority Export", status: "Active" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center select-none">
      {/* Tenancy Agreement Card */}
      <div className="md:col-span-7 rounded-2xl border border-white/[0.06] bg-[#08182A]/90 backdrop-blur-xl shadow-2xl shadow-black/40 p-5 sm:p-6 space-y-4 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#008F83]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#008F83]/15 border border-[#008F83]/30 flex items-center justify-center text-[#00A99D]">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-heading font-bold text-xs tracking-tight text-white block">
                Residential Tenancy Agreement
              </span>
              <span className="text-[10px] text-[#8FA3B8]">Standard Form 1AA (NSW)</span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Legally Binding
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between py-1 border-b border-white/[0.03]">
            <span className="text-[#8FA3B8]">Property Address</span>
            <span className="font-medium text-white">12 Anderson Street, Sydney</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/[0.03]">
            <span className="text-[#8FA3B8]">Primary Tenant</span>
            <span className="font-medium text-white">Sarah Parker</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/[0.03]">
            <span className="text-[#8FA3B8]">Lease Duration</span>
            <span className="font-medium text-white">12 Months (Fixed Term)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/[0.03]">
            <span className="text-[#8FA3B8]">Agreed Rent</span>
            <span className="font-bold text-white font-mono">$2,400.00 / month</span>
          </div>
        </div>

        {/* Digital Signatures Box */}
        <div className="pt-2 border-t border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9.5px] uppercase font-bold tracking-wider text-[#64788D]">
              Verified E-Signatures
            </span>
            <span className="text-[9px] font-mono text-[#00A99D] flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> SHA-256 Sealed
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl bg-[#071526]/80 border border-white/[0.04] text-center">
              <svg viewBox="0 0 140 40" className="w-28 h-7 mx-auto stroke-[#00A99D] fill-none">
                <path
                  d="M 14 24 C 10 18 12 9 20 9 C 28 9 22 19 16 22 C 12 24 20 28 28 25"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="33" cy="24" r="1.2" fill="currentColor" className="text-[#00A99D]" />
                <path
                  d="M 40 27 L 43 10 C 45 7 57 7 55 16 C 53 22 42 19 48 19"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 48 19 C 52 21 54 25 59 24 C 63 23 64 19 67 22 C 70 24 72 19 74 23 C 76 26 77 13 79 23 C 81 24 85 20 88 21 C 91 22 95 20 99 23 T 107 21"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 16 30 Q 58 35 110 26"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </svg>
              <div className="text-[9px] text-[#8FA3B8] border-t border-white/[0.04] pt-1 mt-1 font-medium">
                Tenant: Sarah Parker
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#071526]/80 border border-white/[0.04] text-center">
              <svg viewBox="0 0 140 40" className="w-28 h-7 mx-auto stroke-[#38BDF8] fill-none">
                <path
                  d="M 12 13 C 18 5 30 5 24 17 C 18 26 10 30 16 32 C 22 34 28 21 34 21"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="38" cy="22" r="1.2" fill="currentColor" className="text-[#38BDF8]" />
                <path
                  d="M 44 25 L 48 8 C 50 6 62 9 58 18 C 54 25 44 23 54 23 C 60 23 64 17 68 23 C 72 27 74 17 77 22 C 81 26 83 11 86 24 C 89 25 94 20 101 23"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 14 27 C 44 21 78 33 112 22"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              </svg>
              <div className="text-[9px] text-[#8FA3B8] border-t border-white/[0.04] pt-1 mt-1 font-medium">
                Authorized Lessor / Agent
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sequential Lease Workflow */}
      <div className="md:col-span-5 space-y-3 pl-2 sm:pl-4">
        <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#00A99D] mb-1 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> DIGITAL LEASE WORKFLOW
        </div>

        {steps.map((step, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-[#071526]/80 border border-white/[0.04] flex items-start gap-3 transition-all"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white font-heading">
                {step.title}
              </div>
              <div className="text-[10.5px] text-[#8FA3B8]">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
