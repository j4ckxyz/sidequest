import { useState } from 'react';
import { StarRatingInput } from '../ui/StarRating';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Label } from '../ui/Input';

export function ReviewForm({ revieweeName, onSubmit, isSubmitting }: { revieweeName: string; onSubmit: (rating: number, comment: string) => void; isSubmitting?: boolean }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(rating, comment);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <Label>How was it, working with {revieweeName}?</Label>
        <StarRatingInput value={rating} onChange={setRating} />
      </div>
      <div>
        <Label htmlFor="review-comment" hint="Optional">
          Leave a note
        </Label>
        <Textarea id="review-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What went well?" />
      </div>
      <Button type="submit" isLoading={isSubmitting} className="self-end">
        Submit review
      </Button>
    </form>
  );
}
