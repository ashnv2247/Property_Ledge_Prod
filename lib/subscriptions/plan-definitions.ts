export interface CanonicalPlanDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  customPrice?: string;
  popular?: boolean;
  propertyLimit: number | 'unlimited';
  features: string[];
  cta: string;
}

export const CANONICAL_PLANS: CanonicalPlanDefinition[] = [
  {
    id: 'landlord',
    slug: 'landlord',
    name: 'Landlord Starter',
    description: 'For private investors & self-managed landlords',
    monthlyPrice: 39,
    annualPrice: 29,
    popular: false,
    propertyLimit: 5,
    features: [
      'Up to 5 properties',
      'Automated PayID & Direct Debit',
      'ATO Tax & BAS Reports',
      'Digital Lease & E-Sign',
      'Standard Email Support',
    ],
    cta: 'Get Started Now',
  },
  {
    id: 'manager',
    slug: 'manager',
    name: 'Portfolio Pro',
    description: 'For growing portfolios & active property managers',
    monthlyPrice: 99,
    annualPrice: 79,
    popular: true,
    propertyLimit: 50,
    features: [
      'Up to 50 properties',
      'Automated Rent Arrears Escalations',
      'Unlimited Routine Inspections (App)',
      'Accountant Read-Only Multi-Access',
      'Automated Bond Lodgement Feeds',
      'Priority 24/7 AU Support',
    ],
    cta: 'Get Started Now',
  },
  {
    id: 'agency',
    slug: 'agency',
    name: 'Agency & Enterprise',
    description: 'For real-estate agencies & institutional portfolios',
    monthlyPrice: null,
    annualPrice: null,
    customPrice: 'Custom',
    popular: false,
    propertyLimit: 'unlimited',
    features: [
      'Unlimited properties & entities',
      'Custom Trust Accounting Integrations',
      'Multi-Agent RBAC & Permissions',
      'Dedicated AU Account Executive',
      'SLA & Custom Migration Assistance',
    ],
    cta: 'Speak with Sales',
  },
];

export function getPlanFeatures(slug: string): string[] {
  const plan = CANONICAL_PLANS.find(
    (p) => p.slug === slug || (slug === 'pro' && p.slug === 'landlord') || (slug === 'business' && p.slug === 'manager')
  );
  return plan?.features || CANONICAL_PLANS[0].features;
}

export function getCanonicalPlan(slug: string): CanonicalPlanDefinition | undefined {
  return CANONICAL_PLANS.find(
    (p) => p.slug === slug || (slug === 'pro' && p.slug === 'landlord') || (slug === 'business' && p.slug === 'manager')
  );
}
