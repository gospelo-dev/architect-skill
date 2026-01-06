import { describe, expect, test } from 'bun:test';
import { parseDiagram, validateDiagram } from '../../src/core/parser';

describe('Parser', () => {
  describe('parseDiagram', () => {
    test('should parse basic diagram', () => {
      const diagram = parseDiagram({
        title: 'Test',
        nodes: [{ id: 'a', icon: 'aws:lambda', position: [100, 100] }],
      });

      expect(diagram.title).toBe('Test');
      expect(diagram.nodes).toHaveLength(1);
    });

    test('should parse JSON string', () => {
      const json = JSON.stringify({
        title: 'Test',
        nodes: [],
      });
      const diagram = parseDiagram(json);
      expect(diagram.title).toBe('Test');
    });

    test('should throw error when title is missing', () => {
      expect(() => parseDiagram({ nodes: [] } as any)).toThrow('Diagram must have a title');
    });

    test('should parse subtitle', () => {
      const diagram = parseDiagram({
        title: 'Test',
        subtitle: 'Subtitle',
        nodes: [],
      });
      expect(diagram.subtitle).toBe('Subtitle');
    });
  });

  describe('gospelo 1.0 format', () => {
    test('should parse gospelo 1.0 format', () => {
      const diagram = parseDiagram({
        asset: { version: '1.0' },
        documents: [
          {
            type: 'diagram',
            title: 'Gospelo Diagram',
            nodes: [{ id: 'a', icon: 'aws:s3' }],
          },
        ],
      } as any);

      expect(diagram.title).toBe('Gospelo Diagram');
      expect(diagram.nodes).toHaveLength(1);
    });

    test('should throw error for empty documents array', () => {
      expect(() =>
        parseDiagram({
          asset: { version: '1.0' },
          documents: [],
        } as any)
      ).toThrow('gospelo document must have at least one document in documents array');
    });

    test('should throw error for unsupported document type', () => {
      expect(() =>
        parseDiagram({
          asset: { version: '1.0' },
          documents: [{ type: 'flowchart', title: 'Test', nodes: [] }],
        } as any)
      ).toThrow("Unsupported document type: flowchart. Only 'diagram' is currently supported.");
    });
  });

  describe('background parsing', () => {
    test('should use white background by default', () => {
      const diagram = parseDiagram({ title: 'Test', nodes: [] });
      expect(diagram.background?.type).toBe('white');
    });

    test('should parse solid background', () => {
      const diagram = parseDiagram({
        title: 'Test',
        background: { type: 'solid', color: '#f0f0f0' },
        nodes: [],
      });
      expect(diagram.background?.type).toBe('solid');
      expect(diagram.background?.color).toBe('#f0f0f0');
    });

    test('should parse gradient background with snake_case', () => {
      const diagram = parseDiagram({
        title: 'Test',
        background: {
          type: 'gradient',
          start_color: '#fff',
          end_color: '#eee',
          direction: 'south',
        },
        nodes: [],
      });
      expect(diagram.background?.type).toBe('gradient');
      expect(diagram.background?.startColor).toBe('#fff');
      expect(diagram.background?.endColor).toBe('#eee');
      expect(diagram.background?.direction).toBe('south');
    });
  });

  describe('node parsing', () => {
    test('should parse node with all properties', () => {
      const diagram = parseDiagram({
        title: 'Test',
        nodes: [
          {
            id: 'node1',
            type: 'icon',
            icon: 'aws:lambda',
            label: 'Lambda',
            sublabel: 'v1.0',
            position: [100, 200],
            size: [60, 60],
            border_color: '#ff0000',
            layout: 'vertical',
            label_position: 'top-center',
            group_icon: 'aws:vpc',
          },
        ],
      });

      const node = diagram.nodes[0];
      expect(node.id).toBe('node1');
      expect(node.type).toBe('icon');
      expect(node.icon).toBe('aws:lambda');
      expect(node.label).toBe('Lambda');
      expect(node.sublabel).toBe('v1.0');
      expect(node.position).toEqual([100, 200]);
      expect(node.size).toEqual([60, 60]);
      expect(node.borderColor).toBe('#ff0000');
      expect(node.layout).toBe('vertical');
      expect(node.labelPosition).toBe('top-center');
      expect(node.groupIcon).toBe('aws:vpc');
    });

    test('should parse group node with children', () => {
      const diagram = parseDiagram({
        title: 'Test',
        nodes: [
          {
            id: 'group1',
            type: 'group',
            label: 'VPC',
            position: [100, 100],
            children: [
              { id: 'child1', icon: 'aws:lambda', parent_id: 'group1' },
              { id: 'child2', icon: 'aws:dynamodb', parent_id: 'group1' },
            ],
          },
        ],
      });

      expect(diagram.nodes[0].children).toHaveLength(2);
      expect(diagram.nodes[0].children?.[0].id).toBe('child1');
      expect(diagram.nodes[0].children?.[0].parentId).toBe('group1');
    });

    test('should throw error when child node missing parentId', () => {
      expect(() =>
        parseDiagram({
          title: 'Test',
          nodes: [
            {
              id: 'group1',
              type: 'group',
              children: [{ id: 'child1', icon: 'aws:lambda' }],
            },
          ],
        })
      ).toThrow('Child node "child1" must have parent_id field set to "group1"');
    });

    test('should throw error when child node has wrong parentId', () => {
      expect(() =>
        parseDiagram({
          title: 'Test',
          nodes: [
            {
              id: 'group1',
              type: 'group',
              children: [{ id: 'child1', icon: 'aws:lambda', parent_id: 'wrong' }],
            },
          ],
        })
      ).toThrow('Child node "child1" has incorrect parent_id: expected "group1", got "wrong"');
    });

    test('should throw error when top-level node has parentId', () => {
      expect(() =>
        parseDiagram({
          title: 'Test',
          nodes: [{ id: 'node1', icon: 'aws:lambda', parent_id: 'some_parent' }],
        })
      ).toThrow('Top-level node "node1" should not have parent_id field');
    });

    test('should parse composite node with icons', () => {
      const diagram = parseDiagram({
        title: 'Test',
        nodes: [
          {
            id: 'composite1',
            type: 'composite',
            icons: [
              { id: 'icon1', icon: 'aws:lambda', label: 'Lambda' },
              { id: 'icon2', icon: 'aws:sqs' },
            ],
          },
        ],
      });

      expect(diagram.nodes[0].icons).toHaveLength(2);
      expect(diagram.nodes[0].icons?.[0].id).toBe('icon1');
      expect(diagram.nodes[0].icons?.[0].icon).toBe('aws:lambda');
      expect(diagram.nodes[0].icons?.[0].label).toBe('Lambda');
      expect(diagram.nodes[0].icons?.[1].label).toBe('');
    });
  });

  describe('connection parsing', () => {
    test('should parse connection with defaults', () => {
      const diagram = parseDiagram({
        title: 'Test',
        nodes: [
          { id: 'a', icon: 'aws:lambda' },
          { id: 'b', icon: 'aws:dynamodb' },
        ],
        connections: [{ from: 'a', to: 'b' }],
      });

      const conn = diagram.connections?.[0];
      expect(conn?.from).toBe('a');
      expect(conn?.to).toBe('b');
      expect(conn?.type).toBe('data');
      expect(conn?.width).toBe(2);
      expect(conn?.style).toBe('orthogonal');
      expect(conn?.bidirectional).toBe(false);
    });

    test('should parse connection with all properties', () => {
      const diagram = parseDiagram({
        title: 'Test',
        nodes: [],
        connections: [
          {
            from: 'a',
            to: 'b',
            type: 'auth',
            width: 3,
            color: '#ff0000',
            style: 'curved',
            bidirectional: true,
            label: 'Auth Flow',
          },
        ],
      });

      const conn = diagram.connections?.[0];
      expect(conn?.type).toBe('auth');
      expect(conn?.width).toBe(3);
      expect(conn?.color).toBe('#ff0000');
      expect(conn?.style).toBe('curved');
      expect(conn?.bidirectional).toBe(true);
      expect(conn?.label).toBe('Auth Flow');
    });

    test('should parse connection with from_side/to_side (snake_case)', () => {
      const diagram = parseDiagram({
        title: 'Test',
        nodes: [],
        connections: [{ from: 'a', to: 'b', from_side: 'right', to_side: 'left' }],
      });

      expect(diagram.connections?.[0].fromSide).toBe('right');
      expect(diagram.connections?.[0].toSide).toBe('left');
    });

    test('should parse connection with fromSide/toSide (camelCase)', () => {
      const diagram = parseDiagram({
        title: 'Test',
        nodes: [],
        connections: [{ from: 'a', to: 'b', fromSide: 'bottom', toSide: 'top' }],
      } as any);

      expect(diagram.connections?.[0].fromSide).toBe('bottom');
      expect(diagram.connections?.[0].toSide).toBe('top');
    });
  });

  describe('colors parsing', () => {
    test('should include default colors', () => {
      const diagram = parseDiagram({ title: 'Test', nodes: [] });
      expect(diagram.colors?.blue).toBe('#0073BB');
      expect(diagram.colors?.orange).toBe('#FF9900');
    });

    test('should merge custom colors with defaults', () => {
      const diagram = parseDiagram({
        title: 'Test',
        colors: { primary: '#123456' },
        nodes: [],
      });
      expect(diagram.colors?.primary).toBe('#123456');
      expect(diagram.colors?.blue).toBe('#0073BB');
    });
  });
});

