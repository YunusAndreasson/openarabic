import type { Metadata } from 'next';
import { ContactContent } from './contact-content';

export const metadata: Metadata = {
  title: 'Contact Us - OpenArabic',
  description:
    'Get in touch with the OpenArabic team — report a bug, request a feature, get account help, or ask a general question.',
  alternates: { canonical: 'https://openarabic.io/contact' },
};

export default function ContactPage() {
  return <ContactContent />;
}
