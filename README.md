# Houzz Professional Scraper

Extract comprehensive professional and contractor data from Houzz.com quickly and reliably. This scraper collects detailed information about professionals including contact details, ratings, reviews, and location data.

## What does Houzz Professional Scraper do?

This actor scrapes professional listings from Houzz.com, extracting detailed information about contractors, architects, interior designers, and other home improvement professionals. It uses advanced JSON extraction techniques for maximum speed and reliability.

**Key capabilities:**
- Fast JSON-based data extraction
- Automatic pagination handling
- Comprehensive professional information
- Flexible search by profession and location
- Deduplication of results
- Proxy support for reliable scraping

## Why scrape Houzz professionals?

<h3>Lead Generation</h3>

Build targeted lists of contractors and professionals for B2B outreach, partnerships, or market analysis.

<h3>Market Research</h3>

Analyze professional distribution, pricing trends, and service availability across different locations and specialties.

<h3>Competitive Analysis</h3>

Track competitor ratings, reviews, and service offerings to improve your own business strategy.

<h3>Data Enrichment</h3>

Enhance existing databases with verified professional contact information and business details.

## Features

✅ **Multiple extraction methods** - JSON parsing, JSON-LD, and HTML fallback for maximum reliability  
✅ **Automatic pagination** - Seamlessly handles multi-page results  
✅ **Comprehensive data** - Name, address, phone, ratings, reviews, and more  
✅ **Flexible input** - Search by profession/location or provide direct URLs  
✅ **Deduplication** - Automatically removes duplicate entries  
✅ **Proxy support** - Built-in Apify Proxy integration to avoid blocking  
✅ **Fast performance** - Optimized for speed and cost-efficiency  

## How to use

<h3>Basic Usage</h3>

1. **Choose your search method:**
   - **Option A:** Enter profession and location (e.g., "carpenter" in "Boston")
   - **Option B:** Provide direct Houzz search URLs

2. **Configure limits:**
   - Set maximum number of professionals to collect
   - Set maximum pages to visit (15 professionals per page)

3. **Run the actor** and download results in JSON, CSV, or Excel format

<h3>Example Configuration</h3>

```json
{
  "profession": "carpenter",
  "location": "Boston",
  "results_wanted": 50,
  "max_pages": 5,
  "collectDetails": true
}
```

<h3>Using Direct URLs</h3>

```json
{
  "startUrls": [
    {
      "url": "https://www.houzz.com/professionals/carpenter/probr0-bo~t_11831"
    },
    {
      "url": "https://www.houzz.com/professionals/plumber/new-york"
    }
  ],
  "results_wanted": 100
}
```

## Input Configuration

<table>
<tr>
<th>Field</th>
<th>Type</th>
<th>Description</th>
<th>Required</th>
</tr>

<tr>
<td><strong>startUrls</strong></td>
<td>Array</td>
<td>Direct Houzz professional search URLs. If provided, overrides profession/location.</td>
<td>No</td>
</tr>

<tr>
<td><strong>profession</strong></td>
<td>String</td>
<td>Type of professional (e.g., "carpenter", "plumber", "electrician", "architect", "interior-designer")</td>
<td>No</td>
</tr>

<tr>
<td><strong>location</strong></td>
<td>String</td>
<td>City name or Houzz location code (e.g., "Boston", "New York", "probr0-bo")</td>
<td>No</td>
</tr>

<tr>
<td><strong>collectDetails</strong></td>
<td>Boolean</td>
<td>Extract comprehensive professional information (default: true)</td>
<td>No</td>
</tr>

<tr>
<td><strong>results_wanted</strong></td>
<td>Integer</td>
<td>Maximum number of professionals to collect (default: 50)</td>
<td>No</td>
</tr>

<tr>
<td><strong>max_pages</strong></td>
<td>Integer</td>
<td>Maximum pages to visit - safety limit (default: 10, 15 professionals per page)</td>
<td>No</td>
</tr>

<tr>
<td><strong>proxyConfiguration</strong></td>
<td>Object</td>
<td>Proxy settings - residential proxies recommended</td>
<td>No</td>
</tr>

<tr>
<td><strong>dedupe</strong></td>
<td>Boolean</td>
<td>Remove duplicate professionals (default: true)</td>
<td>No</td>
</tr>
</table>

## Output Format

Each professional record contains the following fields:

```json
{
  "name": "Rick's Woodworking",
  "address": "123 Main Street, Boston, MA 02101",
  "city": "Boston",
  "state": "MA",
  "zip": "02101",
  "country": "US",
  "phone": "+1-617-555-0123",
  "latitude": 42.3601,
  "longitude": -71.0589,
  "rating": 4.9,
  "review_count": 117,
  "description": "Custom woodworking and carpentry services...",
  "profile_url": "https://www.houzz.com/professionals/carpenter/ricks-woodworking-pfvwus-pf~123456",
  "image_url": "https://st.hzcdn.com/...",
  "professional_id": "123456"
}
```

