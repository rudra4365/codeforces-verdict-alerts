const DEFAULTS = { enabled: true, volume: 0.8, handle: '' };

const enabled = document.getElementById('enabled');
const volume = document.getElementById('volume');
const handle = document.getElementById('handle');

chrome.storage.sync.get(DEFAULTS).then((s) => {
  enabled.checked = s.enabled;
  volume.value = s.volume;
  handle.value = s.handle;
});

enabled.addEventListener('change', () => chrome.storage.sync.set({ enabled: enabled.checked }));
volume.addEventListener('change', () => chrome.storage.sync.set({ volume: Number(volume.value) }));
handle.addEventListener('change', () => chrome.storage.sync.set({ handle: handle.value.trim() }));

document.getElementById('test-ac').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'test', kind: 'accepted' }));
document.getElementById('test-wa').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'test', kind: 'rejected' }));
