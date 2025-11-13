'use client';

import Link from 'next/link';
import { Footer } from '@/components/footer';

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Account Deletion Request</h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-lg text-muted-foreground mb-8">
            We respect your privacy and your right to control your personal data. If you would like to delete your OpenArabic account and associated data, please follow the instructions below.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">How to Request Account Deletion</h2>
            <div className="bg-muted/30 border border-border rounded-lg p-6">
              <p className="mb-4">
                To request the deletion of your account, please send an email to:
              </p>
              <div className="bg-background border border-border rounded-lg p-4 mb-4">
                <a
                  href="mailto:support@openarabic.io?subject=Account Deletion Request"
                  className="text-primary font-medium hover:underline text-lg"
                >
                  support@openarabic.io
                </a>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Please include &ldquo;Account Deletion Request&rdquo; in the subject line and provide the email address associated with your account in the message body.
              </p>
              <p className="text-sm font-medium text-foreground">
                ⚠️ You will receive a verification email that you must confirm before any deletion occurs.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">What Gets Deleted</h2>
            <p className="mb-4">When you request account deletion, the following data will be removed:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Your account profile and authentication credentials</li>
              <li>Your reading progress and article history</li>
              <li>Your vocabulary learning data and practice records</li>
              <li>Any personal preferences and settings</li>
              <li>All associated user data stored in our systems</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Verification Process</h2>
            <div className="bg-accent/50 border border-border rounded-lg p-6">
              <p className="font-semibold mb-3">For your security, we require email verification:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                <li>After you email us, we will send a verification link to the email address associated with your account</li>
                <li>You must click the verification link to confirm the deletion request</li>
                <li>Only after verification will your account deletion be processed</li>
                <li>If you don&apos;t verify within 48 hours, the request will be cancelled for security</li>
              </ol>
              <p className="mt-4 text-sm text-muted-foreground">
                <strong>Important:</strong> This verification step protects your account from unauthorized deletion requests. Without clicking the verification link, no deletion will occur.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Processing Time</h2>
            <p className="text-muted-foreground">
              After you verify your deletion request, we typically process account deletion within <strong>7 business days</strong>. You will receive a confirmation email once your account and data have been permanently deleted.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Important Notes</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Email verification is required</strong> - this prevents unauthorized deletion requests</li>
              <li>Account deletion is permanent and cannot be undone</li>
              <li>You will lose access to all your learning progress and data</li>
              <li>If you change your mind, you can reply to our confirmation email before the deletion is processed</li>
              <li>This process is available to all users, regardless of whether you are currently logged in</li>
            </ul>
          </section>

          <div className="bg-accent/50 border border-border rounded-lg p-6 mt-8">
            <p className="text-sm text-muted-foreground">
              If you have any questions about account deletion or data privacy, please don&apos;t hesitate to contact us at{' '}
              <a
                href="mailto:support@openarabic.io"
                className="text-primary hover:underline font-medium"
              >
                support@openarabic.io
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
