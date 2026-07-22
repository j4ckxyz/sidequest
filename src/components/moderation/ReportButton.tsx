import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthProvider';
import { useToast } from '../../context/ToastProvider';
import { useCreateReport } from '../../hooks/useModeration';
import { cx } from '../../lib/utils';

const REASONS = ['Scam or fraud', 'Spam or advertising', 'Off-platform payment', 'Harassment or abuse', 'Something else'];

export function ReportButton({
  targetType,
  targetId,
  label,
  className,
}: {
  targetType: 'job' | 'user';
  targetId: string;
  label: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const createReport = useCreateReport();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');

  if (!user) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const full = [reason, detail.trim()].filter(Boolean).join(' — ');
    if (!full) return;
    createReport.mutate(
      { reporter_id: user!.id, target_type: targetType, target_id: targetId, reason: full },
      {
        onSuccess: () => {
          showToast('Thanks — our AI moderator is reviewing this now.');
          setOpen(false);
          setReason('');
          setDetail('');
        },
        onError: (err) => showToast(err instanceof Error ? err.message : 'Could not send report.', 'error'),
      },
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cx('inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-danger', className)}
      >
        <Flag size={14} /> Report
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Report this ${targetType}`}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Reporting <span className="font-medium text-text">{label}</span>. Our AI moderator reviews every report against the community
            rules and a human admin can step in — thanks for keeping SideQuest safe.
          </p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={cx(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  reason === r ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted hover:text-text',
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Add any detail that helps (optional)…"
          />
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createReport.isPending} disabled={!reason && !detail.trim()}>
              Submit report
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
