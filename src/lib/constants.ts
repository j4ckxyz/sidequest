export const PARISHES = [
  'St Helier',
  'St Saviour',
  'St Clement',
  'Grouville',
  'St Martin',
  'Trinity',
  'St John',
  'St Mary',
  'St Ouen',
  'St Peter',
  'St Brelade',
  'St Lawrence',
] as const;

export type Parish = (typeof PARISHES)[number];

export interface JobCategory {
  slug: string;
  label: string;
  /** Lucide icon component name. */
  icon: string;
}

export const JOB_CATEGORIES: JobCategory[] = [
  { slug: 'gardening', label: 'Gardening', icon: 'Sprout' },
  { slug: 'shopping-errands', label: 'Shopping & Errands', icon: 'ShoppingBasket' },
  { slug: 'cleaning', label: 'Cleaning', icon: 'Sparkles' },
  { slug: 'moving-help', label: 'Moving Help', icon: 'Truck' },
  { slug: 'pet-care', label: 'Pet Care', icon: 'PawPrint' },
  { slug: 'elderly-help', label: 'Elderly Help', icon: 'HeartHandshake' },
  { slug: 'handyman', label: 'Handyman', icon: 'Wrench' },
  { slug: 'tech-help', label: 'Tech Help', icon: 'Laptop' },
  { slug: 'childcare', label: 'Childcare', icon: 'Baby' },
  { slug: 'delivery', label: 'Delivery', icon: 'Package' },
  { slug: 'tutoring', label: 'Tutoring', icon: 'GraduationCap' },
  { slug: 'other', label: 'Other', icon: 'MoreHorizontal' },
];

export const SKILL_OPTIONS = [
  'Gardening',
  'Driving',
  'Tech help',
  'Cleaning',
  'Cooking',
  'Childcare',
  'Pet care',
  'Handyman',
  'Tutoring',
  'Heavy lifting',
] as const;

export const BUDGET_TYPES = ['fixed', 'hourly', 'negotiable'] as const;
export type BudgetType = (typeof BUDGET_TYPES)[number];

export const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export function recurrenceLabel(value: string | null): string | null {
  if (!value) return null;
  return RECURRENCE_OPTIONS.find((r) => r.value === value)?.label ?? value;
}

export const JOB_STATUSES = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const APPLICATION_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Not this time',
  withdrawn: 'Withdrawn',
};