<h3>Output Fields</h3>

<table>
<tr>
<th>Field</th>
<th>Type</th>
<th>Description</th>
</tr>
<tr>
<td><strong>name</strong></td>
<td>String</td>
<td>Professional or company name</td>
</tr>
<tr>
<td><strong>address</strong></td>
<td>String</td>
<td>Full formatted address</td>
</tr>
<tr>
<td><strong>city</strong></td>
<td>String</td>
<td>City name</td>
</tr>
<tr>
<td><strong>state</strong></td>
<td>String</td>
<td>State or province code</td>
</tr>
<tr>
<td><strong>zip</strong></td>
<td>String</td>
<td>Postal/ZIP code</td>
</tr>
<tr>
<td><strong>country</strong></td>
<td>String</td>
<td>Country code</td>
</tr>
<tr>
<td><strong>phone</strong></td>
<td>String</td>
<td>Contact phone number</td>
</tr>
<tr>
<td><strong>latitude</strong></td>
<td>Number</td>
<td>Geographic latitude</td>
</tr>
<tr>
<td><strong>longitude</strong></td>
<td>Number</td>
<td>Geographic longitude</td>
</tr>
<tr>
<td><strong>rating</strong></td>
<td>Number</td>
<td>Average rating (0-5 scale)</td>
</tr>
<tr>
<td><strong>review_count</strong></td>
<td>Number</td>
<td>Total number of reviews</td>
</tr>
<tr>
<td><strong>description</strong></td>
<td>String</td>
<td>Professional bio or company description</td>
</tr>
<tr>
<td><strong>profile_url</strong></td>
<td>String</td>
<td>Full Houzz profile URL</td>
</tr>
<tr>
<td><strong>image_url</strong></td>
<td>String</td>
<td>Profile or logo image URL</td>
</tr>
<tr>
<td><strong>professional_id</strong></td>
<td>String</td>
<td>Unique Houzz professional identifier</td>
</tr>
</table>

## Use Cases

<h3>🏗️ Construction & Contracting</h3>

Build databases of contractors for project bidding, subcontractor sourcing, or partnership opportunities.

<h3>📊 Market Analysis</h3>

Analyze professional density, service availability, and pricing across different markets and regions.

<h3>🎯 Sales & Marketing</h3>

Generate targeted lead lists for B2B sales, marketing campaigns, or business development initiatives.

<h3>🔍 Competitive Intelligence</h3>

Monitor competitor ratings, review trends, and service offerings to inform business strategy.

<h3>📱 App Development</h3>

Populate professional directories, comparison tools, or recommendation engines with verified data.

<h3>📈 Business Intelligence</h3>

Enrich CRM systems, market research databases, or analytics platforms with professional data.

## Performance Tips

<h3>Optimize Speed</h3>

- Use reasonable `results_wanted` values (50-200) for faster runs
- Enable proxy configuration to avoid rate limiting
- Set appropriate `max_pages` to control execution time

<h3>Reduce Costs</h3>

- Start with smaller batches to test your configuration
- Use datacenter proxies for non-sensitive scraping
- Enable deduplication to avoid processing duplicates

<h3>Improve Reliability</h3>

- Always use Apify Proxy (residential recommended)
- Keep `maxConcurrency` at default (5) to avoid blocking
- Monitor run logs for extraction method used (JSON preferred)

## Troubleshooting

<h3>No results returned</h3>

**Solution:** Verify your profession and location are valid. Try using a direct Houzz URL in `startUrls` instead.

<h3>Incomplete data fields</h3>

**Solution:** Some professionals may not have all fields populated on Houzz. This is expected behavior.

<h3>Scraper timing out</h3>

**Solution:** Reduce `results_wanted` or `max_pages`. Enable proxy configuration if not already active.

<h3>Duplicate results</h3>

**Solution:** Ensure `dedupe` is set to `true` in your input configuration.

<h3>Blocked or rate limited</h3>

**Solution:** Enable Apify Proxy with residential proxies. Reduce concurrency if issues persist.

## Legal and Ethical Considerations

<h3>Responsible Scraping</h3>

- Respect robots.txt and terms of service
- Use reasonable rate limits and delays
- Only collect publicly available information
- Comply with data protection regulations (GDPR, CCPA)
- Do not use scraped data for spam or harassment

<h3>Data Privacy</h3>

All data collected is publicly available on Houzz.com. Ensure your use of this data complies with applicable privacy laws and regulations.

<h3>Terms of Service</h3>

Review and comply with Houzz's Terms of Service before scraping. This tool is for educational and research purposes.

## Support

Need help or have questions? Contact Apify support or check the [Apify documentation](https://docs.apify.com).

---

**Note:** This scraper extracts publicly available data from Houzz.com. Always ensure your use complies with applicable laws and Houzz's terms of service.