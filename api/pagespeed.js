export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    // モバイルとデスクトップ両方取得
    const [mobileRes, desktopRes] = await Promise.all([
      fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=accessibility&category=seo`, {
        signal: AbortSignal.timeout(25000),
      }),
      fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=desktop&category=performance`, {
        signal: AbortSignal.timeout(25000),
      }),
    ]);

    const [mobile, desktop] = await Promise.all([mobileRes.json(), desktopRes.json()]);

    const extract = (data) => {
      const cats = data?.lighthouseResult?.categories || {};
      const audits = data?.lighthouseResult?.audits || {};
      return {
        performance: Math.round((cats.performance?.score || 0) * 100),
        accessibility: Math.round((cats.accessibility?.score || 0) * 100),
        seo: Math.round((cats.seo?.score || 0) * 100),
        lcp: audits['largest-contentful-paint']?.displayValue || '—',
        fid: audits['total-blocking-time']?.displayValue || '—',
        cls: audits['cumulative-layout-shift']?.displayValue || '—',
        fcp: audits['first-contentful-paint']?.displayValue || '—',
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