describe('validateDiagram', () => {
  test('should return empty array for valid diagram with resources', () => {
    const diagram = parseDiagram({
      title: 'Test',
      resources: {
        '@a': { icon: 'aws:lambda', desc: 'Lambda function' },
        '@b': { icon: 'aws:dynamodb', desc: 'Database' },
      },
      nodes: [
        { id: '@a', label: 'Lambda' },
        { id: '@b', label: 'DynamoDB' },
      ],
      connections: [{ from: '@a', to: '@b' }],
    } as any);

    const errors = validateDiagram(diagram);
    expect(errors).toHaveLength(0);
  });

  test('should detect missing resources', () => {
    const diagram = {
      title: 'Test',
      nodes: [{ id: '@a', icon: 'aws:lambda' }],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors.some(e => e.includes('No resources defined'))).toBe(true);
  });

  test('should detect empty resources', () => {
    const diagram = {
      title: 'Test',
      resources: {},
      nodes: [{ id: '@a', icon: 'aws:lambda' }],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors.some(e => e.includes('No resources defined'))).toBe(true);
  });

  test('should detect resource ID without @ prefix', () => {
    const diagram = {
      title: 'Test',
      resources: {
        'lambda': { icon: 'aws:lambda' },
      },
      nodes: [{ id: '@lambda', label: 'Lambda' }],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors.some(e => e.includes('Resource ID "lambda" must start with @'))).toBe(true);
  });

  test('should detect node ID without @ prefix', () => {
    const diagram = {
      title: 'Test',
      resources: {
        '@lambda': { icon: 'aws:lambda' },
      },
      nodes: [{ id: 'lambda', label: 'Lambda' }],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors.some(e => e.includes('Node ID "lambda" must start with @'))).toBe(true);
  });

  test('should detect node without matching resource', () => {
    const diagram = {
      title: 'Test',
      resources: {
        '@lambda': { icon: 'aws:lambda' },
      },
      nodes: [
        { id: '@lambda', label: 'Lambda' },
        { id: '@dynamodb', label: 'DynamoDB' },
      ],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors.some(e => e.includes('Node "@dynamodb" has no matching resource'))).toBe(true);
  });

  test('should require all nodes including groups to have @ prefix and resource', () => {
    const diagram = {
      title: 'Test',
      resources: {
        '@vpc': { desc: 'Virtual Private Cloud' },
        '@ec2': { icon: 'aws:ec2' },
      },
      nodes: [
        {
          id: '@vpc',
          type: 'group',
          label: 'VPC',
          children: [{ id: '@ec2', label: 'EC2', parentId: '@vpc' }],
        },
      ],
    };

    const errors = validateDiagram(diagram as any);
    // All nodes including groups must have @ prefix and matching resource
    expect(errors).toHaveLength(0);
  });

  test('should detect duplicate node IDs', () => {
    const diagram = {
      title: 'Test',
      resources: {
        '@dup': { icon: 'aws:lambda' },
      },
      nodes: [
        { id: '@dup', label: 'Lambda' },
        { id: '@dup', label: 'S3' },
      ],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors.some(e => e.includes('Duplicate node ID "@dup"'))).toBe(true);
  });

  test('should detect duplicate IDs in nested nodes', () => {
    const diagram = {
      title: 'Test',
      resources: {
        '@dup': { icon: 'aws:lambda' },
        '@group': { desc: 'Container' },
      },
      nodes: [
        { id: '@dup', label: 'Lambda' },
        {
          id: '@group',
          type: 'group',
          children: [{ id: '@dup', label: 'S3', parentId: '@group' }],
        },
      ],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors.some(e => e.includes('Duplicate node ID "@dup"'))).toBe(true);
  });

  test('should detect invalid connection source', () => {
    const diagram = {
      title: 'Test',
      resources: {
        '@a': { icon: 'aws:lambda' },
      },
      nodes: [{ id: '@a', label: 'Lambda' }],
      connections: [{ from: '@unknown', to: '@a' }],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors.some(e => e.includes('references unknown node "@unknown"'))).toBe(true);
  });

  test('should detect invalid connection target', () => {
    const diagram = {
      title: 'Test',
      resources: {
        '@a': { icon: 'aws:lambda' },
      },
      nodes: [{ id: '@a', label: 'Lambda' }],
      connections: [{ from: '@a', to: '@unknown' }],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors.some(e => e.includes('references unknown node "@unknown"'))).toBe(true);
  });

  test('should detect composite icon without @ prefix', () => {
    const diagram = {
      title: 'Test',
      resources: {
        '@frontend': { icon: 'aws:amplify' },
        '@astro': { icon: 'tech-stack:astro' },
      },
      nodes: [
        {
          id: '@frontend',
          type: 'composite',
          label: 'Frontend',
          icons: [
            { id: '@astro', label: 'Astro' },
            { id: 'react', label: 'React' }, // Missing @ prefix
          ],
        },
      ],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors.some(e => e.includes('Composite icon ID "react" must start with @'))).toBe(true);
  });

  test('should detect composite icon without matching resource', () => {
    const diagram = {
      title: 'Test',
      resources: {
        '@frontend': { icon: 'aws:amplify' },
        '@astro': { icon: 'tech-stack:astro' },
      },
      nodes: [
        {
          id: '@frontend',
          type: 'composite',
          label: 'Frontend',
          icons: [
            { id: '@astro', label: 'Astro' },
            { id: '@react', label: 'React' }, // No matching resource
          ],
        },
      ],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors.some(e => e.includes('Composite icon "@react" has no matching resource'))).toBe(true);
  });

  test('should validate composite node with all icons having resources', () => {
    const diagram = {
      title: 'Test',
      resources: {
        '@frontend': { icon: 'aws:amplify' },
        '@astro': { icon: 'tech-stack:astro' },
        '@react': { icon: 'tech-stack:react' },
      },
      nodes: [
        {
          id: '@frontend',
          type: 'composite',
          label: 'Frontend',
          icons: [
            { id: '@astro', label: 'Astro' },
            { id: '@react', label: 'React' },
          ],
        },
      ],
    };

    const errors = validateDiagram(diagram as any);
    expect(errors).toHaveLength(0);
  });
});
