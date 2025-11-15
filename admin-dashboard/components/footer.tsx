'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/oaLogo.png" alt="OpenArabic" className="h-5 w-auto" />
            <span className="text-sm font-medium text-foreground">OpenArabic</span>
          </div>

          {/* Legal Links - Inline with dot separators */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap justify-center">
            <Link href="/privacy" className="hover:text-foreground transition-colors cursor-pointer">
              Privacy
            </Link>
            <span className="opacity-40">·</span>
            <Link href="/terms" className="hover:text-foreground transition-colors cursor-pointer">
              Terms
            </Link>
            <span className="opacity-40">·</span>
            <Link href="/account-deletion" className="hover:text-foreground transition-colors cursor-pointer">
              Delete Account
            </Link>
            <span className="opacity-40">·</span>
            <span className="text-muted-foreground">© 2025 OpenArabic</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
