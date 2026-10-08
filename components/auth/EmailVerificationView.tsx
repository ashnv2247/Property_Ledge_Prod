"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, CheckCircle2, RefreshCw, ArrowLeft, Loader2 } from "lucide-react";

interface EmailVerificationViewProps {
  targetEmail?: string;
}

export function EmailVerificationView({ targetEmail }: EmailVerificationViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = targetEmail || searchParams?.get("email") || "sarah.williams@propertyledge.com.au";

  const [cooldown, setCooldown] = useState(42);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setResendSuccess(false);

    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsResending(false);
    setResendSuccess(true);
    setCooldown(45);
  };

  const handleSimulateVerification = async () => {
    setIsVerifying(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    router.push("/onboarding");
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 text-left">
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-[#008F83]/15 text-[#008F83] dark:text-[#00A99D] border border-[#008F83]/30 flex items-center justify-center shadow-sm">
        <Mail className="w-7 h-7" />
      </div>

      {/* Heading & Target Email Container */}
      <div className="space-y-2">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#008F83]/15 border border-[#008F83]/30 text-[11px] font-mono tracking-widest text-[#008F83] dark:text-[#00A99D] font-bold uppercase">
          VERIFICATION SENT
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Check your email
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          We&apos;ve sent a secure verification link to your email address:
        </p>

        {/* User Email Highlight Container */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#08182A] border border-slate-200 dark:border-white/[0.08] text-sm font-semibold text-slate-900 dark:text-white font-mono shadow-sm inline-block">
          {email}
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Please open your inbox and click the verification link to confirm your email address and activate your PropertyLedge workspace.
      </p>

      {/* Instant Verification Button */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleSimulateVerification}
          disabled={isVerifying}
          className="w-full h-14 bg-[#008F83] hover:bg-[#00A99D] text-white font-semibold text-base rounded-xl active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2.5 shadow-md shadow-[#008F83]/15 disabled:opacity-60"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Verifying account...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>I&apos;ve verified my email &rarr;</span>
            </>
          )}
        </button>

        {/* Resend Action with Cooldown Timer */}
        <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
          {resendSuccess && (
            <div className="mb-2 text-xs text-emerald-600 font-semibold">
              ✓ Verification email has been resent to your inbox.
            </div>
          )}

          <div>
            Didn&apos;t receive the email?{" "}
            {cooldown > 0 ? (
              <span className="text-slate-900 dark:text-white font-mono font-medium ml-1">
                Resend available in {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-[#008F83] dark:text-[#00A99D] font-bold hover:underline transition-colors ml-1 inline-flex items-center gap-1 disabled:opacity-50"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Resend verification email"
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alternative actions */}
      <div className="pt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/[0.08]">
        <Link
          href="/signup"
          className="hover:text-slate-900 dark:hover:text-white transition-colors inline-flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#008F83] dark:text-[#00A99D]" /> Change email
        </Link>
        <Link
          href="/login"
          className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
