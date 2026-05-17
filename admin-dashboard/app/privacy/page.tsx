'use client';

import { useState, useEffect } from 'react';
import { Footer } from '@/components/footer';
import { PublicHeader } from '@/components/public-header';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Category = Database['public']['Tables']['categories']['Row'];

export default function PrivacyPolicyPage() {
  usePageTitle('Privacy Policy - OpenArabic');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader
        categories={categories}
        selectedCategoryId={null}
        onSelectCategory={() => {}}
      />

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Effective Date: January 1, 2025</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <p className="text-muted-foreground">
            Your privacy is important to us. This policy explains what information we collect, how
            we use it, and your rights.
          </p>

          {/* Section 1: Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>

            <h3 className="text-lg font-semibold mb-2">Account Information</h3>
            <p className="text-muted-foreground mb-4">
              When you create an account, we collect your email address. If you use Apple or Google
              Sign In, we receive basic profile information from those services.
            </p>

            <h3 className="text-lg font-semibold mb-2">Learning Data</h3>
            <p className="text-muted-foreground mb-4">
              We store your reading progress, vocabulary lists, practice session history, review
              performance, and app preferences (theme, audio settings, notifications).
            </p>

            <h3 className="text-lg font-semibold mb-2">Usage Analytics</h3>
            <p className="text-muted-foreground mb-4">
              We use Mixpanel to track basic events like sign in, sign up, and practice sessions.
              This helps us understand how the app is used and improve it.
            </p>
          </section>

          {/* Section 2: How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              We use your data to: provide the learning service, sync your progress across devices,
              personalize your learning experience, send practice reminders (if enabled), and
              improve the app.
            </p>
          </section>

          {/* Section 3: Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Third-Party Services</h2>

            <h3 className="text-lg font-semibold mb-2">Supabase</h3>
            <p className="text-muted-foreground mb-4">
              We use Supabase for authentication, database, and file storage. Your data is stored
              securely on their servers.
            </p>

            <h3 className="text-lg font-semibold mb-2">Mixpanel</h3>
            <p className="text-muted-foreground mb-4">
              We use Mixpanel for analytics to understand app usage patterns and improve the
              learning experience.
            </p>

            <h3 className="text-lg font-semibold mb-2">Sentry</h3>
            <p className="text-muted-foreground mb-4">
              We use Sentry for error tracking and crash reporting to identify and fix issues that
              affect app stability and performance.
            </p>

            <h3 className="text-lg font-semibold mb-2">Apple and Google</h3>
            <p className="text-muted-foreground mb-4">
              If you sign in with Apple or Google, their privacy policies apply to the
              authentication process.
            </p>
          </section>

          {/* Section 4: Data Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground">
              We take reasonable measures to protect your data, including encrypted connections and
              secure authentication. However, no internet service is 100% secure.
            </p>
          </section>

          {/* Section 5: Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
            <p className="text-muted-foreground">
              You can access, update, or delete your account data at any time. To delete your
              account and all associated data, contact us at{' '}
              <a
                href="mailto:yunus+openarabic@edenmind.com"
                className="text-primary hover:underline"
              >
                yunus+openarabic@edenmind.com
              </a>
              .
            </p>
          </section>

          {/* Section 6: Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground">
              OpenArabic is not intended for children under 13. We do not knowingly collect
              information from children under 13.
            </p>
          </section>

          {/* Section 7: Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy from time to time. We will notify you of
              significant changes through the app or by email.
            </p>
          </section>

          {/* Section 8: Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p className="text-muted-foreground">
              Questions about privacy? Contact us at{' '}
              <a
                href="mailto:yunus+openarabic@edenmind.com"
                className="text-primary hover:underline"
              >
                yunus+openarabic@edenmind.com
              </a>
              . We will respond to your inquiry as soon as possible.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
