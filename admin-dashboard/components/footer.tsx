'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/privacy"
            className="hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link
            href="/terms"
            className="hover:text-primary transition-colors"
          >
            Terms of Service
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link
            href="/contact"
            className="hover:text-primary transition-colors"
          >
            Contact
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link
            href="/account-deletion"
            className="hover:text-primary transition-colors"
          >
            Account Deletion
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link
            href="/login"
            className="hover:text-primary transition-colors"
          >
            Login
          </Link>
          <span className="hidden sm:inline">•</span>
          <span>© {new Date().getFullYear()} OpenArabic</span>
        </div>
      </div>
    </footer>
  );
}
