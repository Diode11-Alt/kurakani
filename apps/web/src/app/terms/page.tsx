import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Kurakani',
  description: 'Read the Terms of Service for Kurakani, the end-to-end encrypted messaging platform.',
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-[var(--color-guff-text-muted)] mb-8">Last Updated: May 2026</p>

      <div className="prose prose-slate max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-[var(--color-guff-text-secondary)]">By downloading, installing, or using Kurakani, you agree to these Terms of Service. If you do not agree, do not use the app.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Eligibility</h2>
          <ul className="list-disc pl-6 space-y-1 text-[var(--color-guff-text-secondary)]">
            <li>You must be 13 years of age or older</li>
            <li>You must not be prohibited from using the Service under applicable law</li>
            <li>You must not be a previously banned user</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
          <p className="text-[var(--color-guff-text-secondary)]">You must provide a valid phone number or email to register. You are responsible for maintaining the security of your device and account, and all activity that occurs on your account.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
          <p className="text-[var(--color-guff-text-secondary)] mb-2">You may NOT use the app to:</p>
          <ul className="list-disc pl-6 space-y-1 text-[var(--color-guff-text-secondary)]">
            <li>Violate any applicable law or regulation</li>
            <li>Send spam, phishing, or unsolicited messages</li>
            <li>Harass, threaten, or abuse other users</li>
            <li>Distribute malware or malicious code</li>
            <li>Share child sexual abuse material (CSAM)</li>
            <li>Coordinate terrorism or violence</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Content and Encryption</h2>
          <p className="text-[var(--color-guff-text-secondary)]">All messages are end-to-end encrypted. We cannot access your message content. You are solely responsible for the content of your communications.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Disclaimer of Warranties</h2>
          <p className="text-[var(--color-guff-text-secondary)] uppercase text-xs font-medium tracking-wide">THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Termination</h2>
          <p className="text-[var(--color-guff-text-secondary)]">You may delete your account at any time via Settings → Account → Delete Account. Upon termination, your encrypted data will be deleted within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Contact</h2>
          <p className="text-[var(--color-guff-text-secondary)]">Legal inquiries: legal@kurakani.app</p>
        </section>
      </div>
    </main>
  );
}
