/**
 * CSS templates for diagram rendering
 * Extracted from Renderer.ts for better organization
 */

/**
 * Base CSS for diagram rendering
 */
export function getBaseCss(): string {
  return `.gospelo-diagram {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.gospelo-diagram svg {
  max-width: 100%;
  height: auto;
}
.node-label { font-weight: 500; }
.group-box { filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.1)); }
.connection { stroke-linecap: round; stroke-linejoin: round; }
.resize-handle { cursor: nwse-resize; }
.resize-handle:hover { fill: #AAAAAA; }`;
}

/**
 * CSS for shareable HTML (interactive features)
 */
export function getShareableCss(pageSize: string): string {
  return `body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.gospelo-diagram {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background: #f5f5f5;
}
.gospelo-diagram svg {
  width: 100%;
  height: auto;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-radius: 4px;
}
/* Print styles */
@media print {
  @page {
    margin: 0;
    size: ${pageSize};
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .gospelo-diagram {
    width: 100vw;
    height: 100vh;
    padding: 0;
    margin: 0;
    background: white;
    display: block;
    overflow: hidden;
  }
  .gospelo-diagram svg {
    display: block;
    max-width: 100vw !important;
    max-height: 100vh !important;
    width: auto !important;
    height: auto !important;
    box-shadow: none;
    border-radius: 0;
  }
  .copy-toast, .hover-tooltip, .selection-rect, .copy-btn { display: none !important; }
}
.node-label { font-weight: 500; }
.group-box { filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.1)); }
.connection { stroke-linecap: round; stroke-linejoin: round; }
/* Hide UI elements */
.boundary-box { display: none; }
/* Node hover effect */
.node, .composite-icon { cursor: pointer; }
.node:hover, .composite-icon:hover { filter: brightness(1.1); }
/* Selected node highlight */
.node.selected, .composite-icon.selected { filter: drop-shadow(0 0 6px #0078D7); }
/* Copy toast */
.copy-toast {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 1001;
  pointer-events: none;
}
/* Hover tooltip */
.hover-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1002;
  pointer-events: none;
  max-width: 300px;
}`;
}

/**
 * CSS for preview HTML
 */
export function getPreviewCss(): string {
  return `.gospelo-diagram {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
  padding: 20px;
  box-sizing: border-box;
  background: #f5f5f5;
}
.gospelo-diagram svg {
  max-width: 100%;
  height: auto;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-radius: 4px;
}
.node-label { font-weight: 500; }
.group-box { filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.1)); }
.connection { stroke-linecap: round; stroke-linejoin: round; }
/* Hide UI elements in preview */
.boundary-box { display: none; }
/* Node hover effect */
.node, .composite-icon { cursor: pointer; }
.node:hover, .composite-icon:hover { filter: brightness(1.1); }
/* Selected node highlight */
.node.selected, .composite-icon.selected { filter: drop-shadow(0 0 6px #0078D7); }
/* Copy toast */
.copy-toast {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 1001;
  pointer-events: none;
}
/* Hover tooltip */
.hover-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1002;
  pointer-events: none;
  max-width: 300px;
}
/* Confidential badge */
.confidential-badge {
  position: fixed;
  bottom: 16px;
  right: 16px;
  padding: 4px 10px;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 11px;
  font-weight: 300;
  font-style: italic;
  color: #333;
  border: 1px solid #333;
  border-radius: 2px;
  letter-spacing: 0.5px;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
}
.confidential-badge:hover {
  background: rgba(240, 240, 240, 0.95);
}
/* License popup */
.license-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.license-popup-overlay.visible {
  display: flex;
}
.license-popup {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.license-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.license-popup-close {
  border: none;
  background: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 0 4px;
}
.license-popup-close:hover {
  color: #333;
}
.license-popup-content {
  padding: 16px;
  overflow-y: auto;
}
.license-popup-content pre {
  margin: 0;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 12px;
  line-height: 1.6;
  color: #444;
  white-space: pre-wrap;
}`;
}
