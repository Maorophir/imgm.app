// "just now", "5m", "3h", "2d", or a date past a month ("Sep 4")
export const timeAgo = (date) => {
  const minutes = Math.floor((Date.now() - new Date(date)) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 60 * 24 * 30) return `${Math.floor(minutes / (60 * 24))}d`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
