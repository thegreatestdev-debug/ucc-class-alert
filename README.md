# UCC Class Alert

Offline-first lecture reminders for University of Cape Coast students.

## Run the PWA (Phase 1)

```powershell
cd C:\Users\DAVID\ucc-class-alert
python -m http.server 8001 --bind 127.0.0.1
```

Open `http://127.0.0.1:8001`

Do not open `index.html` as a file. Service workers and modules need `http://`.

### Board demo

1. Settings → **Enable system notifications**
2. Settings → **Alert in 2 minutes**
3. Switch to another tab (or lock the phone after installing the PWA)
4. After the alert, mark Too early / Just right / Too late so the on-device model can move

### Optional: re-sign the sample timetable

```powershell
node tools/sign-timetable.mjs
```

Private key: `tools/ed25519.private.pem` (demo key). Public key is baked into `js/config.js`.

## Android companion (Phase 2)

Open the `android` folder in Android Studio (Giraffe or newer), let Gradle sync, plug in a phone with USB debugging, Run.

The native app is the reliable path for **exact alarms after reboot and with the screen locked**. Chromium will freeze a background PWA timer; that is why native exists.

## Security

- Lecture fields are rendered with `textContent` only (no HTML injection).
- Content-Security-Policy is a meta tag in `index.html`.
- Official timetable import verifies an Ed25519 signature. A swapped JSON file without a valid signature is rejected.
- No API keys or secrets are required at runtime. The demo private key is only for signing `data/timetable.json`.
