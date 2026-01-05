# Print Settings Reference

gospelo-architect supports various paper and screen sizes for print-optimized output.

## Usage

```bash
bun bin/cli.ts html diagram.json output.html --paper <size>
```

## Available Sizes

### A Series (ISO 216)

| Size | Dimensions (mm) | Landscape (px) | Portrait (px) |
|------|-----------------|----------------|---------------|
| A1 | 841 x 594 | 3179 x 2245 | 2245 x 3179 |
| A2 | 594 x 420 | 2245 x 1587 | 1587 x 2245 |
| A3 | 420 x 297 | 1587 x 1123 | 1123 x 1587 |
| A4 | 297 x 210 | 1123 x 794 | 794 x 1123 |

### B Series (JIS P 0138)

| Size | Dimensions (mm) | Landscape (px) | Portrait (px) |
|------|-----------------|----------------|---------------|
| B1 | 1030 x 728 | 3893 x 2752 | 2752 x 3893 |
| B2 | 728 x 515 | 2752 x 1947 | 1947 x 2752 |
| B3 | 515 x 364 | 1947 x 1376 | 1376 x 1947 |
| B4 | 364 x 257 | 1376 x 971 | 971 x 1376 |

### Screen Sizes

| Size | Resolution | Landscape (px) | Portrait (px) |
|------|------------|----------------|---------------|
| HD | 720p | 1280 x 720 | 720 x 1280 |
| FHD | 1080p | 1920 x 1080 | 1080 x 1920 |
| 4K | 2160p (UHD) | 3840 x 2160 | 2160 x 3840 |
| 8K | 4320p | 7680 x 4320 | 4320 x 7680 |

## Size Format

All sizes use the format: `<size>-<orientation>`

**Orientations:**
- `landscape` - Width > Height (horizontal)
- `portrait` - Height > Width (vertical)

**Examples:**
```bash
--paper a4-landscape    # A4 横向き (1123 x 794)
--paper a4-portrait     # A4 縦向き (794 x 1123)
--paper b2-landscape    # B2 横向き (2752 x 1947)
--paper 4k-landscape    # 4K 横向き (3840 x 2160)
--paper fhd-portrait    # Full HD 縦向き (1080 x 1920)
```

## Resolution

All pixel values are calculated at **96 DPI** (CSS standard pixels).

```
pixels = mm × 96 / 25.4
```

### High-DPI Display Support

Diagrams defined at 96 DPI display correctly on all screens, including Apple Retina displays:

| Display Type | Rendering | Result |
|--------------|-----------|--------|
| Standard display | 96 DPI | As defined |
| Retina 2x | 192 DPI | Sharp and crisp |
| Retina 3x | 288 DPI | Sharp and crisp |

Since gospelo-architect outputs **SVG (vector format)**, diagrams render at the native resolution of any display without quality loss. The browser automatically scales using `window.devicePixelRatio`.

## Behavior

### Content Fitting

When a paper size is specified:

1. **ViewBox** is set to the paper dimensions
2. **Content is auto-fitted** within the paper bounds
3. **Scale down only** - content is never scaled up
4. **Aspect ratio preserved** - proportions are maintained
5. **Top-aligned, horizontally centered** - content is positioned at top center

### Icon Size

Icon size remains fixed at **48px** in viewBox coordinates regardless of paper size. This means:

- On **smaller paper** (A4): Icons appear larger relative to the page
- On **larger paper** (A1): More drawing space, same icon size

### Print CSS

The HTML output includes `@page` CSS rules for automatic print orientation:

```css
@page {
  margin: 0;
  size: A4 landscape; /* or portrait */
}
```

## Examples

### A4 Landscape (Standard Document)

```bash
bun bin/cli.ts html diagram.json output.html --paper a4-landscape
```

Best for: Simple diagrams, documentation attachments

### A3 Landscape (Presentation)

```bash
bun bin/cli.ts html diagram.json output.html --paper a3-landscape
```

Best for: Meeting handouts, wall displays

### B2 Portrait (Poster)

```bash
bun bin/cli.ts html diagram.json output.html --paper b2-portrait
```

Best for: Technical posters, large format printing

### 4K Landscape (Digital Display)

```bash
bun bin/cli.ts html diagram.json output.html --paper 4k-landscape
```

Best for: Large monitors, digital signage, video production

### FHD Portrait (Mobile/Vertical Display)

```bash
bun bin/cli.ts html diagram.json output.html --paper fhd-portrait
```

Best for: Vertical monitors, mobile presentations

## Comparison: Paper vs Screen Sizes

| Use Case | Recommended Size |
|----------|------------------|
| Office printing | A4, A3 |
| Large format printing | A1, A2, B1, B2 |
| Web/Digital viewing | FHD, 4K |
| Video production | HD, FHD, 4K, 8K |
| Technical posters | B2, B1 |
| Detailed architecture | A1, B1, 4K |

## Tips

### Choosing the Right Size

1. **For printing**: Use A or B series matching your printer capability
2. **For screens**: Use HD/FHD/4K matching your display resolution
3. **For complex diagrams**: Use larger sizes (A1, B1, 4K) for more detail space
4. **For simple overviews**: A4 or FHD is usually sufficient

### Print Preview

To check how your diagram will print:

1. Open the generated HTML in a browser
2. Press `Ctrl+P` (or `Cmd+P` on Mac)
3. The print preview will show the diagram fitted to the specified paper size

### Custom Sizes

If you need a custom size not listed above, use `--width` and `--height` directly:

```bash
bun bin/cli.ts html diagram.json output.html --width 2000 --height 1500
```
