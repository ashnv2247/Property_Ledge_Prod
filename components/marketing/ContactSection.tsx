"use client";

import React from "react";
import ContactWithGlobe from "@/components/ui/contact-with-globe";
import { Mail, Phone, Headphones } from "lucide-react";

export function ContactSection() {
  const propertyLedgeContactLinks = [
    {
      icon: Mail,
      label: "support@propertyledge.com.au",
      href: "mailto:support@propertyledge.com.au",
    },
    {
      icon: Phone,
      label: "+61 1300 000 753",
      href: "tel:+611300000753",
    },
    {
      icon: Headphones,
      label: "sales@propertyledge.com.au",
      href: "mailto:sales@propertyledge.com.au",
    },
  ];

  return (
    <div id="contact" className="w-full">
      <ContactWithGlobe
        title="Get in touch with PropertyLedge"
        subtitle="Contact Us"
        description="Whether you have questions about onboarding, pricing, or portfolio management across Australia, our team is here to help."
        contactLinks={propertyLedgeContactLinks}
      />
    </div>
  );
}
