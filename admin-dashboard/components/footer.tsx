'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/oaLogo.png" alt="OpenArabic" className="h-6 w-auto" />
              <span className="font-semibold text-foreground">OpenArabic</span>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              Learn Arabic through reading
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="font-semibold text-sm mb-3 text-foreground">Legal</h3>
            <div className="flex flex-col gap-2 text-sm">
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

          {/* Contact */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="font-semibold text-sm mb-3 text-foreground">Connect</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact Us
              </Link>
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                Admin Login
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} OpenArabic. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
