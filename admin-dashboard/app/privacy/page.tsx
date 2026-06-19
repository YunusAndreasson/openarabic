import type { Metadata } from 'next';
import { PrivacyContent } from './privacy-content';

export const metadata: Metadata = {
  title: 'Privacy Policy - OpenArabic',
  description:
    'How OpenArabic collects, uses, and protects your data — account information, learning data, analytics, and your privacy rights.',
  alternates: { canonical: 'https://openarabic.io/privacy' },
};

export default function PrivacyPolicyPage() {
  return <PrivacyContent />;
}
