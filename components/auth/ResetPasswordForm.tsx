"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { resetPasswordAction } from "@/lib/auth/actions";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

export function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetPasswordAction(newPassword);

      if (!res.success) {
        setErrorMessage(res.error || "Unable to update password. Please try requesting a new reset link.");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      setErrorMessage("A network error occurred while updating your password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-300 text-left">
        <div className="w-12 h-12 rounded-2xl bg-[#008F83]/15 text-[#00A99D] border border-[#008F83]/30 flex items-center justify-center shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-[#00A99D]" />
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Password updated
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Your password has been updated successfully. You can now sign in with your new credentials.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="w-full h-14 bg-[#008F83] hover:bg-[#00A99D] text-white font-semibold text-base rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-[#008F83]/15 group"
          >
            <span>Continue to login</span>
            <ArrowRight className="w-5 h-5 text-white transition-transform duration-200 group-hover:translate-x-1" />
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
          NEW PASSWORD
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create a new password
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose a secure, strong password for your PropertyLedge account.
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
        {/* New Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="new-password"
            className="block text-xs font-semibold text-slate-900 dark:text-white tracking-wide"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="new-password"
              name="newPassword"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full h-12 pl-10 pr-10 rounded-xl bg-white dark:bg-[#08182A] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/20 transition-all duration-150 shadow-sm"
            />
            <Lock className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 rounded"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-slate-400 dark:text-slate-400" />
              ) : (
                <Eye className="w-4 h-4 text-slate-400 dark:text-slate-400" />
              )}
            </button>
          </div>

          <PasswordStrengthMeter password={newPassword} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirm-password"
            className="block text-xs font-semibold text-slate-900 dark:text-white tracking-wide"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              className="w-full h-12 pl-10 pr-10 rounded-xl bg-white dark:bg-[#08182A] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/20 transition-all duration-150 shadow-sm"
            />
            <Lock className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 rounded"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4 text-slate-400 dark:text-slate-400" />
              ) : (
                <Eye className="w-4 h-4 text-slate-400 dark:text-slate-400" />
              )}
            </button>
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
                <span>Updating password...</span>
              </>
            ) : (
              <>
                <span>Update Password</span>
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
          className="text-slate-900 dark:text-white font-semibold hover:text-[#008F83] dark:hover:text-[#00A99D] transition-colors inline-flex items-center gap-1"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
