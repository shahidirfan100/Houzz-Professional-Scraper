// Houzz Professional Scraper - Production-ready with stealth features
import { Actor, log } from 'apify';
import { CheerioCrawler, Dataset } from 'crawlee';
import { load as cheerioLoad } from 'cheerio';
import { HeaderGenerator } from 'header-generator';

// Single-entrypoint main
await Actor.init();

// Initialize header generator for realistic browser headers
const headerGenerator = new HeaderGenerator({
    browsers: [
        { name: 'chrome', minVersion: 120, maxVersion: 131 },
        { name: 'firefox', minVersion: 120, maxVersion: 132 },
        { name: 'edge', minVersion: 120, maxVersion: 131 },
    ],
    devices: ['desktop'],
    operatingSystems: ['windows', 'macos'],
    locales: ['en-US', 'en-GB'],
});

// Random delay helper
const randomDelay = (min, max) => new Promise(resolve =>
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
);

async function main() {
    try {
        const input = (await Actor.getInput()) || {};
        const {
            profession = '',
            location = '',
            results_wanted: RESULTS_WANTED_RAW = 50,
            max_pages: MAX_PAGES_RAW = 10,
            collectDetails = true,
            startUrl,
            startUrls,
            url,
            proxyConfiguration,
            dedupe = true, // Always enabled internally
        } = input;

        const RESULTS_WANTED = Number.isFinite(+RESULTS_WANTED_RAW) ? Math.max(1, +RESULTS_WANTED_RAW) : Number.MAX_SAFE_INTEGER;
        const MAX_PAGES = Number.isFinite(+MAX_PAGES_RAW) ? Math.max(1, +MAX_PAGES_RAW) : 999;
        const PROFESSIONALS_PER_PAGE = 15;

        const toAbs = (href, base = 'https://www.houzz.com') => {
            try { return new URL(href, base).href; } catch { return null; }
        };

        const cleanText = (html) => {
            if (!html) return '';
            const $ = cheerioLoad(html);
            $('script, style, noscript, iframe').remove();
            return $.root().text().replace(/\s+/g, ' ').trim();
        };

        // Build Houzz professional search URL
        const buildStartUrl = (prof, loc) => {
            if (!prof && !loc) return 'https://www.houzz.com/professionals';

            const profSlug = String(prof || '').trim().toLowerCase().replace(/\s+/g, '-');
            const locSlug = String(loc || '').trim().toLowerCase().replace(/\s+/g, '-');

            if (profSlug && locSlug) {
                return `https://www.houzz.com/professionals/${profSlug}/${locSlug}`;
            } else if (profSlug) {
                return `https://www.houzz.com/professionals/${profSlug}`;
            } else {
                return `https://www.houzz.com/professionals`;
            }
        };

        const initial = [];
        if (Array.isArray(startUrls) && startUrls.length) {
            startUrls.forEach(item => {
                if (typeof item === 'string') initial.push(item);
                else if (item && item.url) initial.push(item.url);
            });
        }
        if (startUrl) initial.push(startUrl);
        if (url) initial.push(url);
        if (!initial.length) initial.push(buildStartUrl(profession, location));

        const proxyConf = proxyConfiguration ? await Actor.createProxyConfiguration({ ...proxyConfiguration }) : undefined;

        let saved = 0;
        const seenUrls = new Set();

        // Extract professional data from hz-ctx JSON (Priority 1)
        function extractFromHzCtx($) {
            try {
                const script = $('#hz-ctx');
                if (!script || !script.length) return null;

                const jsonText = script.html();
                if (!jsonText) return null;

                const ctx = JSON.parse(jsonText);
                const stores = ctx?.data?.stores?.data;
                if (!stores) return null;

                const professionalStore = stores.ProfessionalStore?.data || {};
                const userStore = stores.UserStore?.data || {};
                const viewStore = stores.ViewProfessionalsStore?.data || {};

                const professionals = [];
                const proIds = Object.keys(professionalStore);

                for (const proId of proIds) {
                    const pro = professionalStore[proId];
                    if (!pro) continue;

                    // Get corresponding user data (contains name and image)
                    const userId = pro.userId || proId;
                    const user = userStore[userId] || {};

                    // Build profile URL from slug or ID
                    let profileUrl = null;
                    if (user.houzzLink) {
                        profileUrl = toAbs(user.houzzLink);
                    } else if (pro.seoHint?.paths?.ViewProfessional?.titleSlug) {
                        const slug = pro.seoHint.paths.ViewProfessional.titleSlug;
                        profileUrl = `https://www.houzz.com/professionals/${slug}`;
                    } else {
                        profileUrl = `https://www.houzz.com/pro/${userId}`;
                    }

                    // Build image URL from profileImageId
                    let imageUrl = null;
                    if (user.profileImageId) {
                        imageUrl = `https://st.hzcdn.com/simgs/${user.profileImageId}_0-2801/_.jpg`;
                    }

                    // Convert rating from integer (49 = 4.9) to decimal
                    let rating = null;
                    if (pro.reviewRating !== null && pro.reviewRating !== undefined) {
                        rating = pro.reviewRating / 10;
                    }

                    const item = {
                        name: user.displayName || null,
                        address: pro.formattedAddress || null,
                        city: pro.city || null,
                        state: pro.state || null,
                        zip: pro.zip || null,
                        country: pro.country || null,
                        phone: pro.formattedPhone || null,
                        latitude: pro.latitude || null,
                        longitude: pro.longitude || null,
                        rating: rating,
                        review_count: pro.numReviews || null,
                        description: pro.aboutMe || null,
                        profile_url: profileUrl,
                        image_url: imageUrl,
                        professional_id: userId,
                    };

                    professionals.push(item);
                }

                return {
                    professionals,
                    pagination: viewStore.paginationObject || viewStore.paginationResponse || null,
                };
            } catch (err) {
                log.warning(`Failed to extract from hz-ctx: ${err.message}`);
                return null;
            }
        }

        // Extract from JSON-LD (Priority 2)
        function extractFromJsonLd($) {
            const scripts = $('script[type="application/ld+json"]');
            const professionals = [];

            for (let i = 0; i < scripts.length; i++) {
                try {
                    const parsed = JSON.parse($(scripts[i]).html() || '');
                    const arr = Array.isArray(parsed) ? parsed : [parsed];

                    for (const e of arr) {
                        if (!e) continue;
                        const t = e['@type'] || e.type;
                        if (t === 'LocalBusiness' || (Array.isArray(t) && t.includes('LocalBusiness'))) {
                            const item = {
                                name: e.name || null,
                                address: e.address?.streetAddress || null,
                                city: e.address?.addressLocality || null,
                                state: e.address?.addressRegion || null,
                                zip: e.address?.postalCode || null,
                                country: e.address?.addressCountry || null,
                                phone: e.telephone || null,
                                latitude: e.geo?.latitude || null,
                                longitude: e.geo?.longitude || null,
                                rating: e.aggregateRating?.ratingValue || null,
                                review_count: e.aggregateRating?.reviewCount || null,
                                description: e.description || null,
                                profile_url: e.url || e.sameAs?.[0] || null,
                                image_url: e.image || null,
                            };

                            professionals.push(item);
                        }
                    }
                } catch (e) { /* ignore parsing errors */ }
            }

            return professionals.length > 0 ? professionals : null;
        }

        // Extract from HTML (Priority 3)
        function extractFromHtml($, baseUrl) {
            const professionals = [];
            const cards = $('.hz-pro-ctl');

            cards.each((_, card) => {
                const $card = $(card);

                const name = $card.find('span.hz-track-me').first().text().trim() ||
                    $card.find('span').first().text().trim() || null;

                const ratingText = $card.find('span.hz-star-rating').text().trim() ||
                    $card.find('[class*="rating"]').text().trim() || null;
                const rating = ratingText ? parseFloat(ratingText.match(/[\d.]+/)?.[0]) : null;

                const reviewText = $card.find('span.hz-star-rate__review-string').text().trim() ||
                    $card.find('[class*="review"]').text().trim() || null;
                const review_count = reviewText ? parseInt(reviewText.match(/\d+/)?.[0]) : null;

                const addressParts = [];
                $card.find('span').each((_, span) => {
                    const text = $(span).text().trim();
                    if (text && text.length > 3 && !text.includes('★') && !text.includes('Review')) {
                        addressParts.push(text);
                    }
                });

                const profileUrl = $card.attr('href') ? toAbs($card.attr('href'), baseUrl) : null;

                const item = {
                    name,
                    address: addressParts.slice(1, 3).join(', ') || null,
                    city: null,
                    state: null,
                    zip: null,
                    country: null,
                    phone: null,
                    latitude: null,
                    longitude: null,
                    rating,
                    review_count,
                    description: null,
                    profile_url: profileUrl,
                    image_url: null,
                };

                if (name || profileUrl) {
                    professionals.push(item);
                }
            });

            return professionals.length > 0 ? professionals : null;
        }

        // Build pagination URL
        function buildPaginationUrl(baseUrl, pageNumber) {
            try {
                const url = new URL(baseUrl);
                const offset = pageNumber * PROFESSIONALS_PER_PAGE;
                url.searchParams.set('fi', offset.toString());
                return url.href;
            } catch {
                return `${baseUrl}?fi=${pageNumber * PROFESSIONALS_PER_PAGE}`;
            }
        }

        const crawler = new CheerioCrawler({
            proxyConfiguration: proxyConf,
            maxRequestRetries: 6,
            useSessionPool: true,
            sessionPoolOptions: {
                maxPoolSize: 50,
                sessionOptions: {
                    maxUsageCount: 8, // Balanced rotation for speed
                    maxErrorScore: 2, // Lower tolerance for errors
                },
            },
            maxConcurrency: 3, // Balanced concurrency for speed and stealth
            minConcurrency: 1,
            requestHandlerTimeoutSecs: 180,
            navigationTimeoutSecs: 120,

            // Pre-navigation hook for stealth headers
            preNavigationHooks: [
                async ({ request }, gotoOptions) => {
                    // Generate realistic browser headers
                    const headers = headerGenerator.getHeaders({
                        operatingSystem: 'windows',
                        browsers: ['chrome'],
                        devices: ['desktop'],
                        locales: ['en-US'],
                        httpVersion: '2',
                    });

                    // Merge with additional stealth headers
                    request.headers = {
                        ...headers,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br, zstd',
                        'Cache-Control': 'max-age=0',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1',
                        'Referer': 'https://www.google.com/',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                    };

                    // Add balanced random delay before request (human-like behavior)
                    await randomDelay(2000, 4000);
                },
            ],

            async requestHandler({ request, $, enqueueLinks, log: crawlerLog }) {
                const label = request.userData?.label || 'LIST';
                const pageNo = request.userData?.pageNo || 0;
                const baseUrl = request.userData?.baseUrl || request.url.split('?')[0];

                crawlerLog.info(`Processing ${label} page ${pageNo + 1} - ${request.url}`);

                if (label === 'LIST') {
                    let professionals = [];

                    // Try extraction methods in priority order
                    const hzCtxData = extractFromHzCtx($);
                    if (hzCtxData && hzCtxData.professionals.length > 0) {
                        professionals = hzCtxData.professionals;
                        crawlerLog.info(`✅ Extracted ${professionals.length} professionals from hz-ctx JSON`);
                    } else {
                        const jsonLdData = extractFromJsonLd($);
                        if (jsonLdData && jsonLdData.length > 0) {
                            professionals = jsonLdData;
                            crawlerLog.info(`✅ Extracted ${professionals.length} professionals from JSON-LD`);
                        } else {
                            const htmlData = extractFromHtml($, request.url);
                            if (htmlData && htmlData.length > 0) {
                                professionals = htmlData;
                                crawlerLog.info(`✅ Extracted ${professionals.length} professionals from HTML`);
                            }
                        }
                    }

                    if (professionals.length === 0) {
                        crawlerLog.warning(`⚠️ No professionals found on page ${pageNo + 1}`);
                        return;
                    }

                    crawlerLog.info(`📊 Processing ${professionals.length} professionals from page ${pageNo + 1}`);

                    // Filter and save professionals
                    const remaining = RESULTS_WANTED - saved;
                    crawlerLog.info(`📈 Remaining to collect: ${remaining} (Saved so far: ${saved}/${RESULTS_WANTED})`);

                    const toSave = professionals.slice(0, Math.max(0, remaining));
                    crawlerLog.info(`🔍 Candidates for saving: ${toSave.length}`);

                    // Debug: Log first candidate to see what data we have
                    if (toSave[0]) {
                        crawlerLog.info(`🔎 First candidate: ID=${toSave[0].professional_id}, Name=${toSave[0].name}, URL=${toSave[0].profile_url}`);
                    }

                    const filtered = dedupe
                        ? toSave.filter(p => {
                            // Use professional_id as primary deduplication key (most reliable)
                            const dedupeKey = p.professional_id || p.profile_url || p.name;
                            if (!dedupeKey) {
                                crawlerLog.warning(`⚠️ Professional has no valid dedupe key`);
                                return false;
                            }
                            if (seenUrls.has(dedupeKey)) {
                                crawlerLog.debug(`Skipping duplicate ID: ${dedupeKey}`);
                                return false;
                            }
                            seenUrls.add(dedupeKey);
                            return true;
                        })
                        : toSave;

                    crawlerLog.info(`✨ After deduplication: ${filtered.length} professionals to save`);
                    crawlerLog.info(`📝 Total unique IDs tracked: ${seenUrls.size}`);

                    if (filtered.length > 0) {
                        try {
                            // Push data to dataset
                            await Dataset.pushData(filtered);
                            saved += filtered.length;
                            crawlerLog.info(`💾 Successfully saved ${filtered.length} professionals to dataset (Total: ${saved}/${RESULTS_WANTED})`);

                            // Log first professional as sample
                            if (filtered[0]) {
                                crawlerLog.info(`📋 Sample: ${filtered[0].name} - ${filtered[0].city}, ${filtered[0].state}`);
                            }
                        } catch (error) {
                            crawlerLog.error(`❌ Failed to save data to dataset: ${error.message}`);
                            throw error;
                        }
                    } else {
                        crawlerLog.warning(`⚠️ No new professionals to save after filtering (all duplicates)`);
                    }

                    // Check if we need to paginate
                    if (saved < RESULTS_WANTED && pageNo + 1 < MAX_PAGES && professionals.length >= PROFESSIONALS_PER_PAGE) {
                        const nextUrl = buildPaginationUrl(baseUrl, pageNo + 1);

                        // Add balanced delay before enqueuing next page (natural pacing)
                        await randomDelay(3000, 5000);

                        crawlerLog.info(`➡️ Enqueuing next page: ${nextUrl}`);
                        await enqueueLinks({
                            urls: [nextUrl],
                            userData: { label: 'LIST', pageNo: pageNo + 1, baseUrl },
                        });
                    } else {
                        crawlerLog.info(`🏁 Pagination stopped. Saved: ${saved}, PageNo: ${pageNo + 1}, MaxPages: ${MAX_PAGES}`);
                    }
                }
            },

            // Error handler for better debugging
            failedRequestHandler: async ({ request }, error) => {
                log.error(`❌ Request failed: ${request.url}`, {
                    error: error.message,
                    retryCount: request.retryCount,
                });
            },
        });

        await crawler.run(initial.map(u => ({ url: u, userData: { label: 'LIST', pageNo: 0, baseUrl: u.split('?')[0] } })));

        // Final summary
        log.info(`✅ Scraping completed!`);
        log.info(`📊 Total professionals saved: ${saved}`);
        log.info(`🔗 Unique URLs tracked: ${seenUrls.size}`);

        // Verify dataset has data
        const dataset = await Dataset.open();
        const info = await dataset.getInfo();
        log.info(`💾 Dataset contains ${info.itemCount} items`);

        if (info.itemCount === 0 && saved > 0) {
            log.warning(`⚠️ WARNING: Saved counter shows ${saved} but dataset is empty! Data may not have been persisted.`);
        } else if (info.itemCount > 0) {
            log.info(`✅ Data successfully saved to dataset!`);
        }
    } finally {
        await Actor.exit();
    }
}

main().catch(err => { console.error(err); process.exit(1); });
