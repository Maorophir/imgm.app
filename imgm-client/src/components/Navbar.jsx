import { Link } from 'react-router-dom';

/**
 * Navbar — Top navigation bar for the IMGM app.
 *
 * Why this is its own component:
 * - Separation of concerns: Nav logic stays isolated from routing/page logic.
 * - Reusability: Every page gets the same Navbar without duplicating JSX.
 * - Scalability: When we add search, user avatar, or a mobile menu later,
 *   we only edit this one file.
 *
 * Why <Link> instead of <a>:
 * - <a href="/trending"> causes a FULL page reload (the browser re-downloads everything).
 * - <Link to="/trending"> does CLIENT-SIDE navigation (React swaps the component instantly).
 *   This is what makes React apps feel fast — only the page content changes, not the whole page.
 */
function Navbar() {
  return (
    <nav className="p-5 bg-slate-900 flex justify-between items-center shadow-lg">
      {/* Logo / Brand — links back to home */}
      <Link to="/" className="text-3xl font-extrabold text-blue-500 tracking-wider">
        IMGM
      </Link>

      {/* Navigation links */}
      <ul className="flex gap-6 font-semibold">
        <li>
          <Link to="/" className="hover:text-blue-400 transition">
            Home
          </Link>
        </li>
        <li>
          <Link to="/trending" className="hover:text-blue-400 transition">
            Trending
          </Link>
        </li>
        <li>
          <Link to="/profile" className="hover:text-blue-400 transition">
            My Profile
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
