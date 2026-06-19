const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * Google Analytics 4 — the standard gtag.js global site tag.
 *
 * Rendered directly inside <head> (see layout.tsx) as raw <script> tags rather
 * than via next/script, because Search Console's "Google Analytics" ownership
 * verification only accepts the tag in <head>. Renders nothing unless
 * NEXT_PUBLIC_GA_ID is set. Coexists with the app's existing Mixpanel tracking.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`,
        }}
      />
    </>
  );
}
