import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Kurakani',
  description: 'Learn how Kurakani protects your privacy with end-to-end encryption. We cannot read your messages.',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-[var(--color-guff-text-muted)] mb-8">Last Updated: May 2026</p>

      <div className="prose prose-slate max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Our Core Privacy Promise</h2>
          <p>Kurakani is built on a single principle: <strong>we cannot read your messages, and neither can anyone else.</strong></p>
          <p>We use end-to-end encryption (E2EE) for all messages, calls, and shared media. This means:</p>
          <ul className="list-disc pl-6 space-y-1 text-[var(--color-guff-text-secondary)]">
            <li>Your messages are encrypted on your device before they leave it.</li>
            <li>Only you and the person you&apos;re communicating with can read them.</li>
            <li>We do not have the encryption keys.</li>
            <li>Our server acts as a blind relay — it routes encrypted blobs without seeing contents.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. What We Collect</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-guff-border)]">
                  <th className="text-left py-2 pr-4 font-medium">Data</th>
                  <th className="text-left py-2 pr-4 font-medium">Purpose</th>
                  <th className="text-left py-2 font-medium">Retained</th>
                </tr>
              </thead>
              <tbody className="text-[var(--color-guff-text-secondary)]">
                <tr className="border-b border-[var(--color-guff-border)]"><td className="py-2 pr-4">Phone number (hashed)</td><td className="py-2 pr-4">Identity verification</td><td className="py-2">Until deletion</td></tr>
                <tr className="border-b border-[var(--color-guff-border)]"><td className="py-2 pr-4">Username</td><td className="py-2 pr-4">Display in-app</td><td className="py-2">Until deletion</td></tr>
                <tr className="border-b border-[var(--color-guff-border)]"><td className="py-2 pr-4">Public crypto keys</td><td className="py-2 pr-4">Enable E2EE</td><td className="py-2">Until deletion</td></tr>
                <tr className="border-b border-[var(--color-guff-border)]"><td className="py-2 pr-4">Delivery metadata</td><td className="py-2 pr-4">Confirm delivered</td><td className="py-2">30 days</td></tr>
                <tr><td className="py-2 pr-4">Server access logs</td><td className="py-2 pr-4">Security</td><td className="py-2">90 days</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. What We Do NOT Collect</h2>
          <ul className="list-disc pl-6 space-y-1 text-[var(--color-guff-text-secondary)]">
            <li>Message content (only encrypted ciphertext)</li>
            <li>Call audio or video (peer-to-peer via WebRTC)</li>
            <li>Contact lists, location data, behavioral analytics</li>
            <li>Advertising identifiers or third-party analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Your Rights</h2>
          <p className="text-[var(--color-guff-text-secondary)]">You have the right to access, correct, delete, and export your data. To delete your account: go to Settings → Account → Delete Account. Your data is permanently erased within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Security</h2>
          <ul className="list-disc pl-6 space-y-1 text-[var(--color-guff-text-secondary)]">
            <li>All communication uses TLS 1.3+ plus application-layer E2EE</li>
            <li>Cryptographic keys generated and stored only on your device</li>
            <li>Passwords hashed with bcrypt (cost factor 12)</li>
            <li>Regular security audits conducted</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Contact</h2>
          <p className="text-[var(--color-guff-text-secondary)]">Privacy inquiries: privacy@kurakani.app</p>
        </section>
      </div>
    </main>
  );
}
