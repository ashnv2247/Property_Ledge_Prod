import React from 'react';

interface OnboardingStepProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function OnboardingStep({ eyebrow, title, description, children }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {eyebrow && (
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-[#00A99D] bg-[#008F83]/10 px-2 py-0.5 rounded-md border border-[#008F83]/20 cursor-default">
            {eyebrow}
          </span>
        )}
        <h1 className="font-heading text-xl sm:text-2xl lg:text-[26px] font-bold tracking-tight text-[#FFFFFF] leading-[1.25] cursor-default">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-[#8FA3B8] leading-relaxed cursor-default max-w-xl">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

