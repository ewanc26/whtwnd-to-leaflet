# whtwnd-to-leaflet

A simple browser-based tool for converting WhiteWind blog entries into the Leaflet publication format and automatically publishing them to the AT Protocol. It helps migrate content, metadata, and themes from WhiteWind to Leaflet on the AT Protocol.

⚠️ **Experimental** — output is not guaranteed to be fully accurate yet.

---

## How It Works

The app is a single-page web tool (built with **SvelteKit + TypeScript + Tailwind** on Svelte 5) that converts your WhiteWind blog entries to Leaflet format and **automatically publishes them to the AT Protocol**.

The process involves these steps:

1. **Sign In**  
   Authenticate with your AT Protocol credentials (Bluesky account). We recommend using an app password for better security.

2. **Automatic Entry Fetching**  
   The tool automatically fetches all your WhiteWind blog entries from your AT Protocol repository.

3. **Publication Setup**  
   Provide publication details such as name, description, and base path. Configure preferences like enabling comments and whether to appear in the Leaflet Discover feed.

4. **Theme Configuration**  
   Choose colours for the publication's primary, background, and page background.

5. **Convert & Publish**  
   Click convert to transform your entries:
   - **Parse Markdown** → transforms into Leaflet blocks (headers, text, blockquotes, code, images, horizontal rules).
   - **Convert AT-URIs** → changes WhiteWind blob/CID URLs into `at://` URIs where possible.
   - **Auto-Publish** → Click the "Publish to AT Protocol" button to automatically create your Leaflet publication and all documents in your AT Protocol repository.
   - **Manual Option** → Alternatively, download a ZIP file with all records for manual upload.

---

## Usage

**Web app:**

1. Visit the app and sign in with your AT Protocol credentials (Bluesky account).  
2. Your WhiteWind entries will be fetched automatically.  
3. Fill out Publication Setup and Theme Configuration.  
4. Click **Convert to Leaflet** to generate the records.  
5. Click **Publish to AT Protocol** to automatically publish your Leaflet (recommended), or download the ZIP for manual upload.

### Publishing Methods

**Automatic (Recommended):**

- Simply click the "Publish to AT Protocol" button after converting your entries
- The tool will automatically create your publication record and all document records in your repository
- You'll see a success message with your publication URI

**Manual:**

- Download the ZIP package containing all records
- Use the AT Protocol API or tools like `pdsls.dev` to upload the records
- Each document should be uploaded with its respective `rkey` (don't change them)

**Local development:**

```bash
npm install
npm run dev
```

Open the URL from Vite (usually `http://localhost:5173`).

**Build & preview:**

```bash
npm run build
npm run preview
```

---

## Files of Interest

- `src/routes/+page.svelte` — main entry point and session check
- `src/routes/login/+page.svelte` — authentication page
- `src/routes/converter/+page.svelte` — main UI and conversion handling
- `src/lib/convert.ts` — core conversion logic (TID generation, markdown → blocks, URL conversions)
- `src/lib/auth/atproto.ts` — AT Protocol authentication using atcute
- `src/lib/auth/leaflet.ts` — Leaflet publishing functions
- `src/lib/markdown-parser.ts` — markdown to Leaflet blocks parser
- `src/lib/styles.css`, `src/lib/variables.css` — styles and theme variables

---

## Development Notes

- Automatically fetches WhiteWind entries from the authenticated user's repository
- Supports JSON arrays of entries or objects with `records`/`data` arrays
- Inline rich-text facets (links, bold, italic, code) are extracted when possible and attached to text blocks
- Uses atcute for AT Protocol authentication and record management
- Automatically publishes to AT Protocol with proper error handling

---

## License

Licensed under **GPL 3.0**. See `/LICENSE` for details.

---

**Project:** [ewanc26/whtwnd-to-leaflet](https://github.com/ewanc26/whtwnd-to-leaflet)
