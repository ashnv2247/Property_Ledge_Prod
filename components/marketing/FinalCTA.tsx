"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, CheckCircle2, Zap } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

export function FinalCTA() {
  return (
    <section className="py-24 md:py-32 bg-background dark:bg-[#061222] text-foreground dark:text-white relative overflow-hidden select-none border-t border-border dark:border-white/[0.06]">
      {/* Background Architectural Ambient Light & Beam */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] bg-[#008F83]/10 dark:bg-[#008F83]/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-architectural-grid opacity-10 dark:opacity-20 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center space-y-8 relative z-10">
        <Reveal direction="up" delay={0.1}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#008F83]/30 bg-surface dark:bg-[#08182A]/90 backdrop-blur-md text-[11px] font-bold tracking-[0.15em] uppercase text-accent dark:text-[#00A99D] font-heading shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-accent dark:text-[#00A99D] animate-pulse" />
            <span>TAKE CONTROL OF YOUR PORTFOLIO</span>
          </div>
        </Reveal>

        <Reveal direction="up" delay={0.2}>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-heading tracking-tight uppercase leading-[1.05] text-foreground dark:text-white">
            Ready to run <br />
            <span className="text-accent dark:text-[#00A99D]">your portfolio</span> with clarity?
          </h2>
        </Reveal>

        <Reveal direction="up" delay={0.3}>
          <p className="text-base sm:text-lg text-muted dark:text-[#8FA3B8] max-w-xl mx-auto leading-relaxed">
            Join thousands of Australian property managers and landlords switching to a unified,
            ATO-compliant operating system.
          </p>
        </Reveal>

        <Reveal direction="up" delay={0.4}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/checkout?plan=business"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm shadow-xl shadow-accent/25 transition-all hover:scale-105 active:scale-95"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-border hover:border-accent/50 text-sm font-semibold text-foreground dark:text-white bg-surface hover:bg-surface-subtle dark:bg-[#08182A]/80 dark:hover:bg-[#0B1D30] backdrop-blur-md transition-all active:scale-95 shadow-sm"
            >
              View Pricing Matrix
            </Link>
          </div>
        </Reveal>

        <Reveal direction="up" delay={0.5}>
          <div className="flex flex-wrap items-center justify-center gap-5 pt-4 text-xs text-muted dark:text-[#8FA3B8]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent dark:text-[#00A99D]" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent dark:text-[#00A99D]" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent dark:text-[#00A99D]" />
              <span>5-minute portfolio import</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
