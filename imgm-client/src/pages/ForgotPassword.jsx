/**
 * Forgot password — Route: /forgot-password
 *
 * The player enters their email; if it has an account, Better Auth emails a link to
 * /reset-password that works for 1 hour. The reply is the same either way, so this
 * page can't be used to find out who is registered.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '../lib/authClient';
import AuthCard, { ErrorBox, buttonClass, inputClass } from '../components/AuthCard';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`, // where the email's link lands
    });
    setLoading(false);
    if (error) setError(error.message || "Couldn't send the email. Please try again in a minute.");
    else setSent(true);
  };

  if (sent) {
    return (
      <AuthCard title="Check your inbox">
        <div className="space-y-4 text-slate-300 leading-relaxed">
          <p>
            If an account with <span className="text-white font-semibold">{email}</span> exists, we sent it a link to
            choose a new password. The link works for 1 hour.
          </p>
          <p className="text-sm text-slate-400">
            Signed up with Google? There's no password to reset: just use Continue with Google on the login page.
          </p>
          <Link to="/login" className={`${buttonClass} block text-center mt-6`}>
            Back to login
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a link to choose a new one.">
      {error && <ErrorBox>{error}</ErrorBox>}
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-semibold text-slate-300 mb-1">Email Address</label>
          <input
            id="reset-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-400">
        Remembered it?{' '}
        <Link to="/login" className="text-white hover:text-brand font-semibold underline underline-offset-4">Log in</Link>
      </p>
    </AuthCard>
  );
}

export default ForgotPassword;
