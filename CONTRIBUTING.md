# Contributing to WhiteWind to Leaflet Converter

Thank you for your interest in contributing to the WhiteWind to Leaflet converter! This guide will help you get started with contributing to this project.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (version 18 or higher recommended)
- **npm** (comes with Node.js)
- Basic knowledge of TypeScript, Svelte, and web development

### Setting Up the Development Environment

1. **Fork the repository** on GitHub
1. **Clone your fork** locally:
   
   ```bash
   git clone https://github.com/YOUR_USERNAME/whtwnd-to-leaflet.git
   cd whtwnd-to-leaflet
   ```
1. **Install dependencies**:
   
   ```bash
   npm install
   ```
1. **Start the development server**:
   
   ```bash
   npm run dev
   ```
1. **Open your browser** and navigate to `http://localhost:5173`

## 📁 Project Structure

Understanding the project structure will help you navigate and contribute effectively:

```
src/
├── routes/
│   ├── +layout.svelte         # Global layout
│   └── +page.svelte           # Main application page
├── lib/
│   ├── convert.ts             # Core conversion logic
│   ├── styles.css             # Custom styles
│   └── variables.css          # CSS custom properties
├── types/
│   └── file-saver.d.ts        # Type declarations
└── app.css                    # Global styles entry point
```

### Key Files to Understand

- **`src/lib/convert.ts`** - Contains all conversion logic including:
  - TID generation
  - Markdown to Leaflet blocks parsing
  - Rich text processing with facets
  - URL conversion utilities
- **`src/routes/+page.svelte`** - The main UI component with:
  - Form handling
  - State management
  - User interaction logic
- **`src/lib/styles.css`** - Custom styling that works with CSS custom properties

## 🛠️ Development Workflow

### Code Style

This project uses **Prettier** for code formatting. The configuration is in `.prettierrc`:

- **Tabs** for indentation
- **Single quotes** for strings
- **No trailing commas**
- **100 character** print width

Before submitting, ensure your code is formatted:

```bash
npm run format
```

### Type Checking

The project uses **TypeScript** with strict settings. Run type checking with:

```bash
npm run check
```

For continuous type checking during development:

```bash
npm run check:watch
```

### Building and Testing

Build the project to ensure everything works:

```bash
npm run build
```

Preview the built version:

```bash
npm run preview
```

## 🎯 Areas for Contribution

### High Priority Areas

1. **Conversion Logic Improvements**
- Better markdown parsing edge cases
- Enhanced rich text facet extraction
- More robust error handling
1. **User Experience**
- Better error messages and validation
- Progress indicators for long operations
- Improved responsive design
1. **Testing**
- Unit tests for conversion functions
- Integration tests for UI components
- End-to-end testing

### Medium Priority Areas

1. **Additional Features**
- Batch processing improvements
- Export format options
- Configuration presets
1. **Documentation**
- Code comments and documentation
- User guide improvements
- API documentation
1. **Performance**
- Large file handling optimization
- Memory usage improvements
- Bundle size optimization

## 📝 Contribution Guidelines

### Before You Start

1. **Check existing issues** to see if someone is already working on what you want to do
1. **Open an issue** to discuss major changes before implementing them
1. **Search existing pull requests** to avoid duplicate work

### Making Changes

1. **Create a new branch** for your feature or bugfix:
   
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
1. **Make your changes** following the project’s coding standards
1. **Test your changes** thoroughly:
- Test the conversion with various WhiteWind export formats
- Verify the output works with Leaflet
- Check responsive design on different screen sizes
1. **Commit your changes** with clear, descriptive messages:
   
   ```bash
   git commit -m "feat: add support for nested blockquotes"
   # or
   git commit -m "fix: handle empty content fields gracefully"
   ```

### Pull Request Process

1. **Update documentation** if your changes affect user-facing functionality
1. **Ensure all checks pass**:
   
   ```bash
   npm run format
   npm run check
   npm run build
   ```
1. **Create a pull request** with:
- Clear title describing the change
- Detailed description of what was changed and why
- Screenshots if UI changes are involved
- Reference to related issues
1. **Respond to feedback** promptly and make requested changes

## 🐛 Bug Reports

When reporting bugs, please include:

- **Browser and version**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Sample WhiteWind JSON** that causes the issue (if applicable)
- **Console errors** (if any)

Use this template:

```markdown
**Bug Description:**
A clear description of the bug.

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. Enter...

**Expected Behavior:**
What should have happened.

**Actual Behavior:**
What actually happened.

**Environment:**
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Version: [e.g., latest main branch]

**Additional Context:**
Any other relevant information.
```

## 💡 Feature Requests

For feature requests, please:

1. **Check existing issues** first
1. **Describe the use case** clearly
1. **Explain why** the feature would be valuable
1. **Provide examples** if possible

## 🔧 Technical Details

### Key Technologies

- **SvelteKit** - Full-stack framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling
- **JSZip** - ZIP file generation
- **File-saver** - File download functionality

### Conversion Process

The conversion happens in these main steps:

1. **Parse WhiteWind JSON** - Handle different export formats
1. **Generate Publication Record** - Create the main publication schema
1. **Convert Entries** - Transform each entry into Leaflet documents
1. **Process Markdown** - Parse markdown into Leaflet blocks
1. **Handle Rich Text** - Extract and convert text formatting
1. **Convert URLs** - Transform blob URLs to AT-URIs

### AT Protocol Integration

This tool works with the **AT Protocol ecosystem**:

- **WhiteWind** - Source blog platform
- **Leaflet** - Target publication platform
- **AT-URIs** - Proper URI format conversion
- **DIDs** - Decentralized identity handling

## 📜 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the issue, not the person
- Help create a welcoming environment for all contributors

## 📞 Getting Help

If you need help:

1. **Check the README** for basic usage information
1. **Look through existing issues** for similar questions
1. **Open a new issue** with the “question” label
1. **Be specific** about what you’re trying to do

## 🎉 Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes for significant contributions
- Project documentation

Thank you for contributing to making WhiteWind to Leaflet conversion better for everyone! 🍃
