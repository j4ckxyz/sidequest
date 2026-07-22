import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImagePlus, X } from 'lucide-react';
import { BUDGET_TYPES, JOB_CATEGORIES, PARISHES } from '../../lib/constants';
import { Input, Label, FieldError } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { Job } from '../../types/models';

const schema = z
  .object({
    title: z.string().min(4, 'Give it a bit more detail').max(80, '80 characters max'),
    description: z.string().min(20, 'A few more words will help people know what to expect'),
    category: z.string().min(1, 'Pick a category'),
    parish: z.string().min(1, 'Pick a parish'),
    location_detail: z.string().max(80).optional(),
    budget_type: z.enum(BUDGET_TYPES),
    budget_amount: z.string().optional(),
    estimated_hours: z.string().optional(),
    date_needed: z.string().min(1, 'When do you need this done?'),
    is_flexible_date: z.boolean(),
  })
  .refine((data) => data.budget_type === 'negotiable' || (data.budget_amount && Number(data.budget_amount) > 0), {
    message: 'Add an amount, or switch to negotiable',
    path: ['budget_amount'],
  });

export type JobFormValues = z.infer<typeof schema>;

export interface JobFormSubmitValues {
  title: string;
  description: string;
  category: string;
  parish: Job['parish'];
  location_detail: string | null;
  budget_type: Job['budget_type'];
  budget_amount: number | null;
  estimated_hours: number | null;
  date_needed: string;
  is_flexible_date: boolean;
  photos: string[];
}

export function JobForm({
  defaultValues,
  defaultPhotos = [],
  onSubmit,
  submitLabel = 'Post job',
  isSubmitting,
}: {
  defaultValues?: Partial<JobFormValues>;
  defaultPhotos?: string[];
  onSubmit: (values: JobFormSubmitValues) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}) {
  const [photos, setPhotos] = useState<string[]>(defaultPhotos);
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      parish: '',
      location_detail: '',
      budget_type: 'fixed',
      budget_amount: '',
      estimated_hours: '',
      date_needed: '',
      is_flexible_date: false,
      ...defaultValues,
    },
  });

  const budgetType = watch('budget_type');

  function addPhotos(files: FileList | null) {
    if (!files) return;
    Array.from(files)
      .slice(0, 4 - photos.length)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => setPhotos((prev) => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
  }

  const submit = handleSubmit((values) => {
    onSubmit({
      title: values.title,
      description: values.description,
      category: values.category,
      parish: values.parish as Job['parish'],
      location_detail: values.location_detail || null,
      budget_type: values.budget_type,
      budget_amount: values.budget_type === 'negotiable' ? null : Number(values.budget_amount),
      estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : null,
      date_needed: values.date_needed,
      is_flexible_date: values.is_flexible_date,
      photos,
    });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Label htmlFor="title">What needs doing?</Label>
        <Input id="title" {...register('title')} placeholder="e.g. Mow the lawn and tidy the borders" error={errors.title?.message} />
        <FieldError message={errors.title?.message} />
      </div>

      <div>
        <Label htmlFor="description">Details</Label>
        <Textarea id="description" {...register('description')} rows={4} placeholder="What exactly needs doing, and anything useful to know before someone applies." error={errors.description?.message} />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select id="category" {...register('category')} error={errors.category?.message}>
            <option value="">Choose one…</option>
            {JOB_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </Select>
          <FieldError message={errors.category?.message} />
        </div>
        <div>
          <Label htmlFor="parish">Parish</Label>
          <Select id="parish" {...register('parish')} error={errors.parish?.message}>
            <option value="">Choose one…</option>
            {PARISHES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <FieldError message={errors.parish?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="location_detail" hint="Optional">
          Area or street hint
        </Label>
        <Input id="location_detail" {...register('location_detail')} placeholder="e.g. Near Gorey Pier — exact address shared once you hire someone" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="budget_type">Budget</Label>
          <Select id="budget_type" {...register('budget_type')}>
            {BUDGET_TYPES.map((b) => (
              <option key={b} value={b}>
                {b === 'fixed' ? 'Fixed price' : b === 'hourly' ? 'Hourly rate' : 'Negotiable'}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="budget_amount" hint={budgetType === 'negotiable' ? 'Not needed' : '£ GBP'}>
            Amount
          </Label>
          <Input
            id="budget_amount"
            type="number"
            min={0}
            step={0.5}
            disabled={budgetType === 'negotiable'}
            {...register('budget_amount')}
            error={errors.budget_amount?.message}
          />
          <FieldError message={errors.budget_amount?.message} />
        </div>
        <div>
          <Label htmlFor="estimated_hours" hint="Optional">
            Est. hours
          </Label>
          <Input id="estimated_hours" type="number" min={0} step={0.5} {...register('estimated_hours')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
        <div>
          <Label htmlFor="date_needed">When do you need it done?</Label>
          <Input id="date_needed" type="date" {...register('date_needed')} error={errors.date_needed?.message} />
          <FieldError message={errors.date_needed?.message} />
        </div>
        <Controller
          control={control}
          name="is_flexible_date"
          render={({ field }) => (
            <label className="flex h-11 items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 rounded border-border accent-primary" />
              I'm flexible on the exact date
            </label>
          )}
        />
      </div>

      <div>
        <Label hint="Optional, up to 4">Photos</Label>
        <div className="flex flex-wrap gap-3">
          {photos.map((src, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 rounded-full bg-text/60 p-0.5 text-canvas"
                aria-label="Remove photo"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {photos.length < 4 && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-text-muted hover:border-primary/40 hover:text-primary">
              <ImagePlus size={18} />
              <span className="text-xs">Add</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
            </label>
          )}
        </div>
      </div>

      <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2 self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
