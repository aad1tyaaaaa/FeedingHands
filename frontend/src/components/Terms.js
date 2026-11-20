import { Link } from "react-router-dom";
import { ContactEmail, LEGAL_UPDATED, LegalShell } from "./Privacy";

export default function Terms() {
  return (
    <LegalShell>
      <h1>Terms of Use</h1>
      <p className="legal-updated">Last updated: <time dateTime="2026-11-20">{LEGAL_UPDATED}</time></p>
      <p>
        These terms apply to everyone who uses FeedingHands: food donors, volunteers, NGOs and biogas partners.
        By creating an account you agree to them and to our <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>What FeedingHands is</h2>
      <p>
        FeedingHands is a platform that helps surplus food reach people who need it. We connect donors, volunteers and
        organizations; we do not prepare, store, transport or inspect food ourselves.
      </p>

      <h2>Food safety is the donor's responsibility</h2>
      <ul>
        <li>Only donate food that is safe to eat, handled hygienically and within its use-by time, in line with FSSAI guidance.</li>
        <li>Describe food honestly: what it is, when it was cooked or packed, whether it is vegetarian, and any allergens you know of.</li>
        <li>The in-app freshness check is an aid, not a guarantee. It does not replace your own judgement.</li>
        <li>NGOs and volunteers should check food on pickup and refuse anything that looks or smells unsafe.</li>
        <li>Food unfit to eat should go to a biogas partner, not to people.</li>
      </ul>

      <h2>NGO verification</h2>
      <p>
        Organizations must give accurate details and a valid registration document. Our team reviews them before an
        organization can claim donations or appear in the directory. Verification confirms the documents we saw; it
        is not an endorsement of the organization's work. We may revoke verification if details turn out to be false.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Give accurate information and keep your account secure. You are responsible for activity on it.</li>
        <li>Do not sell donated food, claim food you cannot collect, or use the platform for anything unlawful.</li>
        <li>Do not harass other users, misuse their contact details, or upload content you have no right to share.</li>
        <li>Do not try to break, overload or gain unauthorised access to the service.</li>
        <li>Use the "Report a problem" button on a donation to tell us about unsafe food or misconduct.</li>
      </ul>

      <h2>Suspension and termination</h2>
      <p>
        We may suspend or close accounts that break these terms, put people at risk, or are the subject of credible
        reports, and we may cancel donations linked to them. If you think we got it wrong, contact us. You can delete
        your account at any time from Settings.
      </p>

      <h2>Contributions</h2>
      <p>Monetary contributions are processed by Razorpay and are subject to Razorpay's terms. Contributions are voluntary.</p>

      <h2>No warranty and limited liability</h2>
      <p>
        FeedingHands is provided "as is", without warranties of any kind. We do not guarantee that a donation will be
        claimed, picked up or delivered, or that food is safe. To the extent the law allows, FeedingHands is not liable
        for illness, loss or damage arising from food exchanged through the platform or from users' conduct.
        Nothing in these terms limits rights you have under Indian consumer law.
      </p>

      <h2>Changes and governing law</h2>
      <p>
        We may update these terms; the date at the top shows the latest version, and continuing to use FeedingHands
        means you accept the change. These terms are governed by the laws of India.
      </p>

      <h2>Contact</h2>
      <p><ContactEmail /></p>
    </LegalShell>
  );
}
