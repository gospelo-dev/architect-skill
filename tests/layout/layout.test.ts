import { describe, expect, test } from 'bun:test';
import { computeLayout, getNodeCenter, getNodeAnchors } from '../../src/layout/layout';
import type { DiagramDefinition, ComputedNode } from '../../src/core/types';

describe('Layout', () => {
  describe('computeLayout', () => {
    test('should compute position from explicit position', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [{ id: 'a', icon: 'aws:lambda', position: [100, 200] }],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].computedX).toBe(100);
      expect(computed[0].computedY).toBe(200);
    });

    test('should compute default size for icon node', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [{ id: 'a', icon: 'aws:lambda', position: [100, 100] }],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].computedWidth).toBe(48); // DEFAULT_ICON_SIZE
      expect(computed[0].computedHeight).toBe(128); // 48 + 80 (DEFAULT_LABEL_HEIGHT)
    });

    test('should use explicit size when provided', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [{ id: 'a', icon: 'aws:lambda', position: [100, 100], size: [60, 80] }],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].computedWidth).toBe(60);
      expect(computed[0].computedHeight).toBe(80);
    });
  });

  describe('group node layout', () => {
    test('should compute group size from explicit size', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          {
            id: 'group',
            type: 'group',
            position: [100, 100],
            size: [400, 300],
          },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].computedWidth).toBe(400);
      expect(computed[0].computedHeight).toBe(300);
    });

    test('should compute group size automatically (horizontal)', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          {
            id: 'group',
            type: 'group',
            layout: 'horizontal',
            position: [100, 100],
            children: [
              { id: 'c1', icon: 'aws:lambda', parentId: 'group' },
              { id: 'c2', icon: 'aws:s3', parentId: 'group' },
            ],
          },
        ],
      };

      const computed = computeLayout(diagram);

      // 2 children * (48 + 30) = 156 + padding 40 = 196
      expect(computed[0].computedWidth).toBeGreaterThan(100);
      expect(computed[0].computedHeight).toBeGreaterThan(100);
    });

    test('should compute group size automatically (vertical)', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          {
            id: 'group',
            type: 'group',
            layout: 'vertical',
            position: [100, 100],
            children: [
              { id: 'c1', icon: 'aws:lambda', parentId: 'group' },
              { id: 'c2', icon: 'aws:s3', parentId: 'group' },
            ],
          },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].computedWidth).toBeGreaterThan(50);
      expect(computed[0].computedHeight).toBeGreaterThan(200);
    });

    test('should compute child positions without explicit position', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          {
            id: 'group',
            type: 'group',
            position: [100, 100],
            size: [400, 300],
            children: [
              { id: 'c1', icon: 'aws:lambda', parentId: 'group' },
              { id: 'c2', icon: 'aws:s3', parentId: 'group' },
            ],
          },
        ],
      };

      const computed = computeLayout(diagram);
      const children = computed[0].children as ComputedNode[];

      // Children should have computed positions
      expect(children[0].computedX).toBeGreaterThan(0);
      expect(children[0].computedY).toBeGreaterThan(0);
      expect(children[1].computedX).toBeGreaterThan(children[0].computedX);
    });

    test('should compute child positions vertically', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          {
            id: 'group',
            type: 'group',
            layout: 'vertical',
            position: [100, 100],
            size: [200, 400],
            children: [
              { id: 'c1', icon: 'aws:lambda', parentId: 'group', layout: 'vertical' },
              { id: 'c2', icon: 'aws:s3', parentId: 'group', layout: 'vertical' },
            ],
          },
        ],
      };

      const computed = computeLayout(diagram);
      const children = computed[0].children as ComputedNode[];

      // Both children should have computed positions
      expect(children[0].computedY).toBeGreaterThan(0);
      expect(children[1].computedY).toBeGreaterThan(0);
      // X positions should be the same (vertical layout)
      expect(children[1].computedX).toBe(children[0].computedX);
    });
  });

  describe('composite node layout', () => {
    test('should compute composite size from explicit size', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          {
            id: 'comp',
            type: 'composite',
            position: [100, 100],
            size: [120, 200],
          },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].computedWidth).toBe(120);
      expect(computed[0].computedHeight).toBe(200);
    });

    test('should compute composite size automatically (horizontal)', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          {
            id: 'comp',
            type: 'composite',
            layout: 'horizontal',
            position: [100, 100],
            icons: [
              { id: 'i1', icon: 'aws:lambda' },
              { id: 'i2', icon: 'aws:s3' },
            ],
          },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].computedWidth).toBeGreaterThan(80);
      expect(computed[0].computedHeight).toBeGreaterThan(100);
    });

    test('should compute composite size automatically (vertical)', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          {
            id: 'comp',
            type: 'composite',
            layout: 'vertical',
            position: [100, 100],
            icons: [
              { id: 'i1', icon: 'aws:lambda' },
              { id: 'i2', icon: 'aws:s3' },
            ],
          },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].computedWidth).toBeGreaterThan(60);
      expect(computed[0].computedHeight).toBeGreaterThan(150);
    });
  });

  describe('text_box node layout', () => {
    test('should compute text_box size from explicit size', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          {
            id: 'tb',
            type: 'text_box',
            position: [100, 100],
            size: [200, 80],
          },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].computedWidth).toBe(200);
      expect(computed[0].computedHeight).toBe(80);
    });

    test('should compute text_box size from label', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          {
            id: 'tb',
            type: 'text_box',
            label: 'Hello World',
            position: [100, 100],
          },
        ],
      };

      const computed = computeLayout(diagram);

      // Width based on label length * 8 + 20
      expect(computed[0].computedWidth).toBeGreaterThanOrEqual(60);
      expect(computed[0].computedHeight).toBe(30);
    });

    test('should compute text_box height with sublabel', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          {
            id: 'tb',
            type: 'text_box',
            label: 'Title',
            sublabel: 'Subtitle',
            position: [100, 100],
          },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].computedHeight).toBe(50);
    });
  });

  describe('getNodeCenter', () => {
    test('should return center point of node', () => {
      const node: ComputedNode = {
        id: 'test',
        computedX: 100,
        computedY: 200,
        computedWidth: 48,
        computedHeight: 128,
      };

      const center = getNodeCenter(node);

      expect(center.x).toBe(124); // 100 + 48/2
      expect(center.y).toBe(264); // 200 + 128/2
    });
  });

  describe('getNodeAnchors', () => {
    test('should return all anchor points', () => {
      const node: ComputedNode = {
        id: 'test',
        computedX: 100,
        computedY: 100,
        computedWidth: 100,
        computedHeight: 50,
      };

      const anchors = getNodeAnchors(node);

      expect(anchors.top).toEqual({ x: 150, y: 100 });
      expect(anchors.bottom).toEqual({ x: 150, y: 150 });
      expect(anchors.left).toEqual({ x: 100, y: 125 });
      expect(anchors.right).toEqual({ x: 200, y: 125 });
    });
  });
});
