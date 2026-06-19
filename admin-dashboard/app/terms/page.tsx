import type { Metadata } from 'next';
import { TermsContent } from './terms-content';

export const metadata: Metadata = {
  title: 'Terms of Service - OpenArabic',
  description:
    'The terms governing your use of OpenArabic — our service, your account, acceptable use, content rights, and data.',
  alternates: { canonical: 'https://openarabic.io/terms' },
};

export default function TermsOfServicePage() {
  return <TermsContent />;
}
