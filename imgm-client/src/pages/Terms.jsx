/**
 * Terms of Use — Route: /terms. The rules for using IMGM, in plain language.
 */
import { Link } from 'react-router-dom';
import LegalPage, { LegalSection as S } from '../components/LegalPage';

const Terms = () => (
  <LegalPage
    title="Terms of Use"
    effective="October 10, 2026"
    intro="Welcome to IMGM (I Am Gaming, imgm.app). These terms are the rules for using the site. By creating an account or using IMGM, you agree to them. If you don't agree, please don't use IMGM."
  >
    <S title="1. Who can use IMGM">
      <p>You must be at least 13 years old. If you're under 18, you need a parent's or guardian's permission. You're responsible for everything done with your account, so keep your password safe and tell us if you think someone else has used it.</p>
    </S>

    <S title="2. Your account and gamer tag">
      <ul>
        <li>One account per person. Give accurate sign-up details.</li>
        <li>Your gamer tag and profile picture must not impersonate anyone, include hate or harassment, be sexual, or break anyone's rights.</li>
        <li>We may change or remove a gamer tag or picture that breaks these rules.</li>
      </ul>
    </S>

    <S title="3. Your reviews and other content">
      <p>Your reviews, ratings, answers, votes, nominations and anything else you post are yours. By posting them, you give IMGM a worldwide, non-exclusive, royalty-free license to host, store, show, format, translate and share them on IMGM and in IMGM's features: for example in a game's score and charts, in AI summaries of what players think, and in Play Next recommendations. This license ends when you delete the content or your account, except for content already used in summaries or charts, and copies kept for a short time in backups.</p>
      <p>You are responsible for what you post. Reviews should describe your own experience with a game. Don't post:</p>
      <ul>
        <li>anything illegal, hateful, harassing, threatening, sexual or violent;</li>
        <li>other people's personal information;</li>
        <li>spam, ads, or links meant to promote something;</li>
        <li>major story spoilers without marking them as spoilers;</li>
        <li>content you don't have the right to share.</li>
      </ul>
      <p>We may remove content that breaks these rules, without notice.</p>
    </S>

    <S title="4. Playing fair">
      <p>Don't try to game the site. That includes using more than one account, bots or scripts to vote, review, rate reviews as helpful, nominate or earn XP; trading votes; scraping or copying IMGM's data in bulk; trying to get around limits; misusing the AI features; or attacking, overloading or breaking into IMGM. We may remove the results (for example votes or XP) and suspend accounts involved.</p>
    </S>

    <S title="5. AI features">
      <p>Play Next and the "What players think" summaries are made by AI from IMGM reviews and game data. They're automatic and can be wrong, incomplete or out of date. They are suggestions, not advice: check a game's store page, price and age rating before you buy. Play Next has daily limits so it stays available to everyone.</p>
    </S>

    <S title="6. Games, stores and other sites">
      <p>Game information and art come from IGDB and the games' publishers. Games, names, logos and artwork belong to their owners, and IMGM isn't affiliated with or endorsed by them. "Where to buy" links lead to other companies' stores (like Steam, GOG or PlayStation Store): anything you buy there is between you and that store, under their terms. IMGM may earn a commission from some store links in the future; this never changes what we show you.</p>
    </S>

    <S title="7. IMGM's site and code">
      <p>The IMGM name, logo, design and site belong to IMGM. IMGM's source code is published under the <a href="https://polyformproject.org/licenses/noncommercial/1.0.0" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">PolyForm Noncommercial License 1.0.0</a>: you may use it for non-commercial purposes with credit, and commercial use needs written permission.</p>
    </S>

    <S title="8. IMGM is in beta">
      <p>IMGM is new and still changing. Features may change, pause or end, and things may break. We work to keep your account and content safe, but we can't promise the site will always be available or error-free.</p>
    </S>

    <S title="9. Ending your use">
      <p>You can stop using IMGM at any time and delete your account in your profile's settings. We may suspend or close accounts that break these terms or put IMGM or its players at risk.</p>
    </S>

    <S title="10. No warranties">
      <p>IMGM is provided "as is" and "as available", without warranties of any kind, to the fullest extent the law allows.</p>
    </S>

    <S title="11. Limits on liability">
      <p>To the fullest extent the law allows, IMGM and the people who run it are not liable for indirect, incidental or consequential damages, or for lost data, profits or purchases, arising from your use of IMGM, its AI features or the sites it links to. Nothing in these terms limits rights you have that the law doesn't allow us to limit.</p>
    </S>

    <S title="12. Changes to these terms">
      <p>We may update these terms as IMGM grows. We'll change the date at the top, and for important changes we'll let you know on the site. Using IMGM after a change means you accept the new terms.</p>
    </S>

    <S title="13. Law">
      <p>These terms are governed by the laws of the State of Israel. Any dispute will be handled by the competent courts in Tel Aviv-Yafo, Israel, unless the law where you live gives you the right to go to your local courts.</p>
    </S>

    <S title="14. Contact">
      <p>Questions or reports? Use the Feedback button on any page. See also our <Link to="/privacy" className="text-brand hover:underline">Privacy Policy</Link>.</p>
    </S>
  </LegalPage>
);

export default Terms;
