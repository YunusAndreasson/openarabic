'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Footer() {

  return (
    <footer className="border-t border-border/30 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <Image
              src="/oaLogo.png"
              alt="OpenArabic"
              width={20}
              height={20}
              className="h-5 w-auto"
            />
            <span className="text-sm font-medium text-foreground">OpenArabic</span>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap justify-center">
            <Link
              href="/privacy"
              prefetch={null}
              className="hover:text-foreground transition-colors duration-150 cursor-pointer"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              prefetch={null}
              className="hover:text-foreground transition-colors duration-150 cursor-pointer"
            >
              Terms
            </Link>
            <Link
              href="/account-deletion"
              prefetch={null}
              className="hover:text-foreground transition-colors duration-150 cursor-pointer"
            >
              Delete Account
            </Link>
            <span className="text-muted-foreground/70">© 2025 OpenArabic</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
