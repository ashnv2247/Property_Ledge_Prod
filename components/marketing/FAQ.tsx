"use client";

import React, { useState } from "react";
import { Plus, Minus, HelpCircle, Sparkles } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Is PropertyLedge built specifically for Australian tenancy legislation?",
      answer:
        "Yes, 100%. PropertyLedge was engineered around Australian tenancy legislation across all states and territories (NSW Fair Trading, VCAT Victoria, RTA Queensland, WA DMIRS, etc.) and is natively configured for Australian tax structures and ATO rental schedule expense categorisation.",
    },
    {
      question: "How does automated rent collection and PayID work?",
      answer:
        "PropertyLedge generates unique tenant PayID and Direct Debit identifiers. Invoices and payment notices are automatically dispatched before the due date, and cleared bank funds reconcile in real time against the property ledger with zero manual entry required.",
    },
    {
      question: "Can I manage properties across multiple trusts, companies, and personal names?",
      answer:
        "Yes. Whether you have 2 properties in your personal name, a commercial warehouse in a discretionary trust, or an agency book with 100+ properties, you can partition distinct entities, Australian bank accounts, and ownership structures in one unified dashboard.",
    },
    {
      question: "Are digital leases legally binding in Australia?",
      answer:
        "Yes. All digital tenancy agreements executed through PropertyLedge comply with the Australian Electronic Transactions Act 1999 and state-specific residential tenancy laws. Every executed lease contains an immutable digital audit trail with cryptographic SHA-256 timestamps.",
    },
    {
      question: "Can my external accountant access my financial reports for tax time?",
      answer:
        "Yes. You can generate one-click, self-contained Accountant Expense Verification PDFs with attached receipts and transaction reconciliation, or invite your accountant with read-only financial access during BAS or EOFY tax preparation.",
    },
    {
      question: "How easy is it to migrate my existing tenancy data?",
      answer:
        "You can import your entire property roster, tenant details, historical ledgers, and active lease agreements via our 1-click CSV importer or direct PMS migration tools in under 5 minutes.",
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#061222]/80 relative overflow-hidden select-none">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 space-y-10 relative z-10">
        <div className="text-center space-y-4">
          <Reveal direction="up" delay={0.1}>
            <SectionLabel>FREQUENTLY ASKED QUESTIONS</SectionLabel>
          </Reveal>
          <Reveal direction="up" delay={0.2}>
            <h2 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight text-white uppercase">
              Everything You Need to Know
            </h2>
          </Reveal>
          <Reveal direction="up" delay={0.3}>
            <p className="text-sm sm:text-base text-[#8FA3B8]">
              Have more questions? Our Sydney-based support team is available 24/7.
            </p>
          </Reveal>
        </div>

        {/* Accordion list */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <Reveal key={idx} direction="up" delay={0.04 * idx}>
                <div
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden backdrop-blur-xl ${
                    isOpen
                      ? "border-[#008F83]/60 bg-[#08182A] shadow-xl shadow-[#008F83]/5"
                      : "border-white/[0.05] bg-[#08182A]/60 hover:border-white/[0.12] hover:bg-[#08182A]/90"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    aria-expanded={isOpen}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-heading font-semibold text-sm sm:text-base text-white select-none focus:outline-none"
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        isOpen ? "bg-[#00A99D]" : "bg-[#64788D]"
                      }`} />
                      {faq.question}
                    </span>
                    <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isOpen
                        ? "border-[#008F83] bg-[#008F83]/20 text-[#00A99D]"
                        : "border-white/[0.08] bg-[#071526] text-[#8FA3B8]"
                    }`}>
                      {isOpen ? (
                        <Minus className="w-3.5 h-3.5" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-[#8FA3B8] leading-relaxed border-t border-white/[0.04] pt-3 font-sans">
                      {faq.answer}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
