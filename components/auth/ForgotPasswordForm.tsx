"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { forgotPasswordAction } from "@/lib/auth/actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      await forgotPasswordAction(email);
      setIsSubmitted(true);
    } catch (err) {
      setErrorMessage("Unable to send reset instructions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-300 text-left">
        <div className="w-12 h-12 rounded-2xl bg-[#008F83]/15 text-[#00A99D] border border-[#008F83]/30 flex items-center justify-center shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-[#00A99D]" />
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Check your inbox
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            If an account exists for{" "}
            <span className="text-slate-900 dark:text-white font-semibold">{email}</span>, we&apos;ve sent secure instructions to reset your password.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#08182A] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-500 dark:text-slate-400 space-y-2 shadow-sm">
          <p className="font-semibold text-slate-900 dark:text-white">Next steps:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click the link inside the email to choose a new password.</li>
            <li>If you don&apos;t see the email in 2 minutes, check your spam or junk folder.</li>
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href={`/reset-password?email=${encodeURIComponent(email)}`}
            className="w-full h-12 bg-[#008F83] hover:bg-[#00A99D] text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-[#008F83]/15"
          >
            <span>Enter New Password</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </Link>

          <Link
            href="/login"
            className="w-full h-12 bg-white dark:bg-[#08182A] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-[#0B1D30] font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 dark:text-slate-400" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2 text-left">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#008F83]/15 border border-[#008F83]/30 text-[11px] font-mono tracking-widest text-[#008F83] dark:text-[#00A99D] font-bold uppercase">
          RESET PASSWORD
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Reset your password
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter your email and we&apos;ll send you a secure password reset link.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs transition-all duration-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <span className="leading-relaxed font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label
            htmlFor="forgot-email"
            className="block text-xs font-semibold text-slate-900 dark:text-white tracking-wide"
          >
            Email Address
          </label>
          <div className="relative">
            <input
              id="forgot-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com.au"
              className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-white dark:bg-[#08182A] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/20 transition-all duration-150 shadow-sm"
            />
            <Mail className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 bg-[#008F83] hover:bg-[#00A99D] text-white font-semibold text-base rounded-xl hover:shadow-lg active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#008F83]/15"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Sending reset link...</span>
              </>
            ) : (
              <>
                <span>Send reset link</span>
                <ArrowRight className="w-5 h-5 text-white transition-transform duration-200 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Back to Login link */}
      <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/[0.08]">
        <Link
          href="/login"
          className="text-slate-900 dark:text-white font-semibold hover:text-[#008F83] dark:hover:text-[#00A99D] transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#008F83] dark:text-[#00A99D]" /> Back to login
        </Link>
      </div>
    </div>
  );
}
