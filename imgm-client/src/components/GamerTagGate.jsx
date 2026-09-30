/**
 * GamerTagGate — logged-in users who haven't chosen a gamer tag yet are sent to
 * /welcome first, then back to the page they were going to.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../lib/authClient';

// Pages that must work before a tag exists
const OPEN_PATHS = ['/welcome', '/login', '/oauth-success'];

const GamerTagGate = ({ children }) => {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  const needsTag = !isPending && session && !session.user.displayUsername;
  if (needsTag && !OPEN_PATHS.includes(location.pathname)) {
    const back = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/welcome?redirect=${back}`} replace />;
  }
  return children;
};

export default GamerTagGate;
