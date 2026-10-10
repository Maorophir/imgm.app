/**
 * Reset password — Route: /reset-password?token=…
 *
 * Where the email's link lands. Better Auth checks the link first and sends the
 * player here with ?token=… (valid) or ?error=INVALID_TOKEN (expired or used).
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authClient } from '../lib/authClient';
import AuthCard, { ErrorBox, buttonClass, inputClass } from '../components/AuthCard';
import PasswordChecklist from '../components/PasswordChecklist';
import { passwordProblems } from '../lib/passwordRules';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token || searchParams.get('error')) {
    return (
      <AuthCard title="This link has expired" subtitle="Reset links work for 1 hour and only once.">
        <Link to="/forgot-password" className={`${buttonClass} block text-center`}>Send a new link</Link>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Password changed" subtitle="You're all set. For your safety, other devices were logged out.">
        <Link to="/login" className={`${buttonClass} block text-center`}>Log in</Link>
      </AuthCard>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const [weak] = passwordProblems(password);
    if (weak) return setError(weak);
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);
    if (error) setError(error.message || "Couldn't change the password. The link may have expired.");
    else setDone(true);
  };

  return (
    <AuthCard title="Choose a new password">
      {error && <ErrorBox>{error}</ErrorBox>}
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="new-password" className="block text-sm font-semibold text-slate-300 mb-1">New password</label>
          <input id="new-password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          <PasswordChecklist password={password} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-300 mb-1">Repeat it</label>
          <input id="confirm-password" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
        </div>
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? 'Saving...' : 'Save new password'}
        </button>
      </form>
    </AuthCard>
  );
}

export default ResetPassword;
