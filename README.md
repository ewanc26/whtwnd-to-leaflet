# `whtwnd-to-leaflet`

A simple web-based tool for converting WhiteWind blog entries into the Leaflet publication format. This converter streamlines the migration process for users on the AT Protocol, transforming blog content, metadata, and themes from one service to another.

## How It Works

The converter is a single-page HTML file that performs all logic directly in the browser, meaning it doesn't require a backend server. The process involves three main steps:

* **Publication Setup**: You provide basic information for your new Leaflet publication, such as the publication's name and an optional description. You must also enter your AT Protocol Decentralized Identifier (**DID**) and can configure preferences like enabling comments and visibility in the Leaflet Discover feed.
* **Theme Configuration**: The tool allows you to customize the color scheme of your Leaflet publication by setting the primary, background, and page background colors using hex codes.
* **Entry Conversion**: The core of the tool handles the transformation of your blog entries. The converter automatically manages:
    * **Markdown Parsing**: It parses the markdown content from each WhiteWind entry and converts it into structured blocks compatible with Leaflet's document schema. This includes handling headers, code blocks, blockquotes, horizontal rules, and rich text formatting like **bold**, *italic*, inline code, and [links](https://example.com).
    * **AT-URI Conversion**: It converts WhiteWind blob URLs (e.g., for images) into the standard `at://` URI format.
    * **Schema Transformation**: It transforms the data into two distinct JSON records: a **publication record** (representing the blog itself) and **document records** (for individual blog posts).

---

### Usage

Using the converter is a straightforward process:

1.  Open the `whtwnd-to-leaflet.html` file in your web browser.
2.  Fill in the required fields under the **Publication Setup** and **Theme Configuration** sections. You will need your DID and PDS domain for the next step. If you don't know them, you can find them using **PDSls** (pdslist.dev).
3.  In the **WhiteWind Blog Entries** section, paste the JSON array of your WhiteWind blog entries into the provided text area. You can obtain this JSON array from a PDS collection endpoint with a URL format like `https://[pds domain]/xrpc/com.atproto.repo.listRecords?repo=[did]&collection=com.whtwnd.blog.entry`. You must also enter your Author DID in the field provided.
4.  Click the **`Convert to Leaflet`** button. The tool will then generate the converted JSON files in a new section.
5.  You can then copy or download the generated **Publication Record** and **Document Records** as individual JSON files or download them all at once in a ZIP archive.

### About the Services

| Service | Description | GitHub Page |
| :--- | :--- | :--- |
| **WhiteWind** | A blog platform built on the AT Protocol. It focuses on offering a simple, fast, and minimalistic blogging experience. It allows users to create and manage their blogs directly on the network. | `github.com/whtwnd/whitewind-blog` |
| **Leaflet** | Another publication service for the AT Protocol. Leaflet focuses on providing a full-featured, flexible, and customizable publishing experience for blogs, magazines, or other long-form content. | `github.com/hyperlink-academy/leaflet` |
| **PDSls** | A service that helps people find the DID and PDS domain for users on the AT Protocol. Its Bluesky profile is `did:plc:6q5daed5gutiyerimlrnojnz`. | `https://github.com/notjuliet/pdsls` |


---

### Development

The converter is built using only JavaScript, HTML, and CSS. The key JavaScript functions powering the conversion are:

* **`generateTID()`**: Creates a unique, sortable `TID` (Timestamp Identifier) for the publication record.
* **`hexToRgb()`**: Converts hexadecimal color codes into RGB objects for Leaflet's theme schema.
* **`convertBlobUrlToAtUri()`**: Standardizes image URLs and other blob references from WhiteWind's format to the `at://` protocol format.
* **`parseMarkdownToBlocks()`**: The core logic that breaks down markdown content into a series of Leaflet-compatible content blocks, handling headers, text, code blocks, blockquotes, and images.

### License

This project is licensed under the **GPL 3.0** license. A copy of the license is available at `/LICENSE`.

---

### Project Page

This project's GitHub page is located at `https://github.com/ewanc26/whtwnd-to-leaflet`.
