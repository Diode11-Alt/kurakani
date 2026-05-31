"use client";

import { MessageSquare, Mail, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 select-none">
      <h1 className="text-2xl font-bold mb-2">Support & Help Center</h1>
      <p className="text-sm text-[var(--color-guff-text-muted)] mb-8">
        Need assistance with your encrypted communications? We're here to help.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-ember p-6 rounded-2xl flex flex-col hover:-translate-y-1 transition-transform cursor-pointer">
          <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand mb-4">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold mb-2">Live Chat</h2>
          <p className="text-sm text-content-muted mb-4 flex-grow">
            Chat with a support agent immediately for urgent technical issues.
          </p>
          <div className="flex items-center text-brand font-bold text-sm">
            Start Chat <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        <div className="card-ember p-6 rounded-2xl flex flex-col hover:-translate-y-1 transition-transform cursor-pointer">
          <div className="w-12 h-12 bg-spark/10 rounded-xl flex items-center justify-center text-spark mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold mb-2">Documentation</h2>
          <p className="text-sm text-content-muted mb-4 flex-grow">
            Read our guides on End-to-End Encryption, key management, and privacy.
          </p>
          <div className="flex items-center text-spark font-bold text-sm">
            View Docs <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        <div className="card-ember p-6 rounded-2xl flex flex-col hover:-translate-y-1 transition-transform cursor-pointer">
          <div className="w-12 h-12 bg-blaze/10 rounded-xl flex items-center justify-center text-blaze mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold mb-2">Email Support</h2>
          <p className="text-sm text-content-muted mb-4 flex-grow">
            Submit a ticket for account recovery or detailed bug reports.
          </p>
          <div className="flex items-center text-blaze font-bold text-sm">
            Contact Us <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>

      <div className="mt-12 card-ember p-8 rounded-2xl border border-brand/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <h2 className="text-xl font-bold mb-2">Still need help?</h2>
        <p className="text-sm text-content-muted mb-6 max-w-md">
          If you couldn't find the answer in our documentation or if you're experiencing a critical security issue, please reach out directly.
        </p>
        <button className="btn-primary">Submit Support Ticket</button>
      </div>
    </div>
  );
}
