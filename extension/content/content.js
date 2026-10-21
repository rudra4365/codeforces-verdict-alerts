// Runs on every Codeforces page. After you submit, Codeforces redirects to your
// submissions page; this script picks up the in-flight submission from the API,
// polls until it's judged, then hands the verdict to the background worker.

(() => {
  const POLL_MS = 2500;
  const RETRY_MS = 5000;
  const RECENT_WINDOW_SEC = 10 * 60; // only care about submissions from the last 10 minutes
  const MAX_POLL_MS = 20 * 60 * 1000; // give up polling after 20 minutes

  const startedAt = Date.now();

  async function getHandle() {
    const { handle } = await chrome.storage.sync.get({ handle: '' });
    if (handle.trim()) return handle.trim();
    // The logged-in user's profile link lives in the page header.
    const link = document.querySelector('#header a[href^="/profile/"]');
    return link ? link.getAttribute('href').split('/').pop() : null;
  }

  async function fetchRecent(handle) {
    const res = await fetch(`/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10`, {
      credentials: 'omit',
    });
    const data = await res.json();
    if (data.status !== 'OK') throw new Error(data.comment || 'Codeforces API error');
    return data.result;
  }

  async function report(s) {
    const p = s.problem || {};
    try {
      const { banner } = await chrome.runtime.sendMessage({
        type: 'verdict',
        submission: {
          id: s.id,
          verdict: s.verdict,
          createdAt: s.creationTimeSeconds,
          passedTestCount: s.passedTestCount,
          contestId: p.contestId,
          problemIndex: p.index,
          problemName: p.name,
        },
      });
      if (banner) showBanner(banner);
    } catch {
      // Extension was reloaded; this page's script is orphaned.
    }
  }

  async function tick() {
    const handle = await getHandle();
    if (!handle) return; // not logged in and no handle configured

    let submissions;
    try {
      submissions = await fetchRecent(handle);
    } catch {
      // Rate limited or network hiccup; try again shortly.
      if (Date.now() - startedAt < MAX_POLL_MS) setTimeout(tick, RETRY_MS);
      return;
    }

    const now = Date.now() / 1000;
    let pending = false;
    for (const s of submissions) {
      if (now - s.creationTimeSeconds > RECENT_WINDOW_SEC) continue;
      if (!s.verdict || s.verdict === 'TESTING') {
        pending = true;
      } else {
        report(s);
      }
    }

    if (pending && Date.now() - startedAt < MAX_POLL_MS) setTimeout(tick, POLL_MS);
  }

  function showBanner({ ok, title, problem }) {
    const el = document.createElement('div');
    el.textContent = problem ? `${title} — ${problem}` : title;
    Object.assign(el.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: 2147483647,
      padding: '12px 18px',
      borderRadius: '8px',
      font: '600 15px/1.3 system-ui, -apple-system, sans-serif',
      color: '#fff',
      background: ok ? '#1a7f37' : '#cf222e',
      boxShadow: '0 6px 24px rgba(0,0,0,.25)',
      transition: 'opacity .4s, transform .4s',
      opacity: '0',
      transform: 'translateY(10px)',
      maxWidth: '420px',
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    }, 5000);
  }

  tick();
})();
