'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OnboardingStage } from '@/lib/onboarding/state';
import {
  Building2,
  Users,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Home,
  Sparkles,
  Key,
  MapPin,
  UserCheck,
  Briefcase,
  Layers,
} from 'lucide-react';

interface OnboardingStepVisualProps {
  stage: OnboardingStage;
  className?: string;
}

export function OnboardingStepVisual({ stage, className = '' }: OnboardingStepVisualProps) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#071526]/90 flex flex-col justify-between p-6 sm:p-8 select-none ${className}`}
    >
      {/* Ambient Gradient Glows inside visual panel */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#008F83]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#0B1D30] rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Badge */}
      <div className="relative z-20 flex items-center justify-between pr-12">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0B1D30]/90 backdrop-blur-md border border-white/[0.08] text-white shadow-lg">
          <div className="flex h-4 w-4 items-center justify-center rounded-md bg-[#008F83]/20 p-0.5 shrink-0">
            <Sparkles className="h-3 w-3 text-[#00A99D]" />
          </div>
          <span className="font-heading text-[11px] font-semibold tracking-tight text-[#FFFFFF]">
            PropertyLedge <span className="text-[#8FA3B8] font-normal">Platform</span>
          </span>
        </div>
      </div>

      {/* Center Dynamic Preview Panels */}
      <div className="relative z-20 my-auto py-4 flex flex-col items-center justify-center w-full">
        <AnimatePresence mode="wait">
          {(stage === 'welcome' || stage === 'workspace') && (
            <motion.div
              key="visual-workspace"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm space-y-3"
            >
              {/* Workspace Card Preview */}
              <div className="p-4 rounded-2xl bg-[#08182A]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-[#008F83]/20 text-[#00A99D] flex items-center justify-center font-bold text-sm border border-[#008F83]/30">
                      PL
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#FFFFFF] tracking-tight">Your Portfolio Hub</h4>
                      <p className="text-[10px] text-[#8FA3B8]">Australian Cloud Workspace</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    Live
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                  <div className="p-2.5 rounded-xl bg-[#0B1D30]/80 border border-white/[0.04]">
                    <span className="text-[10px] text-[#8FA3B8] block">Compliance</span>
                    <span className="text-xs font-bold text-[#FFFFFF] mt-0.5 block">ATO Ready</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0B1D30]/80 border border-white/[0.04]">
                    <span className="text-[10px] text-[#8FA3B8] block">Currency</span>
                    <span className="text-xs font-bold text-[#FFFFFF] mt-0.5 block">AUD ($)</span>
                  </div>
                </div>
              </div>

              {/* Mini metric badges */}
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-xl bg-[#08182A]/80 border border-white/[0.06] flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#FFFFFF] block leading-none">Automated</span>
                    <span className="text-[10px] text-[#8FA3B8] leading-none mt-0.5 block">Reconciliation</span>
                  </div>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-[#08182A]/80 border border-white/[0.06] flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#008F83]/15 text-[#00A99D] flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#FFFFFF] block leading-none">Bank-Grade</span>
                    <span className="text-[10px] text-[#8FA3B8] leading-none mt-0.5 block">Security</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'subscription' && (
            <motion.div
              key="visual-subscription"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm space-y-3"
            >
              <div className="p-4 rounded-2xl bg-[#08182A]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#8FA3B8]">Selected Experience</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#008F83]/20 text-[#00A99D] border border-[#008F83]/30">
                    14-Day Free Trial
                  </span>
                </div>
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  {[
                    'Full access to all portfolio features',
                    'Direct bank feed reconciliation',
                    'Tax & expense verification reports',
                    'Zero commitment · Cancel anytime',
                  ].map((perk, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#FFFFFF]/90">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#008F83] shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'property' && (
            <motion.div
              key="visual-property"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm space-y-3"
            >
              {/* Live Property Mini-Card */}
              <div className="p-4 rounded-2xl bg-[#08182A]/95 backdrop-blur-xl border border-[#008F83]/40 shadow-2xl shadow-black/40 space-y-3 ring-1 ring-[#008F83]/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-[#008F83]/20 text-[#00A99D] flex items-center justify-center shrink-0 border border-[#008F83]/30">
                      <Home className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#FFFFFF] tracking-tight">Your First Property</h4>
                      <p className="text-[10px] text-[#8FA3B8] flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-[#008F83]" />
                        <span>Australia</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                  <div className="p-2.5 rounded-xl bg-[#0B1D30]/80 border border-white/[0.04]">
                    <span className="text-[10px] text-[#8FA3B8] block">Structure</span>
                    <span className="text-xs font-bold text-[#FFFFFF] mt-0.5 block">Residential</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0B1D30]/80 border border-white/[0.04]">
                    <span className="text-[10px] text-[#8FA3B8] block">Lease Status</span>
                    <span className="text-xs font-bold text-emerald-400 mt-0.5 block">Managed</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#08182A]/80 border border-white/[0.06] flex items-center gap-2.5">
                <Key className="h-4 w-4 text-[#00A99D] shrink-0" />
                <span className="text-xs text-[#8FA3B8]">Instant document organization and lease tracking enabled.</span>
              </div>
            </motion.div>
          )}

          {stage === 'team' && (
            <motion.div
              key="visual-team"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm space-y-3"
            >
              <div className="p-4 rounded-2xl bg-[#08182A]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#00A99D]" />
                    <span className="text-xs font-bold text-[#FFFFFF]">Collaborators & Roles</span>
                  </div>
                  <span className="text-[10px] text-[#8FA3B8]">Multi-User</span>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  {[
                    { role: 'Accountant', desc: 'Read-only financial export & tax review', icon: <Briefcase className="h-3.5 w-3.5 text-blue-400" /> },
                    { role: 'Property Manager', desc: 'Tenant & lease maintenance access', icon: <Building2 className="h-3.5 w-3.5 text-emerald-400" /> },
                    { role: 'Co-owner / Partner', desc: 'Full portfolio overview & visibility', icon: <UserCheck className="h-3.5 w-3.5 text-[#00A99D]" /> },
                  ].map((item, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-[#0B1D30]/80 border border-white/[0.04] flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-white/[0.04] shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-[#FFFFFF] block">{item.role}</span>
                        <span className="text-[10px] text-[#8FA3B8] leading-tight block">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'ready' && (
            <motion.div
              key="visual-ready"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm space-y-3"
            >
              <div className="p-4 rounded-2xl bg-[#08182A]/90 backdrop-blur-xl border border-emerald-500/30 shadow-2xl shadow-black/40 space-y-3 ring-1 ring-emerald-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#FFFFFF] tracking-tight">Portfolio Configured</h4>
                    <p className="text-[10px] text-emerald-400 font-medium">100% Ready for Management</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs text-[#8FA3B8]">
                  <div className="flex items-center justify-between">
                    <span>Australian Tax Compliance</span>
                    <span className="text-[#FFFFFF] font-semibold">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Expense Verification Pack</span>
                    <span className="text-[#FFFFFF] font-semibold">Ready</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dashboard Analytics</span>
                    <span className="text-[#FFFFFF] font-semibold">Enabled</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Context Narrative */}
      <div className="relative z-20 space-y-1">
        <h3 className="font-heading text-sm font-bold tracking-tight text-[#FFFFFF]">
          {stage === 'welcome' || stage === 'workspace'
            ? 'Your property portfolio, organized.'
            : stage === 'subscription'
            ? 'Transparent plans built for scale.'
            : stage === 'property'
            ? 'Every property in one central hub.'
            : stage === 'team'
            ? 'Seamless collaboration with your team.'
            : "You're ready to get started."}
        </h3>
        <p className="text-xs text-[#8FA3B8] leading-relaxed">
          {stage === 'welcome' || stage === 'workspace'
            ? 'Everything starts with your customized Australian management workspace.'
            : stage === 'subscription'
            ? 'Start with a 14-day trial or explore the platform at your own pace.'
            : stage === 'property'
            ? 'Track income, expenses, documents, and leases with ease.'
            : stage === 'team'
            ? 'Invite your accountant or property manager whenever you are ready.'
            : 'Your PropertyLedge workspace is fully configured.'}
        </p>
      </div>
    </div>
  );
}
