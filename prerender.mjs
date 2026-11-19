import fs from 'fs';
import path from 'path';
import https from 'https';

const DIST_DIR = path.resolve('dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');
const SITE_DOMAIN = 'https://sadna-jew.com';
const FALLBACK_LOGO = 'https://firebasestorage.googleapis.com/v0/b/chabad-workshops-cms-files/o/site%2Flogo_1767863965088?alt=media&token=b45fef20-47ee-456e-b050-dd612571cd43';

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function cleanText(text, maxLen = 160) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function escapeHtmlAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeUrl(url) {
  if (!url) return '';
  return String(url).replace(/"/g, '&quot;').trim();
}

async function prerender() {
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    console.error('dist/index.html not found! Run vite build first.');
    return;
  }

  const baseHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  // 1. Fetch Overrides from Firestore
  const overridesRes = await fetchJson('https://firestore.googleapis.com/v1/projects/chabad-workshops-cms/databases/(default)/documents/siteSettings/overrides');
  const overrides = {};
  if (overridesRes?.fields?.content?.mapValue?.fields) {
    const fields = overridesRes.fields.content.mapValue.fields;
    for (const [k, v] of Object.entries(fields)) {
      overrides[k] = v.stringValue || v.integerValue || v.booleanValue || (v.arrayValue?.values?.map(x => x.stringValue));
    }
  }

  // 2. Fetch Config
  const configRes = await fetchJson('https://firestore.googleapis.com/v1/projects/chabad-workshops-cms/databases/(default)/documents/siteSettings/config');
  const siteLogo = configRes?.fields?.siteLogo?.stringValue || FALLBACK_LOGO;
  const siteDescription = configRes?.fields?.siteDescription?.stringValue || 'סדנאות יצירה חווייתיות וערכיות סביב מעגל השנה היהודי לכל הגילאים. תכנית מאושרת במערכת גפ"ן (19053).';

  // 3. Load Local Workshops JSON
  let localWorkshops = [];
  try {
    localWorkshops = JSON.parse(fs.readFileSync(path.resolve('workshopsData.json'), 'utf8'));
  } catch (e) {
    console.warn('Could not read workshopsData.json:', e);
  }

  // 4. Fetch Firestore Workshops
  let firestoreWorkshops = [];
  try {
    const fsRes = await fetchJson('https://firestore.googleapis.com/v1/projects/chabad-workshops-cms/databases/(default)/documents/workshops?pageSize=100');
    if (fsRes?.documents) {
      firestoreWorkshops = fsRes.documents.map(d => {
        const f = d.fields || {};
        return {
          id: d.name.split('/').pop(),
          title: f.title?.stringValue || '',
          slug: f.slug?.stringValue || '',
          category: f.category?.stringValue || '',
          description: f.description?.stringValue || '',
          longDescription: f.longDescription?.stringValue || '',
          image: f.image?.stringValue || '',
          images: f.images?.arrayValue?.values?.map(x => x.stringValue) || [],
          isDeleted: f.isDeleted?.booleanValue || false
        };
      }).filter(w => !w.isDeleted);
    }
  } catch (e) {
    console.warn('Could not fetch Firestore workshops:', e);
  }

  // Combine workshops (Firestore takes precedence)
  const allWorkshops = [...firestoreWorkshops];
  for (const lw of localWorkshops) {
    if (!allWorkshops.some(w => String(w.id) === String(lw.id) || (w.slug && w.slug === lw.slug))) {
      allWorkshops.push(lw);
    }
  }

  console.log(`Pre-rendering Open Graph tags for ${allWorkshops.length} workshops...`);

  function injectMeta(html, { title, description, image, url, type = 'article', schemaData = null }) {
    let output = html;

    // Title
    output = output.replace(/<title>.*?<\/title>/i, `<title>${escapeHtmlAttr(title)}</title>`);

    // Standard Description
    output = output.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtmlAttr(description)}" />`);

    // Open Graph
    output = output.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`);
    output = output.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`);
    output = output.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${escapeUrl(image)}" />`);
    output = output.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${escapeUrl(url)}" />`);
    output = output.replace(/<meta property="og:type" content=".*?" \/>/i, `<meta property="og:type" content="${escapeHtmlAttr(type)}" />`);

    // Twitter
    output = output.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`);
    output = output.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />`);
    output = output.replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${escapeUrl(image)}" />`);

    // Canonical
    output = output.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${escapeUrl(url)}" />`);

    // Schema.org JSON-LD
    if (schemaData) {
      const jsonLdStr = JSON.stringify(schemaData);
      output = output.replace(/<script type="application\/ld\+json" id="schema-org-jsonld">[\s\S]*?<\/script>/i, `<script type="application/ld+json" id="schema-org-jsonld">${jsonLdStr}</script>`);
    }

    return output;
  }

  // Generate Workshop Pages
  let count = 0;
  for (const w of allWorkshops) {
    const slug = w.slug || String(w.id);
    const pageKey = `workshop_${slug}`;
    const idKey = `workshop_${w.id}`;

    // Overrides or defaults
    const finalTitle = overrides[`seo_title_${pageKey}`] || overrides[`seo_title_${idKey}`] || `${w.title} | חוויה של סדנה`;
    
    let rawDesc = overrides[`seo_desc_${pageKey}`] || overrides[`seo_desc_${idKey}`] || w.description || w.longDescription || '';
    if (rawDesc === 'ניידות חב"ד ישראל' || rawDesc === siteDescription) {
      rawDesc = w.description || w.longDescription || siteDescription;
    }
    const finalDesc = cleanText(rawDesc, 160);

    let customImage = overrides[`seo_image_${pageKey}`] || overrides[`seo_image_${idKey}`] || '';
    if (customImage === siteLogo || customImage === FALLBACK_LOGO) {
      customImage = '';
    }
    const workshopPhoto = (w.images && w.images[0]) || w.image || '';
    const finalImage = customImage || workshopPhoto || siteLogo;
    const finalUrl = `${SITE_DOMAIN}/workshop/${slug}`;

    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": w.title,
      "description": finalDesc,
      "image": finalImage,
      "url": finalUrl,
      "provider": {
        "@type": "EducationalOrganization",
        "name": "חוויה של סדנה - ניידות חב\"ד ישראל",
        "sameAs": SITE_DOMAIN
      }
    };

    const renderedHtml = injectMeta(baseHtml, {
      title: finalTitle,
      description: finalDesc,
      image: finalImage,
      url: finalUrl,
      type: 'course',
      schemaData
    });

    // Write to dist/workshop/[slug]/index.html
    const targetDir = path.join(DIST_DIR, 'workshop', slug);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'index.html'), renderedHtml, 'utf8');
    count++;

    // Also write to numeric id folder if different
    if (w.id && String(w.id) !== slug) {
      const idDir = path.join(DIST_DIR, 'workshop', String(w.id));
      fs.mkdirSync(idDir, { recursive: true });
      fs.writeFileSync(path.join(idDir, 'index.html'), renderedHtml, 'utf8');
    }
  }

  // Pre-render common categories
  const categories = [
    { slug: 'tishrei', title: 'חודש תשרי' },
    { slug: 'chanukah', title: 'חנוכה' },
    { slug: 'purim', title: 'פורים' },
    { slug: 'pesach', title: 'פסח' },
    { slug: 'shavuot', title: 'שבועות' },
    { slug: 'mitzvot', title: 'מצוות ומעגל השנה' }
  ];

  for (const cat of categories) {
    const pageKey = `category_${cat.slug}`;
    const finalTitle = overrides[`seo_title_${pageKey}`] || `סדנאות ${cat.title} | חוויה של סדנה - ניידות חב"ד`;
    const finalDesc = cleanText(overrides[`seo_desc_${pageKey}`] || `מבחר סדנאות יצירה ותוכן חווייתיות לכבוד ${cat.title} - תכנית מאושרת גפ"ן 19053.`, 160);
    const finalImage = overrides[`seo_image_${pageKey}`] || siteLogo;
    const finalUrl = `${SITE_DOMAIN}/category/${cat.slug}`;

    const renderedHtml = injectMeta(baseHtml, {
      title: finalTitle,
      description: finalDesc,
      image: finalImage,
      url: finalUrl,
      type: 'article'
    });

    const targetDir = path.join(DIST_DIR, 'category', cat.slug);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'index.html'), renderedHtml, 'utf8');
  }

  console.log(`✓ Pre-rendering completed! Successfully generated ${count} workshop pages with dedicated Open Graph metadata.`);
}

prerender();
