import { describe, expect, test } from 'bun:test';
import { computeLayout } from '../../src/layout/layout';
import { parseDiagram } from '../../src/core/parser';
import type { DiagramDefinition } from '../../src/core/types';

describe('Resources', () => {
  describe('Icon Resolution', () => {
    test('should resolve icon from resources when node has no icon', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        resources: {
          '@api': { icon: 'aws:api_gateway', desc: 'API endpoint' },
          '@lambda': { icon: 'aws:lambda', desc: 'Business logic' },
        },
        nodes: [
          { id: '@api', label: 'API Gateway', position: [100, 100] },
          { id: '@lambda', label: 'Lambda', position: [300, 100] },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].icon).toBe('aws:api_gateway');
      expect(computed[1].icon).toBe('aws:lambda');
    });

    test('should use node icon when specified (overrides resource)', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        resources: {
          '@api': { icon: 'aws:api_gateway' },
        },
        nodes: [
          { id: '@api', icon: 'aws:lambda', label: 'Override', position: [100, 100] },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].icon).toBe('aws:lambda');
    });

    test('should work without resources (backward compatible)', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        nodes: [
          { id: 'api', icon: 'aws:api_gateway', label: 'API', position: [100, 100] },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].icon).toBe('aws:api_gateway');
    });

    test('should resolve icons for child nodes', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        resources: {
          '@child1': { icon: 'aws:lambda' },
          '@child2': { icon: 'aws:dynamodb' },
        },
        nodes: [
          {
            id: 'group',
            type: 'group',
            label: 'VPC',
            position: [100, 100],
            size: [400, 300],
            children: [
              { id: '@child1', label: 'Lambda', position: [50, 50], parentId: 'group' },
              { id: '@child2', label: 'DynamoDB', position: [200, 50], parentId: 'group' },
            ],
          },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].children?.[0].icon).toBe('aws:lambda');
      expect(computed[0].children?.[1].icon).toBe('aws:dynamodb');
    });
  });

  describe('Validation', () => {
    test('should throw error when same resource ID is used by multiple nodes', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        resources: {
          '@api': { icon: 'aws:api_gateway' },
        },
        nodes: [
          { id: '@api', label: 'API 1', position: [100, 100] },
          { id: '@api', label: 'API 2', position: [300, 100] },
        ],
      };

      expect(() => computeLayout(diagram)).toThrow(
        'Resource "@api" is used by multiple nodes'
      );
    });

    test('should allow nodes without matching resource', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        resources: {
          '@api': { icon: 'aws:api_gateway' },
        },
        nodes: [
          { id: '@api', label: 'API', position: [100, 100] },
          { id: 'other', icon: 'aws:lambda', label: 'Other', position: [300, 100] },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].icon).toBe('aws:api_gateway');
      expect(computed[1].icon).toBe('aws:lambda');
    });
  });

  describe('Parser', () => {
    test('should parse resources from JSON', () => {
      const json = {
        title: 'Test',
        resources: {
          '@api': { icon: 'aws:api_gateway', desc: 'Main endpoint' },
        },
        nodes: [{ id: '@api', label: 'API', position: [100, 100] }],
      };

      const diagram = parseDiagram(json as any);

      expect(diagram.resources).toBeDefined();
      expect(diagram.resources?.['@api'].icon).toBe('aws:api_gateway');
      expect(diagram.resources?.['@api'].desc).toBe('Main endpoint');
    });

    test('should parse JSON string with resources', () => {
      const jsonStr = JSON.stringify({
        title: 'Test',
        resources: {
          '@lambda': { icon: 'aws:lambda' },
        },
        nodes: [{ id: '@lambda', label: 'Lambda', position: [100, 100] }],
      });

      const diagram = parseDiagram(jsonStr);

      expect(diagram.resources?.['@lambda'].icon).toBe('aws:lambda');
    });

    test('should work without resources field', () => {
      const json = {
        title: 'Test',
        nodes: [{ id: 'api', icon: 'aws:api_gateway', position: [100, 100] }],
      };

      const diagram = parseDiagram(json as any);

      expect(diagram.resources).toBeUndefined();
    });
  });

  describe('ID with @ prefix', () => {
    test('should handle @ prefix in node IDs', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        resources: {
          '@api': { icon: 'aws:api_gateway' },
          '@db': { icon: 'aws:dynamodb' },
        },
        nodes: [
          { id: '@api', label: 'API', position: [100, 100] },
          { id: '@db', label: 'DB', position: [300, 100] },
        ],
        connections: [{ from: '@api', to: '@db' }],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].id).toBe('@api');
      expect(computed[1].id).toBe('@db');
    });

    test('should allow mixed IDs (with and without @)', () => {
      const diagram: DiagramDefinition = {
        title: 'Test',
        resources: {
          '@api': { icon: 'aws:api_gateway' },
        },
        nodes: [
          { id: '@api', label: 'API', position: [100, 100] },
          { id: 'lambda', icon: 'aws:lambda', label: 'Lambda', position: [300, 100] },
        ],
      };

      const computed = computeLayout(diagram);

      expect(computed[0].id).toBe('@api');
      expect(computed[0].icon).toBe('aws:api_gateway');
      expect(computed[1].id).toBe('lambda');
      expect(computed[1].icon).toBe('aws:lambda');
    });
  });
});
