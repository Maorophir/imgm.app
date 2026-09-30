import { Link } from 'react-router-dom';
import { useSession, signOut } from '../lib/authClient';
import SearchBar from './SearchBar';

function Navbar() {
  const { data: session, isPending } = useSession();

  return (
    <nav className="p-5 bg-slate-900 flex justify-between items-center shadow-lg sticky top-0 z-50">
      {/* Logo / Brand */}
      <Link to="/" className="flex items-center gap-2">
        <span className="text-3xl font-extrabold text-blue-500 tracking-wider">IMGM</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded">
          Beta
        </span>
      </Link>

      {/* Game search with instant results */}
      <SearchBar />

      {/* Navigation links */}
      <ul className="flex gap-6 font-semibold items-center">
        <li>
          <Link to="/" className="hover:text-blue-400 transition text-slate-200">
            Home
          </Link>
        </li>
        <li>
          <Link to="/trending" className="hover:text-blue-400 transition text-slate-200">
            Trending
          </Link>
        </li>
        
        {!isPending && !session && (
          <li>
            <Link 
              to="/login" 
              className="ml-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transition"
            >
              Log In
            </Link>
          </li>
        )}

        {!isPending && session && (
          <>
            <li>
              <Link to="/profile" className="hover:text-blue-400 transition text-slate-200">
                My Profile
              </Link>
            </li>
            <li className="ml-4 flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800 rounded-full pl-2 pr-4 py-1 border border-slate-700">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  {(session.user.displayUsername || '?')[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-200">
                  {session.user.displayUsername || 'Choose a tag'}
                </span>
              </div>
              <button 
                onClick={async () => {
                  await signOut();
                  window.location.reload();
                }}
                className="text-slate-400 hover:text-red-400 transition text-sm font-semibold"
              >
                Log Out
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
