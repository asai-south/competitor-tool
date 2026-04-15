export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  const apiKey = process.env.PAGESPEED_API_KEY || '';
  const keyParam = apiKey ? `&key=${apiKey}` : '';

  try {
    const base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
    const [mobileRes, desktopRes] = await Promise.all([
      fetch(`${base}?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=accessibility&category=seo${keyParam}`, {
        signal: AbortSignal.timeout(25000),
      }),
      fetch(`${base}?url=${encodeURIComponent(url)}&strategy=desktop&category=performance${keyParam}`, {
        signal: AbortSignal.timeout(25000),
      }),
    ]);

    const [mobile, desktop] = await Promise.all([mobileRes.json(), desktopRes.json()]);

    const extract = (data) => {
      const cats = data?.lighthouseResult?.categories || {};
      const audits = data?.lighthouseResult?.audits || {};
      const getScore = (cat) => cat?.score != null ? Math.round(cat.score * 100) : null;
      return {
        performance: getScore(cats.performance),
        accessibility: getScore(cats.accessibility),
        seo: getScore(cats.seo),
        lcp: audits['largest-contentful-paint']?.displayValue || null,
        tbt: audits['total-blocking-time']?.displayValue || null,
        cls: audits['cumulative-layout-shift']?.displayValue || null,
        fcp: audits['first-contentful-paint']?.displayValue || null,
        si: audits['speed-index']?.displayValue || null,
      };
    };

    res.status(200).json({
      ok: true,
      mobile: extract(mobile),
      desktop: extract(desktop),
    });
  } catch (e) {
    res.status(200).json({ ok: false, error: e.message });
  }
}
