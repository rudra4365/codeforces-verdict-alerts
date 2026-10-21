# Codeforces Verdict Alerts 👏😢

A browser extension that plays a sound as soon as your Codeforces submission is judged:

- **Accepted** → a round of applause 👏
- **Anything else** (Wrong answer, Time limit exceeded, Memory limit exceeded, Runtime error, Compilation error, Hacked, …) → a sad trombone, *"wah wah wah waaah"* 😢

The sound plays **whichever tab you're on**, so you can submit, switch to another tab, and still hear the result. A banner also appears in the bottom-right corner of the Codeforces page with the verdict, the problem, and the test it failed on, for example `😢 Wrong answer on test 3 — 1950B – Bicycles`.

You install it once and it works automatically. There's no script to run, nothing to start before a contest, and no account to set up.

---

## Installation

The extension isn't on the Chrome Web Store, so you load it from this repository. It takes about a minute.

1. **Download the code**
   - Click the green **Code** button at the top of this page → **Download ZIP**, then unzip it, **or**
   - `git clone https://github.com/rudra4365/codeforces-verdict-alerts.git`
2. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Turn on **Developer mode** (a toggle in the top-right corner, or on the left in Edge).
4. Click **Load unpacked** and select the **`extension`** folder inside `codeforces-verdict-alerts` (the folder that contains `manifest.json`).
5. *(Optional)* Pin the extension: click the puzzle-piece icon in the toolbar, then the pin next to **Codeforces Verdict Alerts**.
6. Click the extension's icon and press **👏 Test AC** and **😢 Test WA** to check that you can hear both sounds.

Done. Keep the folder where it is, because the browser loads the extension from it. If you delete or move the folder, the extension stops working.

### Supported browsers

| Browser | Supported |
|---|---|
| Google Chrome (version 116 or newer) | ✅ |
| Microsoft Edge | ✅ |
| Brave, Arc, Opera, Vivaldi (Chromium-based browsers) | ✅ |
| Firefox | ❌ (not yet) |
| Safari | ❌ |

---

## Usage

1. Log in to [codeforces.com](https://codeforces.com) as usual.
2. Submit a solution from a problem page, a contest, the problemset, or a gym.
3. Codeforces takes you to your submissions page. You can now switch to another tab, or to your editor; just keep that Codeforces tab open.
4. When the verdict arrives, you'll hear the sound wherever you are. When you go back to the Codeforces tab, you'll see the banner there if it's still showing; it disappears after 5 seconds.

That's it. Each submission plays its sound **exactly once**, even with several Codeforces tabs open or after you refresh.

### Settings

Click the extension's icon in the toolbar:

| Setting | What it does |
|---|---|
| **Enabled** | Turns the extension on or off (for example, while you're on a call) |
| **Volume** | Volume of both sounds |
| **Handle** | Leave it blank to use the account you're logged in with. Enter a handle to track that user instead (see below) |
| **Test AC / Test WA** | Plays each sound so you can check your volume |

### Submitting from VS Code, a CLI tool, or another device

The extension only checks for verdicts **when a Codeforces page loads**. If you submit from somewhere other than the website (cf-tool, the Competitive Companion / CPH extensions, your phone, …), **open or refresh any Codeforces page** after submitting and it will pick up the verdict. If you aren't logged in to Codeforces in the browser, enter your handle in the settings.

---

## How it works

```
You submit ─► Codeforces opens your submissions page
                        │
                        ▼
   content.js  reads your handle and asks the official Codeforces API
               (/api/user.status) for your latest submissions
                        │
          a submission is still being judged? ──► ask again every 2.5 s
                        │
                        ▼  verdict arrives
   background.js  checks this submission hasn't been announced yet
                        │
                        ▼
   offscreen.js   plays applause (OK) or the sad trombone (everything else)
   content.js     shows the verdict banner on the page
```

Details:

- **Which submissions count:** only those created in the **last 10 minutes** and **after you installed** the extension, so you won't hear sounds for old submissions. It stops checking 20 minutes after the page loaded.
- **Requests to Codeforces:** one request when a Codeforces page loads, then one every 2.5 seconds, but only while one of your submissions is being judged. This stays within the API limit of one request every 2 seconds.
- **The sounds** are generated in code with the Web Audio API, so the extension doesn't include any audio files.
- **Playing without a click:** browsers normally block a page from playing sound until you click on it. The extension plays the sound from its own hidden background page (an offscreen document), which isn't subject to that rule.

### Project structure

```
codeforces-verdict-alerts/
├── extension/                 ← the folder you load in the browser
│   ├── manifest.json          extension configuration (Manifest V3)
│   ├── background.js          announces each submission once; starts the sound player
│   ├── content/
│   │   └── content.js         runs on Codeforces pages: finds your handle, checks the API, shows the banner
│   ├── offscreen/
│   │   ├── offscreen.html
│   │   └── offscreen.js       generates and plays the sounds
│   ├── popup/
│   │   ├── popup.html         settings panel
│   │   └── popup.js
│   └── icons/                 toolbar and extensions-page icons (icon.svg is the source)
├── README.md
└── LICENSE
```

---

## Custom sounds

To use your own sounds, create a `sounds` folder inside the `extension` folder and add either or both of:

```
extension/sounds/accepted.mp3   ← played on Accepted
extension/sounds/rejected.mp3   ← played on every other verdict
```

Then go to `chrome://extensions` and click the **reload ↻** icon on the extension. If a file is missing, the built-in sound for that verdict is used.

---

## Privacy

- The extension only runs on `codeforces.com`.
- The only network requests it makes go to Codeforces' own public API.
- Permissions: `storage` (your settings), `offscreen` (to play sound in the background), and access to `codeforces.com` only.
- It doesn't collect, store, or send any personal data. It saves only your settings and a list of submission IDs it has already announced, both in your browser.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| No sound at all | Check the extension is **Enabled** and the volume is up in its settings, press **Test AC**, and make sure the browser tab and your computer aren't muted. |
| Test sounds play, but nothing happens after submitting | Make sure you're logged in, or enter your handle in the settings. Keep a Codeforces tab open until the verdict arrives, or refresh one. |
| The sound comes late during a contest | Codeforces is busy and judging takes longer; the sound plays as soon as the verdict is out. If the tab is in the background, the browser may also check less often. |
| It stopped working after I moved the folder | Remove the extension and load the folder again from its new location. |
| I changed the code and nothing happened | Click the reload ↻ icon on the extension in `chrome://extensions`, then refresh your Codeforces tab. |

---

## Uninstalling

Go to `chrome://extensions`, find **Codeforces Verdict Alerts**, and click **Remove**. Then you can delete the folder.

## License

[MIT](LICENSE)
