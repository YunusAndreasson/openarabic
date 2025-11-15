'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/oaLogo.png" alt="OpenArabic" className="h-5 w-auto" />
              <span className="text-sm font-medium text-foreground">OpenArabic</span>
            </div>
            <p className="text-xs text-muted-foreground text-center md:text-left">
              Learn Arabic through reading
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="font-medium text-xs mb-2 text-foreground/80">Legal</h3>
            <div className="flex flex-col gap-1.5 text-xs">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/account-deletion" className="text-muted-foreground hover:text-foreground transition-colors">
                Account Deletion
              </Link>
            </div>
          </div>

          {/* Connect */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="font-medium text-xs mb-2 text-foreground/80">Connect</h3>
            <div className="flex flex-col gap-1.5 text-xs">
              <a
                href="mailto:yunus+openarabic@edenmind.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Email
              </a>
              <a
                href="https://x.com/openarabicio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Twitter
              </a>
              <a
                href="https://www.instagram.com/openarabic.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Instagram
              </a>
              <a
                href="https://www.facebook.com/OpenArabic.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
