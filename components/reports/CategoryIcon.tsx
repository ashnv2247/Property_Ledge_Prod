import React from 'react';
import {
  Building2,
  Landmark,
  Home,
  TrendingDown,
  Shield,
  Percent,
  FileText,
  UserCheck,
  Wrench,
  FileSpreadsheet,
  Droplets,
  MoreHorizontal,
  Scale,
  Tag,
  Receipt,
  LucideIcon,
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  building: Building2,
  landmark: Landmark,
  home: Home,
  'trending-down': TrendingDown,
  shield: Shield,
  percent: Percent,
  'file-text': FileText,
  'user-check': UserCheck,
  wrench: Wrench,
  'file-spreadsheet': FileSpreadsheet,
  droplets: Droplets,
  'more-horizontal': MoreHorizontal,
  scale: Scale,
  tag: Tag,
  calculator: Receipt,
};

export function CategoryIcon({ name, className = 'w-4 h-4' }: CategoryIconProps) {
  const IconComponent = ICON_MAP[name] || Tag;
  return <IconComponent className={className} aria-hidden="true" />;
}
