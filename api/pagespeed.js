export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=accessibility&category=seo`;
    const apiUrlDesktop = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=desktop&category=performance`;

    const [mobileRes, desktopRes] = await Promise.all([
      fetch(apiUrl, { signal: AbortSignal.timeout(25000) }),
      fetch(apiUrlDesktop, { signal: AbortSignal.timeout(25000) }),
    ]);

    const [mobile, desktop] = await Promise.all([mobileRes.json(), desktopRes.json()]);

    // デバッグ用：実際のレスポンス構造を確認
    const mCats = mobile?.lighthouseResult?.categories;
    const mAudits = mobile?.lighthouseResult?.audits;

    const extract = (data, strategy) => {
      const cats = data?.lighthouseResult?.categories || {};
      const audits = data?.lighthouseResult?.audits || {};

      const getScore = (cat) => {
        if (!cat) return null;
        const s = cat.score;
        if (s === null || s === undefined) return null;
        return Math.round(s * 100);
      };

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
      mobile: extract(mobile, 'mobile'),
      desktop: extract(desktop, 'desktop'),
      // デバッグ情報
      _debug: {
        mobileCategories: Object.keys(mCats || {}),
        mobileAudits: Object.keys(mAudits || {}).slice(0, 5),
        mobileError: mobile?.error?.message || null,
      }
    });
  } catch (e) {
    res.status(200).json({ ok: false, error: e.message });
  }
}
