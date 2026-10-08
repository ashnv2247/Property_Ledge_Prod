"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Sparkles, Zap, Shield, ArrowRight } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal, StaggerContainer, StaggerItem } from "@/components/ui/Reveal";

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      id: "landlord",
      name: "Landlord Starter",
      description: "For private investors & self-managed landlords",
      monthlyPrice: 39,
      annualPrice: 29,
      period: "/ mo",
      features: [
        "Up to 5 properties",
        "Automated PayID & Direct Debit",
        "ATO Tax & BAS Reports",
        "Digital Lease & E-Sign",
        "Standard Email Support",
      ],
      popular: false,
      cta: "Start 14-Day Free Trial",
      href: "/checkout?plan=pro",
    },
    {
      id: "manager",
      name: "Portfolio Pro",
      description: "For growing portfolios & active property managers",
      monthlyPrice: 99,
      annualPrice: 79,
      period: "/ mo",
      features: [
        "Up to 50 properties",
        "Automated Rent Arrears Escalations",
        "Unlimited Routine Inspections (App)",
        "Accountant Read-Only Multi-Access",
        "Automated Bond Lodgement Feeds",
        "Priority 24/7 AU Support",
      ],
      popular: true,
      cta: "Get Started Free",
      href: "/checkout?plan=business",
    },
    {
      id: "agency",
      name: "Agency & Enterprise",
      description: "For real-estate agencies & institutional portfolios",
      monthlyPrice: null,
      annualPrice: null,
      customPrice: "Custom",
      period: "",
      features: [
        "Unlimited properties & entities",
        "Custom Trust Accounting Integrations",
        "Multi-Agent RBAC & Permissions",
        "Dedicated AU Account Executive",
        "SLA & Custom Migration Assistance",
      ],
      popular: false,
      cta: "Speak with Sales",
      href: "#contact-agency",
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 bg-[#061222]/60 relative overflow-hidden select-none">
      {/* Background ambient radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#008F83]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 space-y-10 relative z-10">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <Reveal direction="up" delay={0.1}>
            <SectionLabel>SIMPLE, PREDICTABLE PRICING</SectionLabel>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading tracking-tight text-white uppercase">
              Scale Your Portfolio with Confidence
            </h2>
          </Reveal>
          <Reveal direction="up" delay={0.3}>
            <p className="text-sm sm:text-base text-[#8FA3B8]">
              14-day free trial. No credit card required. Cancel anytime.
            </p>
          </Reveal>

          {/* Billing Switcher (21st.dev Pill) */}
          <Reveal direction="up" delay={0.35}>
            <div className="inline-flex items-center gap-3 p-1.5 rounded-full bg-[#071526] border border-white/[0.06] shadow-inner mt-2">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  !isAnnual
                    ? "bg-[#008F83] text-white shadow-xs"
                    : "text-[#8FA3B8] hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isAnnual
                    ? "bg-[#008F83] text-white shadow-xs"
                    : "text-[#8FA3B8] hover:text-white"
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#00A99D] text-[#061222]">
                  Save 20%
                </span>
              </button>
            </div>
          </Reveal>
        </div>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {plans.map((plan, idx) => {
            const price = plan.customPrice 
              ? plan.customPrice 
              : isAnnual 
                ? `$${plan.annualPrice}` 
                : `$${plan.monthlyPrice}`;

            return (
              <StaggerItem key={idx} className="h-full">
                <div
                  className={`relative rounded-2xl p-7 sm:p-8 flex flex-col justify-between h-full transition-all duration-300 backdrop-blur-xl ${
                    plan.popular
                      ? "bg-[#08182A] border-2 border-[#008F83] shadow-2xl shadow-[#008F83]/15 ring-1 ring-[#008F83]/30"
                      : "bg-[#08182A]/70 border border-white/[0.06] hover:border-[#008F83]/40 shadow-xl"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[#008F83] text-white font-heading font-bold text-[10px] tracking-widest uppercase shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      MOST POPULAR
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-bold font-heading text-white">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-[#8FA3B8] mt-1">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1.5 pt-2 pb-4 border-b border-white/[0.04]">
                      <span className="text-3xl sm:text-4xl font-extrabold font-heading text-white">
                        {price}
                      </span>
                      {plan.period && (
                        <span className="text-xs font-medium text-[#8FA3B8]">
                          {plan.period} {isAnnual ? "(billed annually)" : "(billed monthly)"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="text-[11px] font-bold text-[#8FA3B8] uppercase tracking-wider">
                        Included with plan:
                      </div>
                      <ul className="space-y-2.5">
                        {plan.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-2.5 text-xs text-white/90">
                            <CheckCircle2 className="w-4 h-4 text-[#00A99D] shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <Link
                      href={plan.href}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        plan.popular
                          ? "bg-[#008F83] hover:bg-[#00A99D] text-white shadow-lg shadow-[#008F83]/25 active:scale-[0.98]"
                          : "bg-[#071526] hover:bg-[#0B1D30] border border-white/[0.06] hover:border-[#008F83]/40 text-white active:scale-[0.98]"
                      }`}
                    >
                      <span>{plan.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
