'use client';

import { useState, useEffect } from 'react';
import { Footer } from '@/components/footer';
import { PublicHeader } from '@/components/public-header';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Category = Database['public']['Tables']['categories']['Row'];

export default function TermsOfServicePage() {
  usePageTitle('Terms of Service - OpenArabic');
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
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Effective Date: January 1, 2025</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <p className="text-muted-foreground">
            Welcome to OpenArabic. By using our app, you agree to these terms.
          </p>

          {/* Section 1: Our Service */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Our Service</h2>
            <p className="text-muted-foreground">
              OpenArabic is an Arabic language learning platform. We provide articles, audio
              content, vocabulary tools, and spaced repetition learning features for learning
              Arabic.
            </p>
          </section>

          {/* Section 2: Your Account */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Your Account</h2>
            <p className="text-muted-foreground">
              You can create an account using email and password, Apple Sign In, or Google Sign In.
              You are responsible for maintaining the security of your account. Provide accurate
              information and keep your password confidential.
            </p>
          </section>

          {/* Section 3: Acceptable Use */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Acceptable Use</h2>
            <p className="text-muted-foreground">
              Use OpenArabic for personal learning only. Do not attempt to harm the service, access
              it through unauthorized means, or use it for any unlawful purpose.
            </p>
          </section>

          {/* Section 4: Content and Rights */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Content and Rights</h2>
            <p className="text-muted-foreground">
              All content on OpenArabic, including articles, translations, audio, and educational
              materials, is owned by OpenArabic or licensed to us. You may use it for personal
              learning but may not redistribute, republish, or use it commercially.
            </p>
          </section>

          {/* Section 5: Your Data */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Your Data</h2>
            <p className="text-muted-foreground">
              You own your learning data (reading progress, vocabulary lists, practice history). We
              collect and use this data as described in our Privacy Policy to provide and improve
              the service.
            </p>
          </section>

          {/* Section 6: Disclaimers */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Disclaimers</h2>
            <p className="text-muted-foreground">
              OpenArabic is provided &quot;as is&quot; without warranties of any kind. We strive
              for accuracy but cannot guarantee that all content is error-free. Your use of the app
              is at your own risk.
            </p>
          </section>

          {/* Section 7: Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              OpenArabic and its developers are not liable for any indirect, incidental, or
              consequential damages arising from your use of the service.
            </p>
          </section>

          {/* Section 8: Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these terms from time to time. Continued use of OpenArabic after
              changes means you accept the updated terms.
            </p>
          </section>

          {/* Section 9: Termination */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
            <p className="text-muted-foreground">
              We may suspend or terminate your access if you violate these terms. You may stop
              using OpenArabic at any time.
            </p>
          </section>

          {/* Section 10: Contact */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
            <p className="text-muted-foreground">
              Questions about these terms? Contact us at{' '}
              <a
                href="mailto:yunus+openarabic@edenmind.com"
                className="text-primary hover:underline"
              >
                yunus+openarabic@edenmind.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
