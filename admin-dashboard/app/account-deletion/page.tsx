import type { Metadata } from 'next';
import { AccountDeletionContent } from './account-deletion-content';

export const metadata: Metadata = {
  title: 'Account Deletion - OpenArabic',
  description:
    'How to permanently delete your OpenArabic account and data, what gets removed, and the verification process.',
  alternates: { canonical: 'https://openarabic.io/account-deletion' },
};

export default function AccountDeletionPage() {
  return <AccountDeletionContent />;
}
