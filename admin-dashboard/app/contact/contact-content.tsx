'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Footer } from '@/components/footer';
import { PublicHeader } from '@/components/public-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle2, Bug, Lightbulb, HelpCircle, MessageSquare, Mail, Twitter, Instagram, Facebook } from 'lucide-react';

type Category = Database['public']['Tables']['categories']['Row'];

const SUBJECT_OPTIONS = [
  { value: 'bug', label: 'Bug Report', icon: Bug },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb },
  { value: 'account', label: 'Account Help', icon: HelpCircle },
  { value: 'general', label: 'General Question', icon: MessageSquare },
];

export function ContactContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const selectedSubject = SUBJECT_OPTIONS.find(opt => opt.value === subject);
      const formData = new FormData();
      formData.append('access_key', process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '');
      formData.append('email', email);
      formData.append('subject', `OpenArabic Contact: ${selectedSubject?.label || subject}`);
      formData.append('message', message);

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader
        categories={categories}
        selectedCategoryId={null}
        onSelectCategory={() => {}}
      />

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-16 w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Get in Touch</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have a question or feedback? We&apos;re here to help and would love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Main Form */}
          <div className="md:col-span-2">
            {success && (
              <div className="mb-6 p-5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3 shadow-sm">
                <div className="p-1 bg-green-100 dark:bg-green-900/40 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">Message sent!</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    We&apos;ll get back to you within 24-48 hours.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl shadow-sm">
                <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              What can we help with? <span className="text-destructive">*</span>
            </Label>
            <Select value={subject} onValueChange={setSubject} required disabled={loading}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Choose a topic" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_OPTIONS.map(option => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Tell us how we can help..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              disabled={loading}
              rows={6}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <Button
              type="submit"
              disabled={loading || !email || !subject || !message}
              size="lg"
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Message'
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              We typically respond within 24-48 hours
            </p>
          </div>
        </form>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          By submitting this form, you agree to our{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>

    {/* Sidebar */}
    <div className="space-y-6">
      {/* Quick Contact Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email Us Directly
        </h3>
        <a
          href="mailto:contact@openarabic.io"
          className="text-sm text-primary hover:underline break-all"
        >
          contact@openarabic.io
        </a>
      </div>

      {/* Social Links Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Follow Us</h3>
        <div className="space-y-3">
          <a
            href="https://x.com/openarabicio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="p-2 bg-muted group-hover:bg-muted/80 rounded-lg transition-colors">
              <Twitter className="w-4 h-4" />
            </div>
            <span>Twitter</span>
          </a>
          <a
            href="https://www.instagram.com/openarabic.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="p-2 bg-muted group-hover:bg-muted/80 rounded-lg transition-colors">
              <Instagram className="w-4 h-4" />
            </div>
            <span>Instagram</span>
          </a>
          <a
            href="https://www.facebook.com/OpenArabic.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="p-2 bg-muted group-hover:bg-muted/80 rounded-lg transition-colors">
              <Facebook className="w-4 h-4" />
            </div>
            <span>Facebook</span>
          </a>
        </div>
      </div>
    </div>
  </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
