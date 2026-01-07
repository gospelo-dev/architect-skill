/**
 * Interval-based reservation system tests
 * Tests for:
 * - isVerticalLineConflict: Y interval overlap check for vertical lines
 * - isHorizontalLineConflict: X interval overlap check for horizontal lines
 * - registerIconAreaReservations: Icon 4-edge reservation
 */

import { describe, test, expect } from 'bun:test';
import {
  isVerticalLineConflict,
  isHorizontalLineConflict,
  ReservedVerticalLines,
  ReservedHorizontalLines,
} from '../../src/layout/connections';
import { registerIconAreaReservations } from '../../src/utils/connection-utils';
import type { ComputedNode } from '../../src/core/types';

describe('isVerticalLineConflict', () => {
  describe('basic overlap detection', () => {
    test('should detect conflict when Y intervals fully overlap', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 50, yMax: 150 },
      ];
      // Same X, overlapping Y interval
      expect(isVerticalLineConflict(100, 60, 140, reserved)).toBe(true);
    });

    test('should detect conflict when new line contains existing', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 80, yMax: 120 },
      ];
      // New line (50-150) contains existing (80-120)
      expect(isVerticalLineConflict(100, 50, 150, reserved)).toBe(true);
    });

    test('should detect conflict when existing contains new line', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 50, yMax: 150 },
      ];
      // Existing (50-150) contains new line (80-120)
      expect(isVerticalLineConflict(100, 80, 120, reserved)).toBe(true);
    });

    test('should detect conflict when intervals partially overlap (top)', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 100, yMax: 200 },
      ];
      // New line (50-150) overlaps top of existing (100-200)
      expect(isVerticalLineConflict(100, 50, 150, reserved)).toBe(true);
    });

    test('should detect conflict when intervals partially overlap (bottom)', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 100, yMax: 200 },
      ];
      // New line (150-250) overlaps bottom of existing (100-200)
      expect(isVerticalLineConflict(100, 150, 250, reserved)).toBe(true);
    });

    test('should detect conflict when intervals touch at boundary', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 100, yMax: 200 },
      ];
      // New line ends exactly where existing starts (touching)
      expect(isVerticalLineConflict(100, 50, 100, reserved)).toBe(true);
    });
  });

  describe('no conflict cases', () => {
    test('should not conflict when Y intervals do not overlap (above)', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 100, yMax: 200 },
      ];
      // New line (10-90) is above existing (100-200)
      expect(isVerticalLineConflict(100, 10, 90, reserved)).toBe(false);
    });

    test('should not conflict when Y intervals do not overlap (below)', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 100, yMax: 200 },
      ];
      // New line (210-300) is below existing (100-200)
      expect(isVerticalLineConflict(100, 210, 300, reserved)).toBe(false);
    });

    test('should not conflict when X coordinates differ significantly', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 50, yMax: 150 },
      ];
      // Same Y interval but X is far away (> TOLERANCE of 5)
      expect(isVerticalLineConflict(200, 50, 150, reserved)).toBe(false);
    });

    test('should not conflict with empty reservation list', () => {
      const reserved: ReservedVerticalLines = [];
      expect(isVerticalLineConflict(100, 50, 150, reserved)).toBe(false);
    });
  });

  describe('X coordinate tolerance', () => {
    test('should detect conflict within tolerance (X diff = 3)', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 50, yMax: 150 },
      ];
      // X = 103, diff = 3 < TOLERANCE(5), Y overlaps
      expect(isVerticalLineConflict(103, 60, 140, reserved)).toBe(true);
    });

    test('should detect conflict within tolerance (X diff = 4)', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 50, yMax: 150 },
      ];
      // X = 104, diff = 4 < TOLERANCE(5), Y overlaps
      expect(isVerticalLineConflict(104, 60, 140, reserved)).toBe(true);
    });

    test('should not conflict at tolerance boundary (X diff = 5)', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 50, yMax: 150 },
      ];
      // X = 105, diff = 5 >= TOLERANCE(5), no conflict
      expect(isVerticalLineConflict(105, 60, 140, reserved)).toBe(false);
    });

    test('should not conflict beyond tolerance (X diff = 6)', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 50, yMax: 150 },
      ];
      // X = 106, diff = 6 > TOLERANCE(5), no conflict
      expect(isVerticalLineConflict(106, 60, 140, reserved)).toBe(false);
    });
  });

  describe('multiple reservations', () => {
    test('should detect conflict with any of multiple reservations', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 50, yMax: 100 },
        { x: 100, yMin: 200, yMax: 250 },
        { x: 100, yMin: 300, yMax: 350 },
      ];
      // Conflicts with second reservation
      expect(isVerticalLineConflict(100, 210, 240, reserved)).toBe(true);
    });

    test('should not conflict when between separate reservations', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 50, yMax: 100 },
        { x: 100, yMin: 200, yMax: 250 },
      ];
      // New line (120-180) is between the two reservations
      expect(isVerticalLineConflict(100, 120, 180, reserved)).toBe(false);
    });

    test('should handle reservations at different X coordinates', () => {
      const reserved: ReservedVerticalLines = [
        { x: 100, yMin: 50, yMax: 150 },
        { x: 200, yMin: 50, yMax: 150 },
        { x: 300, yMin: 50, yMax: 150 },
      ];
      // Only conflicts with X=200 reservation
      expect(isVerticalLineConflict(200, 60, 140, reserved)).toBe(true);
      // No conflict at X=150 (between 100 and 200)
      expect(isVerticalLineConflict(150, 60, 140, reserved)).toBe(false);
    });
  });
});

