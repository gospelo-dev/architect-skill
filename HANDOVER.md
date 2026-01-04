# gospelo-architect - Handover Document

## Overview

`gospelo-architect` is an AI-powered diagram generator for system architecture visualization. This package provides a zero-dependency renderer, CLI, and fluent builder API.

**Note**: This is a rename/successor of the `gospelo-diagrams` npm package.

---

## Package Information

| Field | Value |
|-------|-------|
| Package Name | `gospelo-architect` |
| Current Version | `0.1.1` |
| License | MIT |
| Repository | https://github.com/gospelo-dev/architect-skill |
| Previous Name | `gospelo-diagrams` (published on npm) |

---

## Project Structure

```
architect-skill/
├── src/
│   ├── index.ts              # Main exports
│   ├── core/
│   │   ├── types.ts          # TypeScript types
│   │   ├── parser.ts         # JSON parser
│   │   ├── builder.ts        # DiagramBuilder API
│   │   ├── icons.ts          # Icon resolution
│   │   └── iconCatalogClient.ts  # CDN client
│   ├── renderer/
│   │   └── Renderer.ts       # SVG renderer
│   ├── layout/
│   │   ├── layout.ts         # Node positioning
│   │   └── connections.ts    # Connection paths
│   └── elements/
│       └── Element.ts        # DOM element helpers
├── bin/
│   └── cli.ts                # CLI entry point
├── dist/                     # Compiled output
├── .github/skills/           # Claude Agent Skills
├── docs/                     # Documentation
├── scripts/                  # Build scripts
└── tests/                    # Test files
```

---

## npm Publish Steps

### 1. Pre-publish Checklist

- [ ] Update version in `package.json` if needed
- [ ] Build the project: `bun run build`
- [ ] Run tests: `bun test`
- [ ] Verify package contents: `npm pack --dry-run`

### 2. Login to npm

```bash
npm login
# Enter username, password, email, OTP if enabled
```

### 3. Publish to npm

```bash
# First-time publish (new package name)
npm publish --access public

# Or using bun
bun publish --access public
```

### 4. Verify Publication

```bash
npm view gospelo-architect
```

Expected output:
```
gospelo-architect@0.1.x | MIT | deps: none
AI-powered diagram generator for system architecture...
```

---

## Migration from gospelo-diagrams

### For Existing Users

Users of `gospelo-diagrams` should migrate to `gospelo-architect`:

```bash
# Remove old package
npm uninstall gospelo-diagrams

# Install new package
npm install gospelo-architect
```

### Import Changes

```typescript
// Before (gospelo-diagrams)
import { render, Renderer } from 'gospelo-diagrams';

// After (gospelo-architect)
import { render, Renderer } from 'gospelo-architect';
```

The API is fully compatible - only the package name changes.

### Deprecation Notice

Consider adding a deprecation notice to `gospelo-diagrams`:

```bash
npm deprecate gospelo-diagrams "This package has been renamed to gospelo-architect. Please use gospelo-architect instead."
```

---

## Integration with architect-cloud

After publishing, integrate with `gospelo-architect-cloud`:

### 1. Install in architect-cloud

```bash
cd /Users/gorosun/projects/gospelo-dev/architect-cloud/apps/web
bun add gospelo-architect
```

### 2. Update Import Statements

Update `apps/web/src/lib/gospelo.ts`:

```typescript
// Replace global window reference with direct import
import {
  parseDiagram,
  Renderer,
  createBuilder,
  type DiagramDefinition,
  type RenderOptions,
} from 'gospelo-architect';

export function parseAndRender(jsonString: string, options?: RenderOptions): string {
  const diagram = parseDiagram(JSON.parse(jsonString));
  const renderer = new Renderer(diagram, options);
  return renderer.renderSvg();
}

// ... rest of the wrapper functions
```

### 3. Remove SDK Loading Logic

In `Edit.tsx`, remove the `window.GospeloDiagrams` polling logic since the package is now directly imported.

---

## Exports Reference

### Main Exports (`gospelo-architect`)

```typescript
// Rendering
export { render, renderShareable, renderSvg, renderPreviewHtml } from './index';
export { Renderer } from './renderer/Renderer';

// Types
export type {
  DiagramDefinition,
  Node,
  Connection,
  RenderOptions,
  NodeType,
  ConnectionType,
} from './core/types';

// Parsing
export { parseDiagram, validateDiagram } from './core/parser';

// Builder
export { DiagramBuilder, createBuilder } from './core/builder';

// Icons
export {
  resolveIconUrl,
  resolveIconUrlAsync,
  loadIconUrlMap,
  preloadIconCatalog,
  clearIconCache,
} from './core/icons';

// CDN Client
export { IconCatalogClient, getIconCatalogClient, configureIconCatalog } from './core/iconCatalogClient';

// Layout
export { computeLayout, getNodeCenter, getNodeAnchors } from './layout/layout';
export { generateConnectionPath } from './layout/connections';

// Metadata
export { enrichDiagram, generateMeta } from './index';
```

---

## CLI Commands

```bash
# Render to HTML
gospelo-architect render input.json output.html

# Render to SVG
gospelo-architect svg input.json output.svg

# Enrich with metadata
gospelo-architect enrich input.json enriched.json

# Preview (for AI agents)
gospelo-architect preview input.json

# Edit with builder
gospelo-architect eval input.json 'b.addNode({...})'
```

---

## Environment Requirements

- **Node.js**: 18+
- **Bun**: 1.0+ (recommended)
- **TypeScript**: 5.3+

---

## Icon CDN Configuration

Icons are fetched from:
- `raw.githubusercontent.com` - AWS, Google Cloud icons
- `cdn.jsdelivr.net` - Azure, Tech Stack icons
- `architect.gospelo.dev` - Icon catalog metadata

Default CDN config:
```typescript
{
  baseUrl: 'https://architect.gospelo.dev',
  version: 'v1',
  cacheDuration: 60 * 60 * 1000  // 1 hour
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.1 | 2025-01-04 | Initial release as gospelo-architect |
| - | - | (Replaces gospelo-diagrams 0.1.1) |

---

## Related Projects

| Project | Repository | Description |
|---------|------------|-------------|
| architect-cloud | gospelo-dev/architect-cloud | Web editor & API |
| architect-skill | gospelo-dev/architect-skill | This package |

---

## Contact

- **Author**: gorosun
- **Email**: support@no-studio.net
- **GitHub**: https://github.com/gospelo-dev
