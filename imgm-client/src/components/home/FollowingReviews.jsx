/**
 * Home page: "From players you follow", the newest reviews by the players you follow,
 * as the same small cards as Fresh from the community. Only for a logged-in player who
 * follows someone with a review; for everyone else the section isn't there at all.
 */
import { useEffect, useState } from 'react';
import { getFollowingReviews } from '../../lib/api';
import { useSession } from '../../lib/authClient';
import { FreshCard } from './FreshReviews';
import { WRAP, SECTION_TITLE } from '../../lib/ui';

const FollowingReviews = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    getFollowingReviews(controller.signal).then((feed) => setReviews(feed.reviews)).catch(() => {});
    return () => controller.abort();
  }, [userId]);

  if (!userId || reviews.length === 0) return null;
  return (
    <section aria-labelledby="following-title" className="mt-18 sm:mt-24">
      <div className={WRAP}>
        <h2 id="following-title" className={SECTION_TITLE}>
          From players you follow
        </h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 mt-8 sm:grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] sm:gap-x-8 sm:gap-y-14 sm:mt-12">
          {reviews.map((review) => <FreshCard key={review.id} review={review} />)}
        </div>
      </div>
    </section>
  );
};

export default FollowingReviews;
