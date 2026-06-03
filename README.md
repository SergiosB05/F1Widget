# F1 iOS Home Screen Widget 

![F1 iOS Widget](https://img.shields.io/badge/iOS-Widget-black?style=for-the-badge&logo=apple) ![Scriptable](https://img.shields.io/badge/Scriptable-Supported-blue?style=for-the-badge)

A premium, race-inspired iOS home screen widget for Formula 1 fans. Built with [Scriptable](https://scriptable.app/), it brings the pit-wall telemetry experience straight to your iPhone.

---

## Features

- **Live Countdown:** Pit-wall style digital countdowns to the next session.
- **Local Timezone:** Automatically converts track times to your device's local timezone.
- **Smart Dynamic Layout:** 
  - Hides Free Practice sessions during Sprint weekends to focus on the action.
  - Automatically scrolls the timeline so the *next* upcoming session is always highlighted and visible.
- **Modern Race UI:** Features a dark carbon-like gradient, solid color-coded session badges, and an aggressive racing aesthetic.
- **Lightweight:** Fast, ad-free, and minimal battery consumption.

---

## Installation Guide

Follow these simple steps to get the widget on your iOS device:

### 1. Download Scriptable
Download the free **Scriptable** app from the App Store.
[Download Scriptable](https://apps.apple.com/app/scriptable/id1405459188)

### 2. Add the Script
1. Open the **Scriptable** app on your iPhone.
2. Tap the **+** icon in the top right corner to create a new script.
3. Copy the entire code from the [`widget.js`](widget.js) file in this repository.
4. Paste the code into the empty script in the app.
5. Tap on the title (usually says "Untitled Script") and rename it to **F1 Widget**.
6. Tap **Done** in the top left.

### 3. Add Widget to Home Screen
1. Go to your iPhone's Home Screen.
2. Long-press on an empty area until the apps start jiggling.
3. Tap the **+** icon in the top left corner.
4. Scroll down or search for **Scriptable** and select it.
5. Swipe to choose the **Medium** or **Large** widget size and tap **Add Widget**.
6. While the apps are still jiggling, tap on the newly added widget to edit it.
7. In the **Script** row, tap "Choose" and select **F1 Widget**.
8. Tap anywhere outside the widget to save.

You're done! Enjoy the race weekend.

---

## Architecture (For Developers)
To ensure the widget is lightning-fast and doesn't overload public APIs, this widget pulls data from a custom **Cloudflare Worker** rather than directly hitting the F1 API. The worker calculates the next race, filters the sprint sessions, and returns a clean, tiny JSON payload that the iOS widget simply renders. 

*If you fork this project, you can use the default endpoint provided in the code, or set up your own Cloudflare Worker backend.*
