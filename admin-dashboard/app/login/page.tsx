import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Login - OpenArabic',
  // Admin auth page — no SEO value, keep it out of the index.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
