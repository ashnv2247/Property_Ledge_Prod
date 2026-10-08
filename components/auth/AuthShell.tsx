"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Globe, ArrowLeft, ChevronDown } from "lucide-react";
import { AuthVisualPanel } from "./AuthVisualPanel";

interface AuthShellProps {
  mode: "signup" | "login" | "forgot-password" | "reset-password" | "verify-email";
  children: React.ReactNode;
}

export function AuthShell({ mode, children }: AuthShellProps) {
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  return (
    <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 dark:bg-[#061222] text-slate-900 dark:text-white flex flex-col lg:flex-row selection:bg-[#008F83] selection:text-white">
      {/* LEFT MARKETING & PRODUCT PANEL (Desktop split-screen ~45%) */}
      <div className="hidden lg:block lg:w-[45%] xl:w-[44%] h-full relative shrink-0">
        <AuthVisualPanel mode={mode} />
      </div>

      {/* MOBILE / TABLET COMPACT BRAND HEADER (< 1100px) */}
      <div className="lg:hidden w-full bg-[#061222] p-4 text-white border-b border-white/[0.06]">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src="/logo_Dark.png"
                alt="PropertyLedge Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-heading font-bold text-sm tracking-wider uppercase text-white">
              PROPERTYLEDGE
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Website
          </Link>
        </div>
      </div>

      {/* RIGHT AUTHENTICATION WORKSPACE (~55%) */}
      <div className="flex-1 min-h-screen lg:min-h-full flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto bg-slate-50 dark:bg-[#061222]">
        {/* Top Controls Row */}
        <div className="w-full max-w-[520px] mx-auto flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <Link
            href="/"
            className="hidden lg:inline-flex items-center gap-1.5 font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#008F83] dark:text-[#00A99D]" />
            Back to website
          </Link>

          {/* Language Selector Dropdown */}
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#08182A] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-[#0B1D30] transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008F83]"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
              <span>English</span>
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-400" />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-1 w-36 py-1 bg-white dark:bg-[#08182A] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xl z-50 text-xs text-slate-900 dark:text-white">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen(false)}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-[#0B1D30] font-medium flex items-center justify-between"
                >
                  <span>English (AU)</span>
                  <span className="text-[#008F83] dark:text-[#00A99D]">✓</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLangMenuOpen(false)}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-[#0B1D30] text-slate-600 dark:text-slate-400"
                >
                  English (US)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Centered Auth Content Workspace */}
        <div className="w-full max-w-[520px] mx-auto my-auto py-8 sm:py-10">
          {children}
        </div>

        {/* Footer info */}
        <div className="w-full max-w-[520px] mx-auto pt-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} PropertyLedge Pty Ltd</span>
          <div className="flex items-center gap-3">
            <Link href="/#platform" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
