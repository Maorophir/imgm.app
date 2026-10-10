import { useState, useEffect } from 'react';
import { signIn, signUp, authClient, useSession } from '../lib/authClient';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getFeaturedGames } from '../lib/api';
import { safeRedirect } from '../lib/safeRedirect';

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
        // Better Auth needs a name; it stays private (the public gamer tag is chosen next)
        const { error } = await signUp.email({ email, password, name: email.split('@')[0] });
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
    <div className="relative min-h-screen bg-slate-950 flex items-center justify-center overflow-hidden">

      {/* Background Animated Slider */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex flex-col justify-center gap-4">
        {/* Row 1 - scrolling left */}
        <div className="flex animate-scroll-left w-max">
          {row1Loop.map((game, i) => (
            <img key={`r1-${i}`} src={game.coverUrl} className="h-64 w-48 object-cover rounded-lg mx-2 flex-shrink-0 grayscale hover:grayscale-0 transition duration-700" alt="game cover" />
          ))}
        </div>
        {/* Row 2 - scrolling right */}
        <div className="flex animate-scroll-right w-max">
          {row2Loop.map((game, i) => (
            <img key={`r2-${i}`} src={game.coverUrl} className="h-64 w-48 object-cover rounded-lg mx-2 flex-shrink-0 grayscale hover:grayscale-0 transition duration-700" alt="game cover" />
          ))}
        </div>
      </div>

      {/* Auth Form Overlay */}
      <div className="relative z-10 w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-slate-700/50">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white tracking-wider mb-2">
            {isLogin ? 'Welcome Back' : 'Join IMGM'}
          </h1>
          <p className="text-slate-400 font-medium">
            {isLogin ? 'Log in to continue rating games.' : 'Create an account to start reviewing.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/40 transition placeholder-slate-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="block text-sm font-semibold text-slate-300">Password</label>
              {isLogin && (
                <Link to="/forgot-password" className="text-xs font-semibold text-slate-400 hover:text-brand">
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/40 transition placeholder-slate-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] font-bold py-3 px-4 rounded-lg transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <hr className="w-full border-slate-700" />
          <span className="p-2 text-slate-500 text-sm font-bold uppercase">Or</span>
          <hr className="w-full border-slate-700" />
        </div>

        <button
          onClick={handleGoogleAuth}
          className="mt-6 w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-slate-900 font-bold py-3 px-4 rounded-lg transition"
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
        <p className="mt-4 text-center text-xs text-slate-500">
          By continuing, you agree to IMGM's{' '}
          <Link to="/terms" className="text-slate-300 hover:text-white underline underline-offset-2">Terms of Use</Link> and{' '}
          <Link to="/privacy" className="text-slate-300 hover:text-white underline underline-offset-2">Privacy Policy</Link>.
        </p>

        <p className="mt-8 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-white hover:text-brand font-semibold underline underline-offset-4"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;
