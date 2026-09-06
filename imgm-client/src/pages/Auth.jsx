import { useState } from 'react';
import { signIn, signUp, authClient } from '../lib/authClient';
import { useNavigate } from 'react-router-dom';
import { mockGames } from '../utils/mockData'; // We'll use mock covers for the background

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn.email({ email, password });
        if (error) throw new Error(error.message || "Failed to log in");
        navigate('/');
      } else {
        const { error } = await signUp.email({ email, password, name });
        if (error) throw new Error(error.message || "Failed to sign up");
        navigate('/');
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
        callbackURL: "http://localhost:5173/oauth-success"
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
              window.location.href = '/';
            }
          }
        }, 1000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Duplicate games to create a seamless infinite scroll effect
  const scrollGames = [...mockGames, ...mockGames, ...mockGames];

  return (
    <div className="relative min-h-screen bg-slate-950 flex items-center justify-center overflow-hidden">
      
      {/* Background Animated Slider */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex flex-col justify-center gap-4">
        {/* Row 1 - scrolling left */}
        <div className="flex animate-scroll-left w-[300vw]">
          {scrollGames.map((game, i) => (
            <img key={`r1-${i}`} src={game.coverUrl} className="h-64 w-48 object-cover rounded-lg mx-2 flex-shrink-0 grayscale hover:grayscale-0 transition duration-700" alt="game cover" />
          ))}
        </div>
        {/* Row 2 - scrolling right */}
        <div className="flex animate-scroll-right w-[300vw] ml-[-100vw]">
          {scrollGames.map((game, i) => (
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
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Display Name</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition placeholder-slate-500"
                placeholder="GamerTag99"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition placeholder-slate-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition placeholder-slate-500"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-blue-500/30 transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;
