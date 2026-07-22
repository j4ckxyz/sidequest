import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  MapPin,
  GraduationCap,
  Calendar,
  Target,
  ExternalLink,
  FileText,
  Code2,
  Palette,
  Scale,
  FlaskConical,
  Sparkles,
  Check,
} from 'lucide-react'
import type { Student, ProjectKind } from '../lib/types'
import { gradientFor, initialsOf } from '../lib/constants'
import Avatar from './Avatar'

const kindIcon: Record<ProjectKind, typeof FileText> = {
  Dissertation: FileText,
  Codebase: Code2,
  Design: Palette,
  'Case Study': Scale,
  Research: FlaskConical,
}

export default function StudentModal({
  student,
  onClose,
  onRequestInterview,
  onShortlist,
  requested,
}: {
  student: Student | null
  onClose: () => void
  onRequestInterview: (s: Student) => void
  onShortlist: (s: Student) => void
  requested: boolean
}) {
  return (
    <AnimatePresence>
      {student && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-4xl bg-white shadow-float sm:rounded-4xl"
          >
            <div className="relative overflow-hidden px-7 pb-6 pt-8">
              <div
                className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${gradientFor(
                  student.id,
                )} opacity-[0.12]`}
              />
              <button
                onClick={onClose}
                className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink-muted shadow-soft backdrop-blur transition hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="flex items-start gap-4">
                <Avatar
                  initials={initialsOf(student.name)}
                  gradient={gradientFor(student.id)}
                  size="xl"
                  ring
                />
                <div className="pt-1">
                  <h2 className="text-[26px] font-semibold tracking-tight text-ink">
                    {student.name}
                  </h2>
                  {student.headline && (
                    <p className="mt-1 text-[15px] text-ink-muted">{student.headline}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-muted">
                    {student.degree && (
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-sea-500" /> {student.degree}
                      </span>
                    )}
                    {student.university && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-sea-500" /> {student.university}
                      </span>
                    )}
                    {student.graduation_year && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-sea-500" /> Class of{' '}
                        {student.graduation_year}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 px-7 pb-7">
              {(student.seeking || student.availability || student.gpa) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {student.seeking && (
                    <div className="rounded-2xl border border-granite-200 bg-granite-50 p-4">
                      <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                        <Target className="h-3.5 w-3.5" /> Seeking
                      </p>
                      <p className="text-[14px] leading-snug text-ink-soft">
                        {student.seeking}
                      </p>
                    </div>
                  )}
                  {(student.availability || student.gpa) && (
                    <div className="rounded-2xl border border-granite-200 bg-granite-50 p-4">
                      <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                        <Calendar className="h-3.5 w-3.5" /> Availability
                      </p>
                      {student.availability && (
                        <p className="text-[14px] leading-snug text-ink-soft">
                          {student.availability}
                        </p>
                      )}
                      {student.gpa && (
                        <p className="mt-1 text-[13px] font-medium text-emerald-600">
                          {student.gpa}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {student.bio && (
                <p className="text-[15px] leading-relaxed text-ink-muted">{student.bio}</p>
              )}

              {student.skills.length > 0 && (
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {student.skills.map((s) => (
                      <span key={s} className="pill bg-sea-50 text-sea-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                  Portfolio & university work
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] text-white">
                    {student.projects?.length ?? 0}
                  </span>
                </p>
                {student.projects && student.projects.length > 0 ? (
                  <div className="space-y-3">
                    {student.projects.map((p) => {
                      const Icon = kindIcon[p.kind] ?? FileText
                      return (
                        <div
                          key={p.id}
                          className="group rounded-2xl border border-granite-200 bg-white p-4 transition hover:border-sea-300 hover:shadow-soft"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-granite-100 text-ink-soft">
                              <Icon className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-[15px] font-semibold text-ink">
                                  {p.title}
                                </h4>
                                <span className="pill shrink-0 bg-granite-100 text-ink-muted">
                                  {p.kind}
                                </span>
                              </div>
                              {p.summary && (
                                <p className="mt-1 text-[13.5px] leading-snug text-ink-muted">
                                  {p.summary}
                                </p>
                              )}
                              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                {p.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="text-[12px] font-medium text-ink-faint"
                                  >
                                    #{t.replace(/\s+/g, '')}
                                  </span>
                                ))}
                                {p.link && (
                                  <a
                                    href={p.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-sea-600 hover:text-sea-800"
                                  >
                                    {p.link_label ?? 'View'}
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-granite-200 bg-granite-50/50 px-4 py-6 text-center text-[13.5px] text-ink-faint">
                    This student hasn’t added portfolio work yet.
                  </p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center gap-3 border-t border-granite-200 bg-white/85 px-7 py-4 backdrop-blur-xl">
              <button
                onClick={() => onRequestInterview(student)}
                disabled={requested}
                className={`flex-1 py-3 text-[15px] ${
                  requested ? 'btn bg-emerald-500 text-white' : 'btn-accent'
                }`}
              >
                {requested ? (
                  <>
                    <Check className="h-4.5 w-4.5" strokeWidth={3} /> Interview requested
                  </>
                ) : (
                  'Request interview'
                )}
              </button>
              <button
                onClick={() => onShortlist(student)}
                className="btn-ghost py-3 text-[15px]"
              >
                <Sparkles className="h-4 w-4" /> Shortlist
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
