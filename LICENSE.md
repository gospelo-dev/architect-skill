# MIT License

Copyright (c) 2025 NoStudio LLC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Third-Party Icon Attributions

This software references icons from the following sources via CDN URLs.
The icons themselves are not redistributed with this software.

### AWS Architecture Icons

- **Source**: https://github.com/AwesomeLogos/aws-icons
- **Original**: https://aws.amazon.com/architecture/icons/
- **License**: Apache License 2.0
- **Copyright**: Amazon Web Services, Inc.

### Azure Icons

- **Source**: https://github.com/benc-uk/icon-collection
- **Original**: https://learn.microsoft.com/en-us/azure/architecture/icons/
- **License**: MIT License
- **Copyright**: Ben Coleman

### Google Cloud Icons

- **Source**: https://github.com/AwesomeLogos/google-cloud-icons
- **Original**: https://cloud.google.com/icons
- **License**: Apache License 2.0
- **Copyright**: Google LLC

### Simple Icons (Tech Stack)

- **Source**: https://github.com/simple-icons/simple-icons
- **Website**: https://simpleicons.org/
- **License**: CC0 1.0 Universal (Public Domain)
- **Copyright**: Simple Icons Collaborators

### NoStudio Icons

- **License**: All Rights Reserved
- **Copyright**: Gorosun (NoStudio LLC)

NoStudio Icons are original icons created for gospelo-architect. These icons may not be:
- Copied or extracted separately from the gospelo-architect package
- Modified or adapted to create derivative works
- Redistributed independently
- Used outside of the gospelo-architect package

---

## Icon Catalog Data Restrictions

The icon catalog data is served from the gospelo CDN (architect.gospelo.dev) and is **NOT** covered by the MIT License above.

**All Rights Reserved** - Copyright (c) 2025 Gorosun (NoStudio LLC)

The icon catalog data (JSON files served from the CDN) may not be:
- Downloaded and cached for redistribution
- Copied or extracted for use outside of gospelo-architect tools
- Modified or adapted to create derivative works
- Used to create competing icon catalog services
- Accessed by tools other than gospelo-architect or gospelo-architect-editor

**Permitted use:**
- Using the gospelo-architect package as intended (diagram generation)
- Using the gospelo-architect-editor for diagram creation
- Temporary client-side caching during normal operation

This restriction applies to the catalog data structure and compilation, not to the icons themselves (which are property of their respective owners as listed above).

---

## Preview HTML Output Restrictions

The `preview` command generates HTML files with Base64-embedded icons for internal review purposes.

**INTERNAL USE ONLY**

- Preview HTML files are intended for internal review and AI-assisted editing workflows
- Redistribution of preview HTML files is strictly prohibited
- For distribution, use the standard `render` command which loads icons from CDN

This restriction exists because:
- Preview files embed icon data directly, which may conflict with third-party icon licenses
- Third-party icons have specific redistribution terms that require attribution or prohibit bundling

---

## User-Generated Content

When using gospelo-architect, gospelo-architect-editor, or related tools, users may create their own content.

**Ownership:**
- User-uploaded icons and user-created catalogs are the property of the respective users
- Diagrams and documents created by users (including those generated with AI assistance) are the property of the respective users
- Gospelo model files (.gospelo, .gospelo.json) created by users (including those generated with AI assistance) are the property of the respective users
- NoStudio LLC does not claim any ownership of user-generated content

**User Responsibility:**
- Users are solely responsible for ensuring they have the right to use, upload, and distribute any icons or content they add
- Users are responsible for any copyright infringement, trademark violations, or other legal issues arising from their uploaded content
- NoStudio LLC is not liable for any claims, damages, or disputes related to user-generated content

**Disclaimer:**
- NoStudio LLC provides the tools "as is" and makes no warranties regarding user-generated content
- Users agree to indemnify and hold harmless NoStudio LLC from any claims arising from their use of the tools

---

## Usage Notes

- Icons are loaded dynamically from CDN (jsDelivr, GitHub Raw) at runtime
- This software does not bundle or redistribute the icon files
- Users should comply with the respective licenses when using the icons
- For commercial use, please verify each icon's trademark guidelines
