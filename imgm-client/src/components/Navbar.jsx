import { Link } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';

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
        <li>
          <Link to="/guide" className="font-bold bg-gradient-to-r from-amber-300 to-indigo-400 bg-clip-text text-transparent hover:opacity-80 transition">
            ✦ Game Guide
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
          <li className="ml-4">
            <UserMenu user={session.user} />
          </li>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