describe('isHorizontalLineConflict', () => {
  describe('basic overlap detection', () => {
    test('should detect conflict when X intervals fully overlap', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 50, xMax: 150 },
      ];
      // Same Y, overlapping X interval
      expect(isHorizontalLineConflict(100, 60, 140, reserved)).toBe(true);
    });

    test('should detect conflict when new line contains existing', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 80, xMax: 120 },
      ];
      // New line (50-150) contains existing (80-120)
      expect(isHorizontalLineConflict(100, 50, 150, reserved)).toBe(true);
    });

    test('should detect conflict when existing contains new line', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 50, xMax: 150 },
      ];
      // Existing (50-150) contains new line (80-120)
      expect(isHorizontalLineConflict(100, 80, 120, reserved)).toBe(true);
    });

    test('should detect conflict when intervals partially overlap (left)', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 100, xMax: 200 },
      ];
      // New line (50-150) overlaps left of existing (100-200)
      expect(isHorizontalLineConflict(100, 50, 150, reserved)).toBe(true);
    });

    test('should detect conflict when intervals partially overlap (right)', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 100, xMax: 200 },
      ];
      // New line (150-250) overlaps right of existing (100-200)
      expect(isHorizontalLineConflict(100, 150, 250, reserved)).toBe(true);
    });

    test('should detect conflict when intervals touch at boundary', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 100, xMax: 200 },
      ];
      // New line ends exactly where existing starts (touching)
      expect(isHorizontalLineConflict(100, 50, 100, reserved)).toBe(true);
    });
  });

  describe('no conflict cases', () => {
    test('should not conflict when X intervals do not overlap (left)', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 100, xMax: 200 },
      ];
      // New line (10-90) is left of existing (100-200)
      expect(isHorizontalLineConflict(100, 10, 90, reserved)).toBe(false);
    });

    test('should not conflict when X intervals do not overlap (right)', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 100, xMax: 200 },
      ];
      // New line (210-300) is right of existing (100-200)
      expect(isHorizontalLineConflict(100, 210, 300, reserved)).toBe(false);
    });

    test('should not conflict when Y coordinates differ significantly', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 50, xMax: 150 },
      ];
      // Same X interval but Y is far away (> TOLERANCE of 5)
      expect(isHorizontalLineConflict(200, 50, 150, reserved)).toBe(false);
    });

    test('should not conflict with empty reservation list', () => {
      const reserved: ReservedHorizontalLines = [];
      expect(isHorizontalLineConflict(100, 50, 150, reserved)).toBe(false);
    });
  });

  describe('Y coordinate tolerance', () => {
    test('should detect conflict within tolerance (Y diff = 3)', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 50, xMax: 150 },
      ];
      // Y = 103, diff = 3 < TOLERANCE(5), X overlaps
      expect(isHorizontalLineConflict(103, 60, 140, reserved)).toBe(true);
    });

    test('should detect conflict within tolerance (Y diff = 4)', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 50, xMax: 150 },
      ];
      // Y = 104, diff = 4 < TOLERANCE(5), X overlaps
      expect(isHorizontalLineConflict(104, 60, 140, reserved)).toBe(true);
    });

    test('should not conflict at tolerance boundary (Y diff = 5)', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 50, xMax: 150 },
      ];
      // Y = 105, diff = 5 >= TOLERANCE(5), no conflict
      expect(isHorizontalLineConflict(105, 60, 140, reserved)).toBe(false);
    });

    test('should not conflict beyond tolerance (Y diff = 6)', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 50, xMax: 150 },
      ];
      // Y = 106, diff = 6 > TOLERANCE(5), no conflict
      expect(isHorizontalLineConflict(106, 60, 140, reserved)).toBe(false);
    });
  });

  describe('multiple reservations', () => {
    test('should detect conflict with any of multiple reservations', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 50, xMax: 100 },
        { y: 100, xMin: 200, xMax: 250 },
        { y: 100, xMin: 300, xMax: 350 },
      ];
      // Conflicts with second reservation
      expect(isHorizontalLineConflict(100, 210, 240, reserved)).toBe(true);
    });

    test('should not conflict when between separate reservations', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 50, xMax: 100 },
        { y: 100, xMin: 200, xMax: 250 },
      ];
      // New line (120-180) is between the two reservations
      expect(isHorizontalLineConflict(100, 120, 180, reserved)).toBe(false);
    });

    test('should handle reservations at different Y coordinates', () => {
      const reserved: ReservedHorizontalLines = [
        { y: 100, xMin: 50, xMax: 150 },
        { y: 200, xMin: 50, xMax: 150 },
        { y: 300, xMin: 50, xMax: 150 },
      ];
      // Only conflicts with Y=200 reservation
      expect(isHorizontalLineConflict(200, 60, 140, reserved)).toBe(true);
      // No conflict at Y=150 (between 100 and 200)
      expect(isHorizontalLineConflict(150, 60, 140, reserved)).toBe(false);
    });
  });
});

