import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - OpenArabic',
  description: 'Manage articles, authors, categories, and content for OpenArabic',
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
