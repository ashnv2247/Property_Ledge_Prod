"use client";

import React from "react";
import { Star, Quotes as Quote } from "@phosphor-icons/react";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";

export function Testimonials() {
  const supportingReviews = [
    {
      quote: "Managing 18 properties in Melbourne used to take my entire weekend. PropertyLedge automated our reconciliations and arrears notices entirely.",
      author: "Emily Richardson",
      role: "Private Investor (18 Doors)",
      location: "Melbourne, VIC",
      metric: "Saved 8 hrs/wk",
    },
    {
      quote: "Our external CPA was blown away by the self-contained verification packs. Tax prep went from weeks of back-and-forth to 1 single PDF export.",
      author: "Marcus Thornton",
      role: "Principal, Nexus Asset Mgmt",
      location: "Sydney, NSW",
      metric: "100% ATO Match",
    },
    {
      quote: "Routine inspections are 3x faster with the geotagged photo reports. The tenant digital signing flow is completely seamless.",
      author: "Daniel Leong",
      role: "Licensed Property Manager",
      location: "Brisbane, QLD",
      metric: "0 Arrears in 6 Mo",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-[#061222] relative overflow-hidden select-none">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-[#008F83]/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 space-y-12 relative z-10">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <Reveal direction="up" delay={0.1}>
            <SectionLabel>PROVEN ACROSS AUSTRALIA</SectionLabel>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
            <h2 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight text-white uppercase">
              Loved by Owners, Agents & Accountants
            </h2>
          </Reveal>
          <Reveal direction="up" delay={0.3}>
            <p className="text-sm sm:text-base text-[#8FA3B8]">
              Over 14,000+ Australian residential and commercial tenancies run on PropertyLedge.
            </p>
          </Reveal>
        </div>

        {/* 3 Modern 21st.dev Review Cards */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {supportingReviews.map((rev, idx) => (
            <StaggerItem key={idx}>
              <div className="p-6 sm:p-7 rounded-2xl border border-white/[0.06] bg-[#08182A]/90 hover:border-[#008F83]/40 backdrop-blur-xl transition-all duration-300 h-full flex flex-col justify-between space-y-5 shadow-xl group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex text-amber-400 gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} weight="fill" className="w-4 h-4" />
                      ))}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[#008F83]/15 text-[#00A99D] border border-[#008F83]/25 font-mono">
                      {rev.metric}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-sans">
                    “{rev.quote}”
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{rev.author}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00A99D]" />
                    </div>
                    <div className="text-[10px] text-[#8FA3B8]">{rev.role}</div>
                  </div>
                  <span className="text-[10px] text-[#64788D] font-mono">{rev.location}</span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