describe('registerIconAreaReservations', () => {
  // Helper to create a mock ComputedNode
  function createMockNode(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    type?: string
  ): ComputedNode {
    return {
      id,
      computedX: x,
      computedY: y,
      computedWidth: width,
      computedHeight: height,
      type: type as ComputedNode['type'],
      bounds: {
        left: x,
        top: y,
        right: x + width,
        bottom: y + height,
        centerX: x + width / 2,
        centerY: y + height / 2,
        width,
        height,
      },
    };
  }

  describe('single icon node', () => {
    test('should register 4 edges for a single icon node', () => {
      const node = createMockNode('icon1', 100, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Should have 2 vertical lines (left and right edges)
      expect(verticalLines.length).toBe(2);
      // Should have 2 horizontal lines (top and bottom edges)
      expect(horizontalLines.length).toBe(2);
    });

    test('should register left edge as vertical line with correct Y interval', () => {
      const node = createMockNode('icon1', 100, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Left edge: x = 100 - reserveMargin(4) = 96
      const leftEdge = verticalLines.find((l) => l.x === 96);
      expect(leftEdge).toBeDefined();
      expect(leftEdge!.yMin).toBe(96); // 100 - 4
      expect(leftEdge!.yMax).toBe(152); // 100 + 48 + 4
    });

    test('should register right edge as vertical line with correct Y interval', () => {
      const node = createMockNode('icon1', 100, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Right edge: x = 100 + 48 + reserveMargin(4) = 152
      const rightEdge = verticalLines.find((l) => l.x === 152);
      expect(rightEdge).toBeDefined();
      expect(rightEdge!.yMin).toBe(96); // 100 - 4
      expect(rightEdge!.yMax).toBe(152); // 100 + 48 + 4
    });

    test('should register top edge as horizontal line with correct X interval', () => {
      const node = createMockNode('icon1', 100, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Top edge: y = 100 - reserveMargin(4) = 96
      const topEdge = horizontalLines.find((l) => l.y === 96);
      expect(topEdge).toBeDefined();
      expect(topEdge!.xMin).toBe(96); // 100 - 4
      expect(topEdge!.xMax).toBe(152); // 100 + 48 + 4
    });

    test('should register bottom edge as horizontal line with correct X interval', () => {
      const node = createMockNode('icon1', 100, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Bottom edge: y = 100 + 48 + reserveMargin(4) = 152
      const bottomEdge = horizontalLines.find((l) => l.y === 152);
      expect(bottomEdge).toBeDefined();
      expect(bottomEdge!.xMin).toBe(96); // 100 - 4
      expect(bottomEdge!.xMax).toBe(152); // 100 + 48 + 4
    });
  });

  describe('group nodes', () => {
    test('should skip group nodes (children register individually)', () => {
      const groupNode = createMockNode('group1', 50, 50, 200, 200, 'group');
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([groupNode], verticalLines, horizontalLines);

      // Group nodes are skipped (children should register individually)
      expect(verticalLines.length).toBe(0);
      expect(horizontalLines.length).toBe(0);
    });

    test('should only register children inside group, not the group itself', () => {
      const groupNode = createMockNode('group1', 50, 50, 200, 200, 'group');
      const childNode = createMockNode('icon1', 100, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([groupNode, childNode], verticalLines, horizontalLines);

      // Only child node should be registered (2 edges each)
      expect(verticalLines.length).toBe(2);
      expect(horizontalLines.length).toBe(2);
    });
  });

  describe('multiple icon nodes', () => {
    test('should register all edges for multiple nodes', () => {
      const node1 = createMockNode('icon1', 100, 100, 48, 48);
      const node2 = createMockNode('icon2', 200, 100, 48, 48);
      const node3 = createMockNode('icon3', 300, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node1, node2, node3], verticalLines, horizontalLines);

      // 3 nodes * 2 vertical edges = 6 vertical lines
      expect(verticalLines.length).toBe(6);
      // 3 nodes * 2 horizontal edges = 6 horizontal lines
      expect(horizontalLines.length).toBe(6);
    });

    test('should correctly register edges for horizontally aligned nodes', () => {
      // Three nodes in a row at Y=100
      const node1 = createMockNode('icon1', 100, 100, 48, 48);
      const node2 = createMockNode('icon2', 200, 100, 48, 48);
      const node3 = createMockNode('icon3', 300, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node1, node2, node3], verticalLines, horizontalLines);

      // All horizontal lines should have same Y values (96 and 152) with reserveMargin=4
      const topEdges = horizontalLines.filter((l) => l.y === 96);
      const bottomEdges = horizontalLines.filter((l) => l.y === 152);
      expect(topEdges.length).toBe(3);
      expect(bottomEdges.length).toBe(3);
    });

    test('should correctly register edges for vertically aligned nodes', () => {
      // Three nodes in a column at X=100
      const node1 = createMockNode('icon1', 100, 100, 48, 48);
      const node2 = createMockNode('icon2', 100, 200, 48, 48);
      const node3 = createMockNode('icon3', 100, 300, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node1, node2, node3], verticalLines, horizontalLines);

      // All vertical lines should have same X values (96 and 152) with reserveMargin=4
      const leftEdges = verticalLines.filter((l) => l.x === 96);
      const rightEdges = verticalLines.filter((l) => l.x === 152);
      expect(leftEdges.length).toBe(3);
      expect(rightEdges.length).toBe(3);

      // But Y intervals should differ
      const yMins = leftEdges.map((l) => l.yMin).sort((a, b) => a - b);
      expect(yMins).toEqual([96, 196, 296]); // Each node's top - reserveMargin(4)
    });
  });

  describe('nodes without bounds', () => {
    test('should skip nodes without bounds', () => {
      const nodeWithoutBounds: ComputedNode = {
        id: 'icon1',
        computedX: 100,
        computedY: 100,
        computedWidth: 48,
        computedHeight: 48,
        bounds: undefined,
      };
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([nodeWithoutBounds], verticalLines, horizontalLines);

      expect(verticalLines.length).toBe(0);
      expect(horizontalLines.length).toBe(0);
    });
  });

  describe('composite and text_box nodes', () => {
    test('should skip composite nodes (children register individually)', () => {
      const compositeNode = createMockNode('composite1', 100, 100, 80, 200, 'composite');
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([compositeNode], verticalLines, horizontalLines);

      // Composite nodes are skipped (children should register individually)
      expect(verticalLines.length).toBe(0);
      expect(horizontalLines.length).toBe(0);
    });

    test('should register text_box node edges', () => {
      // text_box: 120x40 at (100, 100)
      const textBoxNode = createMockNode('textbox1', 100, 100, 120, 40, 'text_box');
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([textBoxNode], verticalLines, horizontalLines);

      expect(verticalLines.length).toBe(2);
      expect(horizontalLines.length).toBe(2);

      // 内接円の半径 = min(120, 40) / 2 = 20
      // reserveRadius = 20 + 5 - 1 = 24
      // centerX = 100 + 120/2 = 160, centerY = 100 + 40/2 = 120
      // top = 120 - 24 = 96, left = 160 - 24 = 136, right = 160 + 24 = 184, bottom = 120 + 24 = 144
      const topEdge = horizontalLines.find((l) => l.y === 96);
      expect(topEdge).toBeDefined();
      expect(topEdge!.xMin).toBe(136);
      expect(topEdge!.xMax).toBe(184);
    });
  });

  describe('integration with conflict detection', () => {
    test('should cause conflicts for lines crossing icon area', () => {
      const node = createMockNode('icon1', 100, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Vertical line at X=120 (inside icon) should not conflict (only edges are reserved)
      // Icon bounds: left=100, right=148, with reserveMargin=4: 96-152
      expect(isVerticalLineConflict(120, 90, 160, verticalLines)).toBe(false);
      // But at the exact edge X should conflict
      expect(isVerticalLineConflict(96, 90, 160, verticalLines)).toBe(true);
      expect(isVerticalLineConflict(152, 90, 160, verticalLines)).toBe(true);

      // Horizontal line at Y=120 (inside icon) should not conflict
      expect(isHorizontalLineConflict(120, 90, 160, horizontalLines)).toBe(false);
      // But at the exact edge Y should conflict
      expect(isHorizontalLineConflict(96, 90, 160, horizontalLines)).toBe(true);
      expect(isHorizontalLineConflict(152, 90, 160, horizontalLines)).toBe(true);
    });

    test('should not cause conflicts for lines outside icon area', () => {
      const node = createMockNode('icon1', 100, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Vertical line far from icon should not conflict
      expect(isVerticalLineConflict(50, 90, 160, verticalLines)).toBe(false);
      expect(isVerticalLineConflict(200, 90, 160, verticalLines)).toBe(false);

      // Horizontal line far from icon should not conflict
      expect(isHorizontalLineConflict(50, 90, 160, horizontalLines)).toBe(false);
      expect(isHorizontalLineConflict(200, 90, 160, horizontalLines)).toBe(false);
    });

    test('should allow vertical lines to pass above or below icon', () => {
      const node = createMockNode('icon1', 100, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Vertical line at same X as left edge but Y interval above icon
      expect(isVerticalLineConflict(96, 10, 80, verticalLines)).toBe(false);
      // Vertical line at same X as left edge but Y interval below icon
      expect(isVerticalLineConflict(96, 170, 250, verticalLines)).toBe(false);
    });

    test('should allow horizontal lines to pass left or right of icon', () => {
      const node = createMockNode('icon1', 100, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Horizontal line at same Y as top edge but X interval left of icon
      expect(isHorizontalLineConflict(96, 10, 80, horizontalLines)).toBe(false);
      // Horizontal line at same Y as top edge but X interval right of icon
      expect(isHorizontalLineConflict(96, 170, 250, horizontalLines)).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle empty node list', () => {
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([], verticalLines, horizontalLines);

      expect(verticalLines.length).toBe(0);
      expect(horizontalLines.length).toBe(0);
    });

    test('should append to existing reservations', () => {
      const node = createMockNode('icon1', 100, 100, 48, 48);
      const verticalLines: ReservedVerticalLines = [
        { x: 50, yMin: 50, yMax: 150 },
      ];
      const horizontalLines: ReservedHorizontalLines = [
        { y: 50, xMin: 50, xMax: 150 },
      ];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Should have original + new reservations
      expect(verticalLines.length).toBe(3); // 1 original + 2 new
      expect(horizontalLines.length).toBe(3); // 1 original + 2 new
    });

    test('should handle nodes at origin (0, 0)', () => {
      const node = createMockNode('icon1', 0, 0, 48, 48);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Left edge: x = 0 - reserveMargin(4) = -4
      const leftEdge = verticalLines.find((l) => l.x === -4);
      expect(leftEdge).toBeDefined();
      expect(leftEdge!.yMin).toBe(-4);
      expect(leftEdge!.yMax).toBe(52);
    });

    test('should handle large nodes', () => {
      const node = createMockNode('largeIcon', 100, 100, 500, 500);
      const verticalLines: ReservedVerticalLines = [];
      const horizontalLines: ReservedHorizontalLines = [];

      registerIconAreaReservations([node], verticalLines, horizontalLines);

      // Right edge: x = 100 + 500 + reserveMargin(4) = 604
      const rightEdge = verticalLines.find((l) => l.x === 604);
      expect(rightEdge).toBeDefined();
      expect(rightEdge!.yMin).toBe(96);
      expect(rightEdge!.yMax).toBe(604);
    });
  });
});
