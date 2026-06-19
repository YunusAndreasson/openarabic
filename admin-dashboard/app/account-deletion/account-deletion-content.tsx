'use client';

import { useState, useEffect } from 'react';
import { Footer } from '@/components/footer';
import { PublicHeader } from '@/components/public-header';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Category = Database['public']['Tables']['categories']['Row'];

export function AccountDeletionContent() {
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
        <h1 className="text-3xl font-bold mb-6">Account Deletion Request</h1>

        <div className="prose prose-gray max-w-none">
          <div className="bg-muted/30 border border-border rounded-lg p-4 mb-8">
            <p className="text-sm text-muted-foreground">
              <strong>OpenArabic</strong> by{' '}
              <a
                href="https://andreassonphoto.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                <strong>Yunus Andreasson</strong>
              </a>
            </p>
          </div>

          <p className="text-muted-foreground mb-8">
            To delete your OpenArabic account and data, follow the steps below.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">How to Request Account Deletion</h2>
            <div className="bg-muted/30 border border-border rounded-lg p-6">
              <p className="mb-4">Send an email to:</p>
              <div className="bg-background border border-border rounded-lg p-4">
                <a
                  href="mailto:support@openarabic.io?subject=Account Deletion Request"
                  className="text-primary font-medium hover:underline text-lg"
                >
                  support@openarabic.io
                </a>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">What Gets Deleted</h2>
            <p className="mb-4">When you request account deletion, the following data will be permanently removed:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Your account profile and authentication credentials</li>
              <li>Your reading progress and article history</li>
              <li>Your vocabulary learning data and practice records</li>
              <li>Your personal preferences and settings</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              All data is deleted within <strong>7 business days</strong> after verification. No personal data is retained.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Verification Process</h2>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
              <li>We send a verification link to your email</li>
              <li>Click the link to confirm deletion</li>
              <li>Your account will be deleted within 7 business days</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Important Notes</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Email verification is required to confirm the deletion request</li>
              <li>Account deletion is permanent and cannot be undone</li>
              <li>Processing time: within 7 business days after verification</li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
