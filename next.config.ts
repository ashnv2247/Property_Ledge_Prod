import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@playwright/test', 'playwright', 'playwright-core', 'pdf-lib', 'docx', 'jspdf'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      { source: '/admin/organizations', destination: '/admin', permanent: false },
      { source: '/admin/organizations/:path*', destination: '/admin', permanent: false },
      { source: '/admin/workspaces', destination: '/admin', permanent: false },
      { source: '/admin/workspaces/:path*', destination: '/admin', permanent: false },
      { source: '/admin/properties', destination: '/admin', permanent: false },
      { source: '/admin/properties/:path*', destination: '/admin', permanent: false },
      { source: '/dashboard/tenants', destination: '/dashboard/people', permanent: false },
      { source: '/dashboard/tenants/:path*', destination: '/dashboard/people/:path*', permanent: false },
      { source: '/dashboard/payments', destination: '/dashboard/money?tab=payments', permanent: false },
      { source: '/dashboard/payments/:path*', destination: '/dashboard/money/:path*', permanent: false },
      { source: '/dashboard/financials', destination: '/dashboard/money', permanent: false },
      { source: '/dashboard/overview', destination: '/dashboard', permanent: false },

      { source: '/onboarding/profile', destination: '/onboarding/workspace', permanent: false },
      { source: '/onboarding/units', destination: '/dashboard/units', permanent: false },
      { source: '/onboarding/tenants', destination: '/dashboard/people', permanent: false },
      { source: '/onboarding/leases', destination: '/dashboard/leases', permanent: false },
      { source: '/onboarding/team', destination: '/onboarding/complete', permanent: false },
      { source: '/leases', destination: '/dashboard/leases', permanent: false },
      { source: '/leases/:path*', destination: '/dashboard/leases/:path*', permanent: false },
      { source: '/properties', destination: '/dashboard/properties', permanent: false },
      { source: '/properties/:path*', destination: '/dashboard/properties/:path*', permanent: false },
      { source: '/expenses', destination: '/dashboard/expenses', permanent: false },
      { source: '/expenses/:path*', destination: '/dashboard/expenses/:path*', permanent: false },
      { source: '/settings', destination: '/dashboard/settings', permanent: false },
      { source: '/team', destination: '/dashboard/team', permanent: false },
      { source: '/finance/financial-years', destination: '/dashboard/financial-years', permanent: false },
      { source: '/finance/financial-years/:path*', destination: '/dashboard/financial-years/:path*', permanent: false },
      { source: '/finance/accountant-reports', destination: '/dashboard/accountant-reports', permanent: false },
      { source: '/finance/accountant-reports/:path*', destination: '/dashboard/accountant-reports/:path*', permanent: false },
      { source: '/dashboard/finance/financial-years', destination: '/dashboard/financial-years', permanent: false },
      { source: '/dashboard/finance/financial-years/:path*', destination: '/dashboard/financial-years/:path*', permanent: false },
      { source: '/dashboard/finance/accountant-reports', destination: '/dashboard/accountant-reports', permanent: false },
      { source: '/dashboard/finance/accountant-reports/:path*', destination: '/dashboard/accountant-reports/:path*', permanent: false },
      { source: '/autopilot', destination: '/dashboard/autopilot', permanent: false },
      { source: '/autopilot/create', destination: '/dashboard/autopilot/create', permanent: false },
      { source: '/autopilot/manage', destination: '/dashboard/autopilot/manage', permanent: false },
    ];
  },
};

export default nextConfig;
