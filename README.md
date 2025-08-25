# `whtwnd-to-leaflet`

A simple web-based tool for converting WhiteWind blog entries into the Leaflet publication format. This converter streamlines the migration process for users on the AT Protocol, transforming blog content, metadata, and themes from one service to another.

## How It Works

The converter is a single-page web app that runs entirely in the browser, with no backend required.

- `index.html` — the main page structure  
- `styles.css` — styling for layout, theme, and components  
- `script.js` — all conversion logic, markdown parsing, and export functionality  

The process involves three main steps:

* **Publication Setup**: Provide basic information for your Leaflet publication, such as the name, description, and your AT Protocol DID. You can also configure preferences like enabling comments and whether your publication should appear in the Leaflet Discover feed.  
* **Theme Configuration**: Customise the publication’s look with colour settings for the primary, background, and page background colours.  
* **Entry Conversion**: Paste your WhiteWind blog entries JSON. The tool will:  
  * **Parse Markdown** → Converts markdown into structured Leaflet document blocks (headers, text, blockquotes, code blocks, images, etc.).  
  * **Convert AT-URIs** → Transforms WhiteWind blob URLs into standard `at://` URIs.  
  * **Transform Schema** → Outputs two JSON files: one **publication record** and one or more **document records**.  

---

## Usage

1.  Open `index.html` in a web browser.  
2.  Fill out **Publication Setup** and **Theme Configuration**. You’ll need your DID and PDS domain (findable via [PDSls](https://pdsls.dev)).  
3.  Paste your WhiteWind JSON entries into the text area. You can fetch this from your PDS endpoint:  

    ```
    https://[pds domain]/xrpc/com.atproto.repo.listRecords?repo=[did]&collection=com.whtwnd.blog.entry
    ```

4.  Enter your Author DID.  
5.  Click **Convert to Leaflet**.  
6.  Copy/download the generated JSON files individually or grab them all at once in a ZIP.  

---

## About the Services

| Service | Description | GitHub Page |
| :--- | :--- | :--- |
| **WhiteWind** | A blog platform built on the AT Protocol, focusing on minimalistic, fast blogging. | `github.com/whtwnd/whitewind-blog` |
| **Leaflet** | A flexible AT Protocol publishing platform for blogs, magazines, and long-form content. | `github.com/hyperlink-academy/leaflet` |
| **PDSls** | A tool to find DID and PDS domains for AT Protocol users. | `https://github.com/notjuliet/pdsls` |

---

## Development

This project is built with plain **HTML, CSS, and JavaScript**.  

Key functions include:  

* **`generateTID()`** → Generates unique timestamp-based IDs.  
* **`hexToRgb()`** → Converts hex colour codes into RGB objects for Leaflet themes.  
* **`convertBlobUrlToAtUri()`** → Converts WhiteWind blob URLs to `at://` format.  
* **`parseMarkdownToBlocks()`** → Breaks down markdown into Leaflet-compatible content blocks.  

---

## License

Licensed under **GPL 3.0**. See `/LICENSE` for details.

---

## Project Page

GitHub: `https://github.com/ewanc26/whtwnd-to-leaflet`  
