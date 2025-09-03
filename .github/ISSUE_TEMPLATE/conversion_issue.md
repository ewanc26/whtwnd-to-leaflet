---
name: Conversion Issue
about: Report problems with WhiteWind to Leaflet conversion output
title: '[CONVERSION] '
labels: 'conversion'
assignees: ''

---

## 🔄 Conversion Problem
**What aspect of the conversion isn't working correctly?**
- [ ] Markdown parsing (headers, links, formatting, etc.)
- [ ] Rich text facets (bold, italic, code, links)
- [ ] Image/blob URL conversion
- [ ] Publication metadata
- [ ] Document structure
- [ ] JSON output format
- [ ] Other: _______________

## 📝 Input Data
**WhiteWind JSON that's causing issues:**

<details>
<summary>Click to expand WhiteWind JSON sample</summary>

```json
{
  "paste": "your WhiteWind JSON here"
}
```

</details>

## 📄 Expected Output
**What should the Leaflet output look like?**

<details>
<summary>Click to expand expected Leaflet JSON</summary>

```json
{
  "expected": "Leaflet format here"
}
```

</details>

## ❌ Actual Output
**What does the converter actually produce?**

<details>
<summary>Click to expand actual output</summary>

```json
{
  "actual": "what the converter outputs"
}
```

</details>

## 🎯 Specific Issues
**What specifically is wrong with the conversion?**
- [ ] Content is missing
- [ ] Formatting is incorrect  
- [ ] Links don't work properly
- [ ] Images aren't converted correctly
- [ ] Block types are wrong (e.g. header becomes text)
- [ ] Rich text facets are missing or incorrect
- [ ] AT-URI conversion failed
- [ ] Schema validation errors
- [ ] Other: _______________

## 📊 Impact
**How does this affect the final Leaflet publication?**
- [ ] Publication won't import into PDS
- [ ] Content displays incorrectly in Leaflet
- [ ] Links are broken
- [ ] Images don't load
- [ ] Formatting is lost
- [ ] Other: _______________

## 🔧 Workaround
**Have you found any temporary workarounds?**
Describe any manual fixes or workarounds you've used.

## 📋 Publication Settings
**What publication settings were you using?**
- Publication Name: 
- Base Path: 
- Theme Colors: 
- Show in Discover: 
- Enable Comments: 

## 🌐 Environment
- **Browser:** [e.g. Chrome 120, Firefox 121, Safari 17]
- **OS:** [e.g. Windows 11, macOS 14, Ubuntu 22.04]

## 🔗 Related Documentation
**Links to relevant documentation:**
- WhiteWind schema: 
- Leaflet schema: 
- AT Protocol docs: 

## ✔️ Checklist
- [ ] I have provided the actual WhiteWind JSON causing issues
- [ ] I have described what the output should look like
- [ ] I have tested this with minimal data to isolate the issue
- [ ] I have checked that this isn't a known limitation mentioned in the README