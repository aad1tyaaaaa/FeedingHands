import { Link } from "react-router-dom";
import "./Legal.css";

export const LEGAL_UPDATED = "20 November 2026";
// TODO before launch: replace with a monitored inbox (and name a Grievance Officer under the DPDP Act).
export const CONTACT_EMAIL = "privacy@feedinghands.org";

export function LegalShell({ children }) {
  return (
    <div className="legal-page">
      <header className="legal-top">
        <Link to="/"><img src="/logo/logo-with-text.png" alt="FeedingHands home" /></Link>
        <nav aria-label="Legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/sign-in">Sign in</Link>
        </nav>
      </header>
      <main className="legal-doc">{children}</main>
    </div>
  );
}

export function ContactEmail() {
  return (
    <>
      <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{" "}
      <span className="legal-todo">placeholder address, to be replaced</span>
    </>
  );
}

export default function Privacy() {
  return (
    <LegalShell>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: <time dateTime="2026-11-20">{LEGAL_UPDATED}</time></p>
      <p>
        FeedingHands connects people and businesses with surplus food to NGOs, volunteers and biogas partners in India.
        This policy explains what personal data we collect, why, how long we keep it and the rights you have under the
        Digital Personal Data Protection Act, 2023 (DPDP Act).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address, phone number (optional), role and a securely hashed password.</li>
        <li><strong>Addresses and locations:</strong> pickup addresses and map coordinates of donations, organization addresses, and, if you allow it, your device location to fill these in or to plan routes.</li>
        <li><strong>Donation records:</strong> what was donated, when, its status, and who claimed, picked up and delivered it.</li>
        <li><strong>Photos and documents:</strong> food photos you upload, organization logos and NGO registration documents.</li>
        <li><strong>Payment records:</strong> the amount, status and Razorpay order and payment IDs of contributions. Payments are processed by Razorpay; we never see or store your card, UPI or bank details.</li>
        <li><strong>Reports:</strong> what you write when you report a problem with a donation.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To run your account and sign you in securely.</li>
        <li>To match donations with nearby verified NGOs and volunteers and show everyone involved where to go.</li>
        <li>To send emails you opted into: verification and reset codes, donation status updates and payment receipts. You can turn off update emails in Settings.</li>
        <li>To verify NGOs, investigate reports and keep the platform safe.</li>
        <li>To keep records the law requires, such as payment receipts.</li>
      </ul>
      <p>We do not sell your personal data or use it for advertising.</p>

      <h2>Who can see it</h2>
      <p>
        People taking part in a donation see what they need to complete it: for example, the NGO and volunteer see the
        pickup location and the donor's contact details. Verified organizations appear in the public NGO directory.
        Our service providers (hosting, email delivery and Razorpay) process data only on our instructions.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your account data is kept while your account is open.</li>
        <li>When you delete your account, we remove your login and personal profile. Donation records are kept without your account attached, so NGOs and volunteers keep an accurate history of food they handled.</li>
        <li>Payment records are kept for as long as Indian tax and accounting law requires.</li>
        <li>Registration documents are kept while the organization is listed on FeedingHands.</li>
      </ul>

      <h2>Deleting your account</h2>
      <p>You can delete your account at any time from <strong>Settings → Delete account</strong>. You can also write to us to ask for deletion.</p>

      <h2>Your rights under the DPDP Act, 2023</h2>
      <ul>
        <li>Access a summary of the personal data we hold about you and how we use it.</li>
        <li>Correct, complete or update your data (most of it you can edit yourself in Settings).</li>
        <li>Erase your data, and withdraw consent at any time, as easily as you gave it.</li>
        <li>Have your grievances addressed by us, and if you are not satisfied, complain to the Data Protection Board of India.</li>
        <li>Nominate another person to exercise these rights on your behalf if you die or become unable to.</li>
      </ul>

      <h2>Security</h2>
      <p>Passwords are hashed, connections are encrypted, and access to registration documents is limited to our review team. No system is perfectly secure; if a breach affects you, we will tell you and the Data Protection Board as the law requires.</p>

      <h2>Children</h2>
      <p>FeedingHands is meant for people aged 18 and over. We do not knowingly collect data from children.</p>

      <h2>Contact</h2>
      <p>Questions, requests or grievances: <ContactEmail />. We aim to reply within 30 days.</p>
      <p>We may update this policy; the date at the top shows the latest version. See also our <Link to="/terms">Terms of Use</Link>.</p>
    </LegalShell>
  );
}
