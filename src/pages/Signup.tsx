import { Navigate } from 'react-router-dom';

// Sign-up and sign-in are now one Google flow — keep the old /signup path working by
// sending it to the single auth page.
export function Signup() {
  return <Navigate to="/login" replace />;
}
