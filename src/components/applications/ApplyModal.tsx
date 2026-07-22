import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { Input, Label } from '../ui/Input';
import { Button } from '../ui/Button';
import { useCreateApplication } from '../../hooks/useApplications';
import { useToast } from '../../context/ToastProvider';
import type { Job } from '../../types/models';

export function ApplyModal({ job, questerId, open, onClose }: { job: Job; questerId: string; open: boolean; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('');
  const { mutate, isPending } = useCreateApplication();
  const { showToast } = useToast();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { job_id: job.id, quester_id: questerId, message, proposed_amount: amount ? Number(amount) : null },
      {
        onSuccess: () => {
          showToast('Application sent — the poster can now message you.');
          setMessage('');
          setAmount('');
          onClose();
        },
        onError: (err) => showToast(err instanceof Error ? err.message : 'Could not apply.', 'error'),
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={`Apply: ${job.title}`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="apply-message">Message to {job.parish} poster</Label>
          <Textarea
            id="apply-message"
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself and say when you're free…"
          />
        </div>
        {job.budget_type !== 'fixed' && (
          <div>
            <Label htmlFor="apply-amount" hint="Optional">
              Your proposed rate (£)
            </Label>
            <Input id="apply-amount" type="number" min={0} step={0.5} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        )}
        <Button type="submit" isLoading={isPending} className="self-end">
          Send application
        </Button>
      </form>
    </Modal>
  );
}
