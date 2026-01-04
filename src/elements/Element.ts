/**
 * Base Element class for SVG elements
 * Inspired by SVG.js Element pattern
 */

export interface ElementAttributes {
  [key: string]: string | number | undefined;
}

/**
 * Base class for all SVG elements
 */
export class Element {
  protected tagName: string;
  protected attributes: ElementAttributes;
  protected children: Element[];
  protected textContent: string;

  constructor(tagName: string, attrs: ElementAttributes = {}) {
    this.tagName = tagName;
    this.attributes = attrs;
    this.children = [];
    this.textContent = '';
  }

  /**
   * Set attribute value
   */
  attr(name: string, value: string | number): this;
  attr(attrs: ElementAttributes): this;
  attr(nameOrAttrs: string | ElementAttributes, value?: string | number): this {
    if (typeof nameOrAttrs === 'string') {
      this.attributes[nameOrAttrs] = value;
    } else {
      Object.assign(this.attributes, nameOrAttrs);
    }
    return this;
  }

  /**
   * Get attribute value
   */
  getAttr(name: string): string | number | undefined {
    return this.attributes[name];
  }

  /**
   * Add child element
   */
  add(child: Element): this {
    this.children.push(child);
    return this;
  }

  /**
   * Set text content
   */
  text(content: string): this {
    this.textContent = content;
    return this;
  }

  /**
   * Move element to position
   */
  move(x: number, y: number): this {
    return this.attr({ x, y });
  }

  /**
   * Set element size
   */
  size(width: number, height: number): this {
    return this.attr({ width, height });
  }

  /**
   * Apply transform
   */
  transform(transformStr: string): this {
    return this.attr('transform', transformStr);
  }

  /**
   * Translate element
   */
  translate(x: number, y: number): this {
    return this.transform(`translate(${x}, ${y})`);
  }

  /**
   * Render to SVG string
   */
  render(): string {
    const attrs = Object.entries(this.attributes)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}="${this.escapeAttr(String(v))}"`)
      .join(' ');

    const attrStr = attrs ? ` ${attrs}` : '';
    const childrenStr = this.children.map(c => c.render()).join('\n');
    const content = this.textContent || childrenStr;

    if (content) {
      return `<${this.tagName}${attrStr}>${content}</${this.tagName}>`;
    }
    return `<${this.tagName}${attrStr}/>`;
  }

  /**
   * Escape attribute value
   */
  protected escapeAttr(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

/**
 * SVG root element
 */
export class Svg extends Element {
  constructor(width: number, height: number) {
    super('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      'xmlns:xlink': 'http://www.w3.org/1999/xlink',
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
    });
  }

  /**
   * Add defs section
   */
  defs(): Defs {
    const defs = new Defs();
    this.add(defs);
    return defs;
  }
}

/**
 * Defs element for reusable definitions
 */
export class Defs extends Element {
  constructor() {
    super('defs');
  }
}

/**
 * Group element
 */
export class G extends Element {
  constructor(attrs: ElementAttributes = {}) {
    super('g', attrs);
  }
}

/**
 * Rectangle element
 */
export class Rect extends Element {
  constructor(attrs: ElementAttributes = {}) {
    super('rect', attrs);
  }

  /**
   * Set corner radius
   */
  radius(rx: number, ry?: number): this {
    return this.attr({ rx, ry: ry ?? rx });
  }

  /**
   * Set fill color
   */
  fill(color: string): this {
    return this.attr('fill', color);
  }

  /**
   * Set stroke
   */
  stroke(color: string, width: number = 1): this {
    return this.attr({ stroke: color, 'stroke-width': width });
  }
}

/**
 * Path element
 */
export class Path extends Element {
  constructor(d: string = '', attrs: ElementAttributes = {}) {
    super('path', { d, ...attrs });
  }

  /**
   * Set path data
   */
  plot(d: string): this {
    return this.attr('d', d);
  }

  /**
   * Set fill
   */
  fill(color: string): this {
    return this.attr('fill', color);
  }

  /**
   * Set stroke
   */
  stroke(color: string, width: number = 1): this {
    return this.attr({ stroke: color, 'stroke-width': width });
  }
}

/**
 * Text element
 */
export class Text extends Element {
  constructor(content: string = '', attrs: ElementAttributes = {}) {
    super('text', attrs);
    this.textContent = content;
  }

  /**
   * Set font size
   */
  fontSize(size: number): this {
    return this.attr('font-size', size);
  }

  /**
   * Set text anchor
   */
  anchor(value: 'start' | 'middle' | 'end'): this {
    return this.attr('text-anchor', value);
  }

  /**
   * Set fill color
   */
  fill(color: string): this {
    return this.attr('fill', color);
  }
}

/**
 * Image element (for external icons)
 */
export class Image extends Element {
  constructor(href: string, attrs: ElementAttributes = {}) {
    super('image', { href, ...attrs });
  }
}

/**
 * Line element
 */
export class Line extends Element {
  constructor(x1: number, y1: number, x2: number, y2: number, attrs: ElementAttributes = {}) {
    super('line', { x1, y1, x2, y2, ...attrs });
  }

  /**
   * Set stroke
   */
  stroke(color: string, width: number = 1): this {
    return this.attr({ stroke: color, 'stroke-width': width });
  }
}

/**
 * Marker element (for arrows)
 */
export class Marker extends Element {
  constructor(id: string, attrs: ElementAttributes = {}) {
    super('marker', {
      id,
      viewBox: '0 0 10 10',
      refX: 9,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: 'auto-start-reverse',
      ...attrs,
    });
  }
}

/**
 * Linear gradient element
 */
export class LinearGradient extends Element {
  constructor(id: string, attrs: ElementAttributes = {}) {
    super('linearGradient', { id, ...attrs });
  }

  /**
   * Add gradient stop
   */
  stop(offset: string, color: string, opacity: number = 1): this {
    const stop = new Element('stop', {
      offset,
      'stop-color': color,
      'stop-opacity': opacity,
    });
    this.add(stop);
    return this;
  }

  /**
   * Set gradient direction
   */
  direction(dir: 'south' | 'east' | 'north' | 'west'): this {
    const coords: Record<string, ElementAttributes> = {
      south: { x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
      north: { x1: '0%', y1: '100%', x2: '0%', y2: '0%' },
      east: { x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
      west: { x1: '100%', y1: '0%', x2: '0%', y2: '0%' },
    };
    return this.attr(coords[dir]);
  }
}
