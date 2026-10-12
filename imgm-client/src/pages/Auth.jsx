/**
 * Auth — log in or sign up. Route: /login (?redirect=… brings the player back after).
 *
 * Email and password, or Google (in a popup). New players go on to choose a gamer
 * tag (/welcome). Behind the card, real popular games' covers drift by, dimmed.
 *
 * Noir: a flat card of card stock (no frosted glass), a Big Shoulders heading, the
 * lime "Log in" as the page's one main action, and Google's own dark sign-in button.
 */
import { useState, useEffect } from 'react';
import { signIn, signUp, authClient, useSession } from '../lib/authClient';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getFeaturedGames } from '../lib/api';
import { safeRedirect } from '../lib/safeRedirect';
import { passwordProblems } from '../lib/passwordRules';
import { TEXT_LINK } from '../lib/ui';
import PasswordChecklist from '../components/PasswordChecklist';
import { AUTH_PANEL, AUTH_TITLE, ErrorBox, buttonClass, inputClass } from '../components/AuthCard';

const LABEL_CLASS = 'block text-sm font-medium text-white mb-1.5';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Real popular games for the scrolling background (stays empty if the request fails)
  const [bgGames, setBgGames] = useState([]);
  const navigate = useNavigate();
  const { refetch: refreshSession } = useSession(); // the shared login state every page reads
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));

  useEffect(() => {
    const controller = new AbortController();
    getFeaturedGames(controller.signal)
      .then(setBgGames)
      .catch(() => {}); // background is decorative — a plain dark page is fine
    return () => controller.abort();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn.email({ email, password });
        if (error) throw new Error(error.message || "Failed to log in");
        await refreshSession(); // every page knows about the login before we move on
        navigate(redirectTo);
      } else {
        const [weak] = passwordProblems(password); // the checklist shows them all
        if (weak) throw new Error(weak);
        // Better Auth needs a name; it stays private (the public gamer tag is chosen next)
        // callbackURL: where the welcome email's "Confirm my email" button lands
        const { error } = await signUp.email({ email, password, name: email.split('@')[0], callbackURL: `${window.location.origin}/?verified=1` });
        if (error) throw new Error(error.message || "Failed to sign up");
        // New player: wait for the login to register (or a login-only page would bounce
        // them back here), then straight to choosing a gamer tag, and on to where they were going
        await refreshSession();
        navigate(`/welcome?redirect=${encodeURIComponent(redirectTo)}`, { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { data, error } = await signIn.social({
        provider: "google",
        disableRedirect: true,
        callbackURL: `${window.location.origin}/oauth-success`
      });
      if (error) throw new Error(error.message || "Google auth failed");

      if (data?.url) {
        // Calculate center position for the popup
        const width = 500;
        const height = 600;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        // Open the Google login in a centered popup window
        const popup = window.open(
          data.url,
          "Google Login",
          `width=${width},height=${height},top=${top},left=${left}`
        );

        // Wait for the popup to close
        const checkClosed = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(checkClosed);

            // Only redirect if the user actually signed in successfully
            const { data: sessionData } = await authClient.getSession();
            if (sessionData) {
              window.location.href = redirectTo;
            }
          }
        }, 1000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Split the games into two different rows. Each row is doubled ([A, A]) because the
  // scroll animation moves exactly 50% — when copy 1 has scrolled out, copy 2 sits
  // exactly where copy 1 started, so the loop restarts without a visible jump.
  const half = Math.ceil(bgGames.length / 2);
  const row1 = bgGames.slice(0, half);
  const row2 = bgGames.slice(half);
  const row1Loop = [...row1, ...row1];
  const row2Loop = [...row2, ...row2];

  return (
    <div className="relative min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12 overflow-hidden">

      {/* Background Animated Slider */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex flex-col justify-center gap-4">
        {/* Row 1 - scrolling left */}
        <div className="flex animate-scroll-left w-max">
          {row1Loop.map((game, i) => (
            <img key={`r1-${i}`} src={game.coverUrl} className="h-64 w-48 object-cover rounded-sm mx-2 flex-shrink-0 grayscale hover:grayscale-0 transition duration-700" alt="game cover" />
          ))}
        </div>
        {/* Row 2 - scrolling right */}
        <div className="flex animate-scroll-right w-max">
          {row2Loop.map((game, i) => (
            <img key={`r2-${i}`} src={game.coverUrl} className="h-64 w-48 object-cover rounded-sm mx-2 flex-shrink-0 grayscale hover:grayscale-0 transition duration-700" alt="game cover" />
          ))}
        </div>
      </div>

      {/* The form, on flat card stock over the covers */}
      <div className={`relative z-10 ${AUTH_PANEL}`}>
        <div className="text-center mb-8">
          <h1 className={AUTH_TITLE}>
            {isLogin ? 'Welcome back' : 'Join IMGM'}
          </h1>
          <p className="text-slate-400">
            {isLogin ? 'Log in to continue rating games.' : 'Create an account to start reviewing.'}
          </p>
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={LABEL_CLASS}>Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="block text-sm font-medium text-white">Password</label>
              {isLogin && (
                <Link to="/forgot-password" className={`text-sm text-slate-400 ${TEXT_LINK}`}>
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              type="password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(''); // an old "add a number" goes once they change it
              }}
              className={`${inputClass} mt-1.5`}
              placeholder="••••••••"
            />
            {!isLogin && <PasswordChecklist password={password} />}
          </div>

          <button type="submit" disabled={loading} className={buttonClass}>
            {loading ? 'Processing...' : (isLogin ? 'Log in' : 'Sign up')}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <hr className="flex-1 border-slate-700" />
          <span className="text-sm text-slate-400">or</span>
          <hr className="flex-1 border-slate-700" />
        </div>

        {/* Google's own dark sign-in button (its brand colours, not ours), with the
            four-colour G */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          className="mt-6 w-full h-11 flex items-center justify-center gap-3 bg-[#131314] border border-[#8e918f] text-[#e3e3e3] hover:border-white font-medium px-4 rounded-sm transition-colors duration-120"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Signing up (or in with Google, which can create an account) means agreeing */}
        <p className="mt-4 text-center text-xs text-slate-400">
          By continuing, you agree to IMGM's{' '}
          <Link to="/terms" className={`text-slate-300 ${TEXT_LINK}`}>Terms of Use</Link> and{' '}
          <Link to="/privacy" className={`text-slate-300 ${TEXT_LINK}`}>Privacy Policy</Link>.
        </p>

        <p className="mt-8 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className={`font-medium text-white ${TEXT_LINK}`}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;
