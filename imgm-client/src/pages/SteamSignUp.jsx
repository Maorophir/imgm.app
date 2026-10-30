/**
 * Signing up with Steam, the email step — Route: /signup/steam
 *
 * Steam sends a new player here after its own sign-in page: Steam says which Steam
 * account it is, but shares no email, so this page asks for one. The server keeps the
 * Steam account for 30 minutes, for this browser only (GET /api/auth/steam/sign-up/
 * pending says whether it still is). The email makes the account with Steam connected
 * and logs in; like an email sign-up, it's confirmed later from the welcome email, so
 * the player goes straight on to choosing a gamer tag (/welcome), then to ?redirect.
 *
 * Gone (it ran out, was used, or began in another browser): the way to start again.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { finishSteamSignUp, getSteamSignUpPending, startSteamSignUp } from '../lib/api';
import { safeRedirect } from '../lib/safeRedirect';
import { goToSteam, steamStartError } from '../lib/steam';
import { TEXT_LINK } from '../lib/ui';
import AuthCard, { ErrorBox, buttonClass, inputClass } from '../components/AuthCard';

// The server's answers that mean "you already have a way in": a link to log in with it
const LOG_IN_INSTEAD = ['EMAIL_TAKEN', 'STEAM_TAKEN', 'STEAM_SIGN_UP_CLASH'];

function SteamSignUp() {
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));
  const navigate = useNavigate();
  const { refetch: refreshSession } = useSession();
  const [pending, setPending] = useState(null); // null while asking, then true / false
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState(null); // { code, text }

  useEffect(() => {
    const controller = new AbortController();
    getSteamSignUpPending(controller.signal)
      .then(({ pending }) => setPending(pending))
      .catch((error) => error.name !== 'AbortError' && setPending(false));
    return () => controller.abort();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setProblem(null);
    setLoading(true);
    try {
      const { returnTo } = await finishSteamSignUp(email);
      // Wait for the login to register (or the next page would think they're logged
      // out), then on to choosing a gamer tag, and to where they were going
      await refreshSession();
      navigate(`/welcome?redirect=${encodeURIComponent(safeRedirect(returnTo))}`, { replace: true });
    } catch (error) {
      setLoading(false);
      const code = error?.data?.code ?? null;
      if (code === 'STEAM_SIGN_UP_EXPIRED') return setPending(false);
      setProblem({ code, text: error?.data?.message || "Couldn't create your account. Please try again." });
    }
  };

  // Gone: back to Steam for a new one (the button stays busy until the page is gone)
  const startAgain = async () => {
    setProblem(null);
    setLoading(true);
    try {
      goToSteam(await startSteamSignUp(redirectTo));
    } catch (error) {
      setLoading(false);
      setProblem({ code: null, text: steamStartError(error) });
    }
  };

  if (pending === null) return <AuthCard title="Almost there" />;

  if (!pending) {
    return (
      <AuthCard title="Let's try that again">
        {problem && <ErrorBox>{problem.text}</ErrorBox>}
        <p className="text-slate-300 leading-relaxed">
          Signing up with Steam waits 30 minutes for your email, in the browser you started in. This one has run out,
          so go through Steam once more.
        </p>
        <button type="button" onClick={startAgain} disabled={loading} className={`${buttonClass} mt-6`}>
          {loading ? 'Opening Steam…' : 'Sign up with Steam'}
        </button>
        <p className="mt-8 text-center text-sm text-slate-400">
          Rather use your email?{' '}
          <Link to="/login?mode=signup" className={`font-medium text-white ${TEXT_LINK}`}>Sign up</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Almost there" subtitle="Steam is connected. It doesn't share your email, so add one for your IMGM account.">
      {problem && (
        <ErrorBox>
          {problem.text}
          {LOG_IN_INSTEAD.includes(problem.code) && (
            <>
              {' '}
              <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`} className={`font-medium text-white ${TEXT_LINK}`}>Log in</Link>
            </>
          )}
        </ErrorBox>
      )}
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="steam-email" className="block text-sm font-medium text-white mb-1.5">Email address</label>
          <input
            id="steam-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
          <p className="mt-2 text-sm text-slate-400">We'll send a link to confirm it. You can start rating right away.</p>
        </div>
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? 'Creating your account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">
        By continuing, you agree to IMGM's{' '}
        <Link to="/terms" className={`text-slate-300 ${TEXT_LINK}`}>Terms of Use</Link> and{' '}
        <Link to="/privacy" className={`text-slate-300 ${TEXT_LINK}`}>Privacy Policy</Link>.
      </p>
    </AuthCard>
  );
}

export default SteamSignUp;
