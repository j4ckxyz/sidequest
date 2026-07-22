import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImagePlus, X, MapPin, Repeat } from 'lucide-react';
import { BUDGET_TYPES, JOB_CATEGORIES, PARISHES, RECURRENCE_OPTIONS } from '../../lib/constants';
import { Input, Label, FieldError } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { Job } from '../../types/models';

// Jersey bounding box — a dropped pin must fall on the island.
const JERSEY = { latMin: 49.15, latMax: 49.27, lngMin: -2.27, lngMax: -1.99 };
const inJersey = (lat: number, lng: number) =>
  lat >= JERSEY.latMin && lat <= JERSEY.latMax && lng >= JERSEY.lngMin && lng <= JERSEY.lngMax;

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
    date_needed: z.string().optional(),
    slots: z.string().optional(),
    is_flexible_date: z.boolean(),
    is_recurring: z.boolean(),
    recurrence: z.string().optional(),
  })
  .refine((data) => data.budget_type === 'negotiable' || (data.budget_amount && Number(data.budget_amount) > 0), {
    message: 'Add an amount, or switch to negotiable',
    path: ['budget_amount'],
  })
  .refine((data) => data.is_flexible_date || (data.date_needed && data.date_needed.length > 0), {
    message: 'Pick a date, or tick “flexible”',
    path: ['date_needed'],
  })
  .refine((data) => !data.is_recurring || (data.recurrence && data.recurrence.length > 0), {
    message: 'How often does it repeat?',
    path: ['recurrence'],
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
  date_needed: string | null;
  slots: number;
  is_flexible_date: boolean;
  is_recurring: boolean;
  recurrence: string | null;
  location_lat: number | null;
  location_lng: number | null;
  photos: string[];
}

export function JobForm({
  defaultValues,
  defaultPhotos = [],
  defaultLocation = null,
  onSubmit,
  submitLabel = 'Post job',
  isSubmitting,
}: {
  defaultValues?: Partial<JobFormValues>;
  defaultPhotos?: string[];
  defaultLocation?: { lat: number; lng: number } | null;
  onSubmit: (values: JobFormSubmitValues) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}) {
  const [photos, setPhotos] = useState<string[]>(defaultPhotos);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(defaultLocation);
  const [locState, setLocState] = useState<'idle' | 'locating' | 'error'>('idle');
  const [locError, setLocError] = useState<string | null>(null);
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
      slots: '1',
      is_flexible_date: false,
      is_recurring: false,
      recurrence: '',
      ...defaultValues,
    },
  });

  const budgetType = watch('budget_type');
  const flexible = watch('is_flexible_date');
  const recurring = watch('is_recurring');

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

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocError('Your device doesn’t support location.');
      return;
    }
    setLocState('locating');
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!inJersey(lat, lng)) {
          setLocState('error');
          setLocError('That doesn’t look like Jersey — pin not set. Pick a parish instead.');
          return;
        }
        setLoc({ lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) });
        setLocState('idle');
      },
      () => {
        setLocState('error');
        setLocError('Couldn’t get your location — check permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
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
      date_needed: values.is_flexible_date ? null : values.date_needed || null,
      slots: values.slots ? Math.max(1, Math.min(20, Math.round(Number(values.slots)))) : 1,
      is_flexible_date: values.is_flexible_date,
      is_recurring: values.is_recurring,
      recurrence: values.is_recurring ? values.recurrence || null : null,
      location_lat: loc?.lat ?? null,
      location_lng: loc?.lng ?? null,
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

      {/* Optional precise pin */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-text">Pin the spot (optional)</p>
              <p className="text-xs text-text-muted">
                {loc ? `Pinned: ${loc.lat}, ${loc.lng}` : 'Drop your current location for a more precise map. Only a rough area is shown publicly.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {loc && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setLoc(null)}>
                Clear
              </Button>
            )}
            <Button type="button" variant="secondary" size="sm" isLoading={locState === 'locating'} onClick={useMyLocation}>
              Use my location
            </Button>
          </div>
        </div>
        {locError && <p className="mt-2 text-xs text-danger">{locError}</p>}
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

      <div>
        <Label htmlFor="slots" hint="Most jobs need 1">
          How many people do you need?
        </Label>
        <Input id="slots" type="number" min={1} max={20} step={1} {...register('slots')} className="sm:w-40" />
        <p className="mt-1.5 text-xs text-text-muted">Once this many people accept, the rest are turned down and the job closes.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
        <div>
          <Label htmlFor="date_needed" hint={flexible ? 'Not needed' : undefined}>
            When do you need it done?
          </Label>
          <Input id="date_needed" type="date" disabled={flexible} {...register('date_needed')} error={errors.date_needed?.message} />
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

      {/* Recurring */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <Controller
          control={control}
          name="is_recurring"
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 rounded border-border accent-primary" />
              <Repeat size={15} className="text-primary" />
              This is a recurring job
            </label>
          )}
        />
        {recurring && (
          <div className="mt-3">
            <Label htmlFor="recurrence">How often?</Label>
            <Select id="recurrence" {...register('recurrence')} className="sm:w-56" error={errors.recurrence?.message}>
              <option value="">Choose…</option>
              {RECURRENCE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            <FieldError message={errors.recurrence?.message} />
          </div>
        )}
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
                className="absolute right-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-text/60 text-canvas"
                aria-label="Remove photo"
              >
                <X size={14} />
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
