import { useEffect } from 'react';

function OAuthSuccess() {
  useEffect(() => {
    // We are inside the popup window.
    // Google auth has succeeded and Better Auth redirected us here.
    // Close this popup so the main window can detect it and refresh!
    window.close();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <h2 className="text-2xl font-bold text-white">Authentication successful! Closing window...</h2>
    </div>
  );
}

export default OAuthSuccess;
