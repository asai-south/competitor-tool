export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  const apiKey = process.env.PAGESPEED_API_KEY || '';
  const keyParam = apiKey ? `&key=${apiKey}` : '';

  try {
    // モバイルのみ取得（速度優先）
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=accessibility${keyParam}`;
    
    const r = await fetch(apiUrl, {
      signal: AbortSignal.timeout(30000),
    });
    const data = await r.json();

    if(data.error) {
      return res.status(200).json({ ok: false, error: data.error.message });
    }

    const cats = data?.lighthouseResult?.categories || {};
    const audits = data?.lighthouseResult?.audits || {};
    const getScore = (cat) => cat?.score != null ? Math.round(cat.score * 100) : null;

    res.status(200).json({
      ok: true,
      performance: getScore(cats.performance),
      accessibility: getScore(cats.accessibility),
      lcp: audits['largest-contentful-paint']?.displayValue || null,
      cls: audits['cumulative-layout-shift']?.displayValue || null,
      fcp: audits['first-contentful-paint']?.displayValue || null,
      tbt: audits['total-blocking-time']?.displayValue || null,
    });
  } catch (e) {
    res.status(200).json({ ok: false, error: e.message });
  }
}
