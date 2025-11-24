#!/usr/bin/env node

/**
 * Comprehensive Sitemap Generator for ZYURA
 * 
 * Generates a complete sitemap.xml with all pages:
 * - Homepage
 * - Dashboard
 * - API documentation pages (if any)
 * - Proper SEO tags
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zyura.vercel.app';
const SITEMAP_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml');
const SITEMAP_INDEX_PATH = path.join(__dirname, '..', 'public', 'sitemap-index.xml');

// Main pages
const MAIN_PAGES = [
  {
    path: '',
    priority: '1.0',
    changefreq: 'daily',
    description: 'ZYURA - Instant, fair, community-owned flight-delay insurance on Solana'
  },
  {
    path: 'dashboard',
    priority: '0.9',
    changefreq: 'daily',
    description: 'ZYURA Dashboard - Manage your flight delay insurance policies'
  }
];

/**
 * Generate URL entry
 */
function generateUrlEntry(page) {
  const url = `${BASE_URL}/${page.path}`.replace(/\/$/, '') || BASE_URL;
  const lastmod = new Date().toISOString();
  
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
}

/**
 * Generate the complete sitemap
 */
function generateSitemap() {
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

  // Add all main pages
  console.log('Generating main page URLs...');
  MAIN_PAGES.forEach(page => {
    sitemap += `\n${generateUrlEntry(page)}`;
  });

  // Add sitemap metadata
  console.log('Adding sitemap metadata...');
  sitemap += `\n  <!-- Sitemap generated on ${new Date().toISOString()} -->`;
  sitemap += `\n  <!-- Total URLs: ${MAIN_PAGES.length} -->`;
  sitemap += `\n  <!-- Base URL: ${BASE_URL} -->`;

  sitemap += `\n</urlset>`;

  return sitemap;
}

/**
 * Generate sitemap index for better organization
 */
function generateSitemapIndex() {
  const lastmod = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>`;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting ZYURA sitemap generation...');
  console.log(`📁 Output path: ${SITEMAP_PATH}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📄 Pages: ${MAIN_PAGES.length}`);
  
  try {
    // Generate sitemap
    const sitemap = generateSitemap();
    
    // Ensure directory exists
    const dir = path.dirname(SITEMAP_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write sitemap
    fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf8');
    
    // Generate and write sitemap index
    const sitemapIndex = generateSitemapIndex();
    fs.writeFileSync(SITEMAP_INDEX_PATH, sitemapIndex, 'utf8');
    
    // Calculate statistics
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    
    console.log('\n✅ Sitemap generated successfully!');
    console.log(`📊 Statistics:`);
    console.log(`   - Total URLs: ${urlCount}`);
    console.log(`   - Pages: ${MAIN_PAGES.length}`);
    console.log(`\n📄 Files generated:`);
    console.log(`   - Main sitemap: ${SITEMAP_PATH}`);
    console.log(`   - Sitemap index: ${SITEMAP_INDEX_PATH}`);
    console.log(`\n🌐 URLs:`);
    console.log(`   - Sitemap: ${BASE_URL}/sitemap.xml`);
    console.log(`   - Sitemap index: ${BASE_URL}/sitemap-index.xml`);
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateSitemap, MAIN_PAGES };

