# `whtwnd-to-leaflet`

A simple web-based tool for converting WhiteWind blog entries into the Leaflet publication format. This converter streamlines the migration process for users on the AT Protocol, transforming blog content, metadata, and themes from one service to another.

***This is not at all guaranteed to be accurate. it's experimental right now.***

## How It Works

The converter is a single-page web app that runs entirely in the browser, with no backend required.

The process involves three main steps:

* **Publication Setup**: Provide basic information for your Leaflet publication, such as the name, description, and your AT Protocol DID. You can also configure preferences like enabling comments and whether your publication should appear in the Leaflet Discover feed.  
* **Theme Configuration**: Customise the publication’s look with colour settings for the primary, background, and page background colours.  
* **Entry Conversion**: Paste your WhiteWind blog entries JSON. The tool will:  
  * **Parse Markdown** → Converts markdown into structured Leaflet document blocks (headers, text, blockquotes, code blocks, images, etc.).  
  * **Convert AT-URIs** → Transforms WhiteWind blob URLs into standard `at://` URIs.  
  * **Transform Schema** → Outputs two JSON files: one **publication record** and one or more **document records**.  
# whtwnd-to-leaflet

A small browser tool that converts WhiteWind blog entries into the Leaflet publication format.

This repository contains a SvelteKit + TypeScript + Tailwind project (Svelte 5). The app runs entirely in the browser and produces a Leaflet-compatible publication record plus one or more document records from your WhiteWind entries.

## How it works

- Publication Setup — provide publication name, optional base path and description, and preferences.
- Theme Configuration — pick primary, background and page background colours.
- Entry Conversion — paste a JSON array of WhiteWind entries (or an object with `records`/`data` containing an array). The tool:
  - parses markdown into Leaflet blocks (headers, text, blockquotes, code, images, horizontal rules),
  - converts blob/CID URLs into `at://` URIs when possible,
  - emits a publication JSON and document JSON records (ZIP export supported).

## Usage

Web usage:

1. Fill out Publication Setup and Theme Configuration in the app UI.
2. Paste your WhiteWind JSON entries into the text area. You can fetch this from your PDS endpoint:

```
https://[pds domain]/xrpc/com.atproto.repo.listRecords?repo=[did]&collection=com.whtwnd.blog.entry
```

3. Enter your Author DID.
4. Click **Convert to Leaflet**.
5. Copy or download the generated JSON files, or use the ZIP export.

Local development (SvelteKit)

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

Build & preview

```bash
npm run build
npm run preview
```

## Files of interest

- `src/routes/+page.svelte` — main UI and form handling
- `src/lib/convert.ts` — conversion logic (TID generation, markdown → blocks, URL conversions)
- `src/lib/styles.css`, `src/lib/variables.css` — styles and variables
- `src/types/file-saver.d.ts` — small type declaration

## Development notes

- The converter accepts either a JSON array of entries or an object with `records`/`data` arrays to support different export formats.
- Inline rich-text facets (links, bold, italic, code) are extracted when possible and attached to text blocks.

## License

Licensed under **GPL 3.0**. See `/LICENSE` for details.

---

Project: https://github.com/ewanc26/whtwnd-to-leaflet
