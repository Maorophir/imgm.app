/**
 * Profile page — Will display user profile, their reviews, and stats.
 *
 * Currently a placeholder. This page will eventually need:
 * - Authentication check (redirect to login if not signed in)
 * - API call to fetch user data (useEffect + useState, or a custom hook)
 * - Display of user's submitted reviews with their AI sentiment badges
 *
 * We'll build all of that in later phases. For now, it just needs to exist
 * so the route works and the Navbar link doesn't break.
 */
function Profile() {
  return (
    <div className="flex items-center justify-center h-[80vh] text-3xl text-slate-400">
      User Profile Coming Soon...
    </div>
  );
}

export default Profile;
