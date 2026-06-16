# BigQuery Release Notes Hub

A sleek, modern web dashboard built with **Python Flask** and vanilla **HTML5, CSS3, and JavaScript**. This application fetches the official Google Cloud BigQuery release notes Atom XML feed, dynamically segments grouped daily updates by type, and presents them in a responsive, glassmorphic layout. It includes an interactive search filter and a custom Tweet composer that prepares, validates, and drafts tweets directly to X (Twitter) within the character limit constraints.

---

## Features

- 📡 **Automated RSS/Atom Parsing**: Pulls from Google's live feed and parses entries on demand.
- 🧩 **BeautifulSoup Segmentation**: Splits combined daily release entries into individual, distinct cards categorized by type (`Feature`, `Issue`, `Deprecation`, `Notice`, `General`).
- ⚡ **In-Memory Caching**: Caches feed contents for 10 minutes to minimize network requests, rate limiting, and page load latency.
- 🔄 **Micro-Animated Refresh**: Provides a quick-refresh button with loading shimmers and icon spin states.
- 🔍 **Instant Filtering & Search**: Instant clientside search across titles, contents, and note types.
- 🐦 **Interactive Tweet Composer**: Automatically sanitizes HTML tags, limits character count to 280, generates template tags and links, and forwards drafts to X via Web Intent.
- 🛡️ **Modern Top-Layer Modals**: Uses native HTML5 `<dialog>` elements styled with modern CSS entry/exit `@starting-style` transitions.
- ♿ **Accessible & Responsive**: Fully responsive grid layout with semantic markup and keyboard navigation capabilities.

---

## File Structure

```text
bq-releases-notes/
├── app.py                # Flask server, Atom XML parser, and memory caching
├── requirements.txt      # Python dependencies (Flask, requests, beautifulsoup4)
├── .gitignore            # Git exclusion rules
├── templates/
│   └── index.html        # Shell HTML5 template with native <dialog> components
└── static/
    ├── css/
    │   └── style.css     # CSS Variables, dark theme layout, and discrete animations
    └── js/
        └── app.js        # Clientside state, DOM rendering, search filters, and tweet helper
```

---

## Getting Started

### 1. Prerequisites
Ensure you have **Python 3.8+** installed on your system.

### 2. Installation
Navigate to your project folder and install the required Python packages:
```bash
pip install -r requirements.txt
```

### 3. Run the Server
Launch the Flask development server:
```bash
python app.py
```
By default, the server will bind to port **`5001`** and run on:
*   Local: [http://127.0.0.1:5001](http://127.0.0.1:5001)

---

## Technical Details

### Backend Feed Parsing
In [app.py](app.py), the [parse_release_notes()](app.py#L19) function retrieves the Atom XML feed. Because multiple release items are grouped under a single day entry in Google's feed structure, the server utilizes `BeautifulSoup` to split contents by `<h3>` tags and maps them into an array of distinct items.

### Clientside Search & Filters
The JavaScript engine in [app.js](static/js/app.js) stores all updates in a local state array (`releaseNotes`). Whenever a search query is typed or a category chip is toggled, [renderNotes()](static/js/app.js#L173) filters the list and injects updated elements into the DOM with zero delay.

### Custom Dialog Animations
The Tweet draft Composer uses native `<dialog>` features. The popup styling in [style.css](static/css/style.css) utilizes discrete properties (`display`, `overlay`) alongside `@starting-style` to enable native entry and exit animations. Light-dismiss is handled declaratively with `closedby="any"` and a coordinate-based click fallback for Safari and Firefox.
