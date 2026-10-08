"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/marketing/Hero";
import { TrustBar } from "@/components/marketing/TrustBar";
import { PortfolioSection } from "@/components/marketing/PortfolioSection";
import { RentCollectionSection } from "@/components/marketing/RentCollectionSection";
import { FinancialSection } from "@/components/marketing/FinancialSection";
import { InspectionSection } from "@/components/marketing/InspectionSection";
import { LeasingSection } from "@/components/marketing/LeasingSection";
import { AutomationSection } from "@/components/marketing/AutomationSection";
import { Testimonials } from "@/components/marketing/Testimonials";
import { Pricing } from "@/components/marketing/Pricing";
import { FAQ } from "@/components/marketing/FAQ";
import { ContactSection } from "@/components/marketing/ContactSection";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { applyThemeMode } from "@/lib/themeTransition";

export default function Home() {
  useEffect(() => {
    if (typeof document !== "undefined") {
      const stored = localStorage.getItem("propertyledge_theme");
      if (!stored) {
        applyThemeMode("dark");
      }
    }
  }, []);
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <Hero />
      <TrustBar />
      <PortfolioSection />
      <RentCollectionSection />
      <FinancialSection />
      <InspectionSection />
      <LeasingSection />
      <AutomationSection />
      <Testimonials />
      <Pricing />
      <FAQ />
      <ContactSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
