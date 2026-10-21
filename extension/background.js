// Service worker: dedupes verdicts across tabs and plays sounds via the offscreen document.

const DEFAULTS = { enabled: true, volume: 0.8, handle: '' };
const MAX_ANNOUNCED = 300;

const VERDICT_LABELS = {
  OK: 'Accepted',
  WRONG_ANSWER: 'Wrong answer',
  TIME_LIMIT_EXCEEDED: 'Time limit exceeded',
  MEMORY_LIMIT_EXCEEDED: 'Memory limit exceeded',
  RUNTIME_ERROR: 'Runtime error',
  COMPILATION_ERROR: 'Compilation error',
  IDLENESS_LIMIT_EXCEEDED: 'Idleness limit exceeded',
  PRESENTATION_ERROR: 'Presentation error',
  CHALLENGED: 'Hacked',
  SKIPPED: 'Skipped',
  PARTIAL: 'Partial',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
  SECURITY_VIOLATED: 'Security violated',
  CRASHED: 'Crashed',
  INPUT_PREPARATION_CRASHED: 'Input preparation crashed',
};

// Verdicts where "on test N" makes sense.
const TEST_VERDICTS = new Set([
  'WRONG_ANSWER',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'RUNTIME_ERROR',
  'IDLENESS_LIMIT_EXCEEDED',
  'PRESENTATION_ERROR',
]);

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    // Never announce submissions made before the extension was installed.
    await chrome.storage.local.set({ installedAt: Math.floor(Date.now() / 1000), announced: [] });
  }
});

async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };
}

// Serialize claims so two tabs reporting the same submission can't both win.
let claimChain = Promise.resolve();
function claim(submission) {
  const result = claimChain.then(async () => {
    const { announced = [], installedAt = 0 } = await chrome.storage.local.get(['announced', 'installedAt']);
    if (submission.createdAt < installedAt) return false;
    if (announced.includes(submission.id)) return false;
    announced.push(submission.id);
    await chrome.storage.local.set({ announced: announced.slice(-MAX_ANNOUNCED) });
    return true;
  });
  claimChain = result.catch(() => {});
  return result;
}

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (contexts.length > 0) return;
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen/offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play a sound when a Codeforces verdict arrives.',
    });
  } catch (e) {
    // Another call created it concurrently.
    if (!String(e).includes('single offscreen')) throw e;
  }
}

async function play(kind) {
  const { volume } = await getSettings();
  await ensureOffscreen();
  await chrome.runtime.sendMessage({ target: 'offscreen', type: 'play', kind, volume });
}

function describe(s) {
  const ok = s.verdict === 'OK';
  const label = VERDICT_LABELS[s.verdict] || s.verdict;
  const title = `${ok ? '👏' : '😢'} ${label}${TEST_VERDICTS.has(s.verdict) ? ` on test ${s.passedTestCount + 1}` : ''}`;
  const problem = [s.contestId ? `${s.contestId}${s.problemIndex}` : s.problemIndex, s.problemName]
    .filter(Boolean)
    .join(' – ');
  return { ok, title, problem };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target === 'offscreen') return false;

  if (msg.type === 'verdict') {
    (async () => {
      const { enabled } = await getSettings();
      const s = msg.submission;
      if (!enabled || !(await claim(s))) return sendResponse({ played: false });
      const info = describe(s);
      await play(info.ok ? 'accepted' : 'rejected');
      sendResponse({ played: true, banner: info });
    })().catch((e) => {
      console.error(e);
      sendResponse({ played: false });
    });
    return true;
  }

  if (msg.type === 'test') {
    play(msg.kind).then(() => sendResponse({ ok: true }), (e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  return false;
});
