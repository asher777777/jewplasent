import React, { useEffect } from 'react';
import { useAdmin } from '../contexts/AdminContext.tsx';

export interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'course';
  schemaData?: Record<string, any>;
  keywords?: string[];
  pageKey?: string;
}

const DEFAULT_TITLE = 'חוויה של סדנה | ניידות חב"ד ישראל';
const FALLBACK_DESCRIPTION = 'סדנאות יצירה חווייתיות וערכיות סביב מעגל השנה היהודי לכל הגילאים. תכנית מאושרת במערכת גפ"ן (19053).';
const FALLBACK_IMAGE = 'https://firebasestorage.googleapis.com/v0/b/chabad-workshops-cms-files/o/site%2Flogo_1767863965088?alt=media&token=b45fef20-47ee-456e-b050-dd612571cd43';

export const SeoHead: React.FC<SeoProps> = ({
  title,
  description,
  image,
  url,
  type = 'website',
  schemaData,
  keywords = [],
  pageKey
}) => {
  const { settings, getContent } = useAdmin();

  // Dynamic global defaults from Firestore settings
  const siteLogo = settings?.siteLogo || FALLBACK_IMAGE;
  const siteDescription = settings?.siteDescription || FALLBACK_DESCRIPTION;
  const siteName = settings?.siteName || 'חוויה של סדנה';

  // Support direct page overrides from Firestore if pageKey provided
  const overriddenTitle = pageKey ? getContent(`seo_title_${pageKey}`, title) : title;
  const overriddenDesc = pageKey ? getContent(`seo_desc_${pageKey}`, description) : description;
  const overriddenImage = pageKey ? getContent(`seo_image_${pageKey}`, image) : image;

  const fullTitle = overriddenTitle 
    ? (overriddenTitle.includes(siteName) ? overriddenTitle : `${overriddenTitle} | ${siteName}`) 
    : DEFAULT_TITLE;

  // If overriddenDesc is generic ("ניידות חב"ד ישראל"), use the page's specific rich description
  const isGenericDesc = !overriddenDesc || overriddenDesc.trim() === 'ניידות חב"ד ישראל' || overriddenDesc.trim() === siteDescription.trim();
  const rawDescription = (!isGenericDesc ? overriddenDesc : (description || siteDescription)) || siteDescription;

  const cleanDescription = rawDescription
    .replace(/<[^>]*>?/gm, '') // strip any html tags
    .replace(/\s+/g, ' ')      // clean multiple whitespaces
    .trim()
    .slice(0, 160);

  const effectiveImage = overriddenImage || siteLogo;
  const fullUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://chabad-workshops-cms.web.app');

  useEffect(() => {
    // 1. Update Document Title
    document.title = fullTitle;

    // 2. Update Browser Tab Favicons Dynamically (Logo in Browser Tabs)
    const updateFavicon = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };
    updateFavicon('icon', siteLogo);
    updateFavicon('shortcut icon', siteLogo);
    updateFavicon('apple-touch-icon', siteLogo);

    // Helper to set or create meta tags
    const setMetaTag = (attribute: 'name' | 'property', attrValue: string, content: string) => {
      let meta = document.querySelector(`meta[${attribute}="${attrValue}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, attrValue);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // 3. Standard Meta Tags
    setMetaTag('name', 'description', cleanDescription);
    const effectiveKeywords = keywords.length > 0 ? keywords : ["סדנאות יצירה", "חב\"ד", "גפ\"ן 19053", "מעגל השנה", "סדנאות לילדים"];
    setMetaTag('name', 'keywords', effectiveKeywords.join(', '));

    // 4. Open Graph (WhatsApp, Facebook, LinkedIn, Slack, Telegram)
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', cleanDescription);
    setMetaTag('property', 'og:image', effectiveImage);
    setMetaTag('property', 'og:image:alt', overriddenTitle || siteName);
    setMetaTag('property', 'og:url', fullUrl);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:site_name', `${siteName} - ניידות חב"ד`);
    setMetaTag('property', 'og:locale', 'he_IL');

    // 5. Twitter Cards / X
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', cleanDescription);
    setMetaTag('name', 'twitter:image', effectiveImage);

    // 6. Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    // 7. Structured Data / Schema.org JSON-LD (Essential for Google Rich Results & AIEO)
    let schemaScript = document.getElementById('schema-org-jsonld') as HTMLScriptElement;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'schema-org-jsonld';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }

    const defaultSchema = {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: `${siteName} - ניידות חב"ד ישראל`,
      url: 'https://chabad-workshops-cms.web.app',
      logo: siteLogo,
      description: siteDescription,
      telephone: '+972-58-432-7701',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IL',
        addressLocality: 'פריסה ארצית'
      }
    };

    schemaScript.textContent = JSON.stringify(schemaData || defaultSchema, null, 2);
  }, [fullTitle, cleanDescription, effectiveImage, fullUrl, type, schemaData, keywords, siteLogo, siteDescription, siteName, overriddenTitle]);

  return null;
};

export default SeoHead;
