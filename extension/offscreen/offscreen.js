// Offscreen document: the only extension context that can play audio without a user gesture.
// Sounds are synthesized with Web Audio. To use your own files instead, drop
// sounds/accepted.mp3 and/or sounds/rejected.mp3 into the extension folder and reload it.

let ctx;
function audio() {
  ctx ??= new AudioContext();
  return ctx;
}

async function tryCustomFile(kind, volume) {
  const url = chrome.runtime.getURL(`sounds/${kind}.mp3`);
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const el = new Audio(URL.createObjectURL(await res.blob()));
    el.volume = volume;
    await el.play();
    return true;
  } catch {
    return false;
  }
}

function noiseBuffer(ac, seconds) {
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// One hand clap: a short band-passed noise burst.
function clap(ac, out, noise, t, gain, freq) {
  const src = ac.createBufferSource();
  src.buffer = noise;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 0.9;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  src.connect(bp).connect(g).connect(out);
  src.start(t, Math.random() * 0.5, 0.12);
}

// Three crisp claps, then a crowd of applause that swells and fades.
function playApplause(ac, out) {
  const noise = noiseBuffer(ac, 1);
  const t0 = ac.currentTime + 0.05;

  [0, 0.22, 0.44].forEach((dt) => clap(ac, out, noise, t0 + dt, 0.9, 1400));

  const start = t0 + 0.6;
  const length = 2.6;
  const count = 320;
  for (let i = 0; i < count; i++) {
    const x = Math.random();
    const env = Math.sin(Math.PI * Math.min(1, x * 1.15)) ** 0.7; // fast rise, slower fade
    clap(ac, out, noise, start + x * length, 0.15 + 0.35 * env * Math.random(), 800 + Math.random() * 1800);
  }
}

// "Wah wah wah waaah" — a sad trombone.
function playSadTrombone(ac, out) {
  const notes = [
    { f: 293.66, d: 0.42 }, // D4
    { f: 277.18, d: 0.42 }, // C#4
    { f: 261.63, d: 0.42 }, // C4
    { f: 246.94, d: 1.5 }, // B3, held with vibrato
  ];
  let t = ac.currentTime + 0.05;

  notes.forEach(({ f, d }, i) => {
    const last = i === notes.length - 1;
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, t);
    if (last) osc.frequency.linearRampToValueAtTime(f * 0.97, t + d);

    // Brassy "wah": open the filter then close it.
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(350, t);
    lp.frequency.linearRampToValueAtTime(1600, t + 0.12);
    lp.frequency.exponentialRampToValueAtTime(500, t + d);

    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.04);
    g.gain.setValueAtTime(0.35, t + d - 0.12);
    g.gain.linearRampToValueAtTime(0, t + d);

    if (last) {
      const lfo = ac.createOscillator();
      const depth = ac.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(7, t + 0.4);
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + d);
    }

    osc.connect(lp).connect(g).connect(out);
    osc.start(t);
    osc.stop(t + d);
    t += d + 0.06;
  });
}

async function play(kind, volume) {
  if (await tryCustomFile(kind, volume)) return;
  const ac = audio();
  if (ac.state === 'suspended') await ac.resume();
  const master = ac.createGain();
  master.gain.value = volume;
  master.connect(ac.destination);
  if (kind === 'accepted') playApplause(ac, master);
  else playSadTrombone(ac, master);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== 'offscreen' || msg.type !== 'play') return;
  play(msg.kind, msg.volume ?? 0.8);
});
