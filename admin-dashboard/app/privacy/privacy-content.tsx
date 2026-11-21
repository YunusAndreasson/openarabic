'use client';

import { useState, useEffect } from 'react';
import { AnalyticsChoicePanel } from '@/components/analytics-consent';
import { Footer } from '@/components/footer';
import { PublicHeader } from '@/components/public-header';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Category = Database['public']['Tables']['categories']['Row'];

export function PrivacyContent() {
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
        <p className="text-sm text-muted-foreground mb-8">
          Effective Date: January 1, 2025. Last updated: October 31, 2026.
        </p>

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

            <h3 className="text-lg font-semibold mb-2">Voice Answers</h3>
            <p className="text-muted-foreground mb-4">
              If you answer by voice in the app, your voice is transcribed on your device and the
              audio is never uploaded. The text of your answer is saved.
            </p>

            <h3 className="text-lg font-semibold mb-2">Usage Analytics</h3>
            <p className="text-muted-foreground mb-4">
              In the app, we use Mixpanel to record events like sign in, sign up, practice sessions
              and the title and category of the texts you open, linked to your account. On this
              website, and only if you agree, we use Google Analytics to see how visitors find and
              use it. This helps us understand how the app and website are used and improve them.
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
              We use Mixpanel in the app to understand which features get used and to improve the
              learning experience. Its events are linked to your account. The app does not currently
              ask before sending them.
            </p>

            <h3 className="text-lg font-semibold mb-2">Meta (Facebook)</h3>
            <p className="text-muted-foreground mb-4">
              The app sends a small number of app events to Meta, so we can tell whether an ad was
              worth running: that the app was opened, an account was created, the intro was
              finished, or a practice session was completed, along with the technical details the
              Meta SDK attaches, such as device model and system version. On Android your device
              advertising ID is included. This applies whether or not you installed from an ad, and the app does
              not currently ask first. We do not send Meta your name, your email or what you study,
              and we never ask to track you across other apps.
            </p>

            <h3 id="analytics" className="text-lg font-semibold mb-2 scroll-mt-24">
              Google Analytics
            </h3>
            <p className="text-muted-foreground mb-4">
              Only if you agree on this website, we use Google Analytics to see how visitors find
              and use it, such as page views and referral sources. It sets cookies, and the data
              goes to Google. Because this site is about Islamic texts, visits could suggest your
              beliefs. If you refuse, or make no choice, nothing is loaded from Google and no
              analytics cookie is set. Your choice is stored in your browser, and it applies to this
              website, not the app. You can change it at any time here. Without JavaScript, Google
              Analytics cannot run and there is nothing to choose.
            </p>
            <div className="mb-4">
              <AnalyticsChoicePanel />
            </div>

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
