/**
 * Privacy Policy — Route: /privacy. What IMGM collects, why, who helps, and your rights.
 */
import { Link } from 'react-router-dom';
import LegalPage, { LegalSection as S } from '../components/LegalPage';

const Privacy = () => (
  <LegalPage
    title="Privacy Policy"
    effective="October 10, 2026"
    intro="This policy explains what IMGM (I Am Gaming, imgm.app) collects about you, why, who helps us run the site, and the choices you have. We keep it as short and plain as we can."
  >
    <S title="1. Who we are">
      <p>IMGM is a game review site run by an independent developer in Israel. "We" means the people running IMGM. You can reach us any time with the Feedback button on any page.</p>
    </S>

    <S title="2. What we collect">
      <ul>
        <li><strong className="text-white">Account:</strong> your email address and login (a password, stored only as a secure hash, or your Google account). If you sign in with Google, we get your name, email and Google picture; we never show your name or Google picture on IMGM.</li>
        <li><strong className="text-white">Profile:</strong> your gamer tag and, if you add one, your profile picture.</li>
        <li><strong className="text-white">What you post and do:</strong> reviews and their answers, ratings, helpful votes, Game of the Week votes and nominations, your Backlog, Play Next chats and quest answers, and feedback you send.</li>
        <li><strong className="text-white">Technical:</strong> a login cookie, and your IP address, used briefly for security and to limit abuse (for example rate limits).</li>
        <li><strong className="text-white">Anonymous visit counts:</strong> Vercel Analytics counts page views without cookies and without identifying you.</li>
      </ul>
    </S>

    <S title="3. Why we use it">
      <ul>
        <li>To run your account and show your reviews, scores, XP, badges, votes and Backlog.</li>
        <li>To make the community features work: game scores, the Hall of Fame, Game of the Week, and AI summaries of what players think.</li>
        <li>To give you Play Next recommendations based on your answers and reviews.</li>
        <li>To keep IMGM safe and fair (stopping spam, abuse and fake votes) and to fix bugs.</li>
        <li>To send you account emails, like password resets. We don't send marketing emails.</li>
      </ul>
      <p>We never sell your data, and we don't show ads based on you.</p>
    </S>

    <S title="4. What everyone can see">
      <p>Your gamer tag, profile picture, level, reviews (with their scores and answers) and badges are public. Your email address, real name, votes, Backlog and Play Next chats are private.</p>
    </S>

    <S title="5. AI features">
      <p>When you use Play Next, your question, your quest answers and your IMGM reviews are sent to Google's Gemini AI to pick games for you. AI summaries are made from public reviews. Profile pictures are checked by Google Cloud Vision before they're shown, to keep IMGM safe. We send only what's needed for the answer: never your email address or real name. Some requests use Google's free AI tier, under which Google may use the data to improve its services.</p>
    </S>

    <S title="6. Who helps us run IMGM">
      <p>We use trusted services that process data only to run IMGM for us:</p>
      <ul>
        <li>Vercel (website hosting and anonymous analytics) and Render (server hosting);</li>
        <li>Neon (database);</li>
        <li>Google Cloud (Gemini AI, Cloud Vision, and the AI service's hosting) and Google sign-in;</li>
        <li>Resend (account emails);</li>
        <li>IGDB/Twitch (game information; we don't send them your personal data).</li>
      </ul>
      <p>Some of these services store data outside your country (for example in the EU or the US). We may also share information if the law requires it, or to protect IMGM's players from harm.</p>
    </S>

    <S title="7. How long we keep it">
      <ul>
        <li>Your account and content: until you delete them or your account.</li>
        <li>Play Next chats: 30 days after your last message, then they're deleted.</li>
        <li>Feedback and security logs: as long as needed to handle them, usually a few months.</li>
        <li>After you delete your account, your data is removed within days; backups may keep a copy for a short time.</li>
      </ul>
    </S>

    <S title="8. Your rights and choices">
      <p>You can see and change most of your data on your profile, and delete your account (with everything in it) in your profile's settings. You can also ask us, through the Feedback button, for a copy of your data or to correct or delete it. Depending on where you live (for example in Israel or the EU), you may have more rights, such as objecting to some uses or complaining to your data protection authority.</p>
    </S>

    <S title="9. Cookies">
      <p>IMGM uses only the cookies it needs to keep you logged in. Your browser may also store a few settings for you (like your last Play Next answers). We don't use advertising or tracking cookies.</p>
    </S>

    <S title="10. Children">
      <p>IMGM is not for children under 13, and we don't knowingly collect their data. If you believe a child under 13 has an account, tell us and we'll delete it.</p>
    </S>

    <S title="11. Security">
      <p>We protect your data with encrypted connections, hashed passwords, limited access and trusted providers. No service is perfectly secure, so please use a strong, unique password.</p>
    </S>

    <S title="12. Changes">
      <p>We may update this policy as IMGM grows. We'll change the date at the top, and for important changes we'll let you know on the site.</p>
    </S>

    <S title="13. Contact">
      <p>Questions about your data? Use the Feedback button on any page. See also our <Link to="/terms" className="text-brand hover:underline">Terms of Use</Link>.</p>
    </S>
  </LegalPage>
);

export default Privacy;
