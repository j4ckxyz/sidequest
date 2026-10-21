import { Input, Label, FieldError } from '../ui/Input';
import { MIN_PASSWORD_LENGTH, passwordStrength } from '../../lib/authFlow';
import { cx } from '../../lib/utils';

const barTone = ['bg-border', 'bg-danger', 'bg-primary/60', 'bg-primary'] as const;

/** New-password + confirm pair with a strength hint, shared by sign-up and reset. */
export function PasswordFields({
  password,
  confirm,
  onPassword,
  onConfirm,
  confirmError,
}: {
  password: string;
  confirm: string;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  confirmError?: string;
}) {
  const strength = passwordStrength(password);
  return (
    <>
      <div>
        <Label htmlFor="password" hint={`${MIN_PASSWORD_LENGTH}+ characters`}>
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(e) => onPassword(e.target.value)}
        />
        {password && (
          <div className="mt-2" aria-live="polite">
            <div className="flex gap-1" aria-hidden>
              {[1, 2, 3].map((step) => (
                <span key={step} className={cx('h-1 flex-1 rounded-full', strength.score >= step ? barTone[strength.score] : 'bg-border')} />
              ))}
            </div>
            <p className="mt-1 text-xs text-text-muted">{strength.label}</p>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => onConfirm(e.target.value)}
          error={confirmError}
        />
        <FieldError message={confirmError} />
      </div>
    </>
  );
}
