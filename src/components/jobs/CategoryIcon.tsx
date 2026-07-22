import {
  Sprout,
  ShoppingBasket,
  Sparkles,
  Truck,
  PawPrint,
  HeartHandshake,
  Wrench,
  Laptop,
  Baby,
  Package,
  GraduationCap,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Sprout,
  ShoppingBasket,
  Sparkles,
  Truck,
  PawPrint,
  HeartHandshake,
  Wrench,
  Laptop,
  Baby,
  Package,
  GraduationCap,
  MoreHorizontal,
};

export function CategoryIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICONS[name] ?? MoreHorizontal;
  return <Icon size={size} className={className} />;
}
