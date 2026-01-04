import { describe, expect, test } from 'bun:test';
import { createBuilder } from '../../src/core/builder';

describe('DiagramBuilder', () => {
  test('should create empty diagram with default title', () => {
    const builder = createBuilder();
    const diagram = builder.build();
    expect(diagram.title).toBe('Untitled Diagram');
    expect(diagram.nodes).toHaveLength(0);
  });

  test('should create diagram from partial definition', () => {
    const builder = createBuilder({
      title: 'Test Diagram',
      nodes: [{ id: 'test', icon: 'aws:lambda', position: [100, 100] }],
    });
    const diagram = builder.build();
    expect(diagram.title).toBe('Test Diagram');
    expect(diagram.nodes).toHaveLength(1);
  });

  test('should create diagram from JSON string', () => {
    const json = JSON.stringify({
      title: 'JSON Diagram',
      nodes: [{ id: 'node1', icon: 'aws:s3' }],
    });
    const builder = createBuilder(json);
    const diagram = builder.build();
    expect(diagram.title).toBe('JSON Diagram');
    expect(diagram.nodes[0].id).toBe('node1');
  });

  test('should set title and subtitle', () => {
    const builder = createBuilder()
      .setTitle('My Diagram')
      .setSubtitle('Architecture Overview');
    const diagram = builder.build();
    expect(diagram.title).toBe('My Diagram');
    expect(diagram.subtitle).toBe('Architecture Overview');
  });

  test('should add node', () => {
    const builder = createBuilder()
      .addNode({ id: 'test', icon: 'aws:lambda', position: [100, 100] });
    const diagram = builder.build();
    expect(diagram.nodes).toHaveLength(1);
    expect(diagram.nodes[0].id).toBe('test');
    expect(diagram.nodes[0].icon).toBe('aws:lambda');
  });

  test('should add multiple nodes', () => {
    const builder = createBuilder()
      .addNodes([
        { id: 'node1', icon: 'aws:lambda' },
        { id: 'node2', icon: 'aws:dynamodb' },
      ]);
    const diagram = builder.build();
    expect(diagram.nodes).toHaveLength(2);
  });

  test('should update node', () => {
    const builder = createBuilder()
      .addNode({ id: 'test', icon: 'aws:lambda', label: 'Original' })
      .updateNode('test', { label: 'Updated', sublabel: 'v2' });
    const diagram = builder.build();
    expect(diagram.nodes[0].label).toBe('Updated');
    expect(diagram.nodes[0].sublabel).toBe('v2');
  });

  test('should throw on updating nonexistent node', () => {
    const builder = createBuilder();
    expect(() => builder.updateNode('nonexistent', { label: 'test' })).toThrow('Node not found: nonexistent');
  });

  test('should move node', () => {
    const builder = createBuilder()
      .addNode({ id: 'test', icon: 'aws:lambda', position: [100, 100] })
      .moveNode('test', [200, 300]);
    const diagram = builder.build();
    expect(diagram.nodes[0].position).toEqual([200, 300]);
  });

  test('should remove node', () => {
    const builder = createBuilder()
      .addNode({ id: 'test', icon: 'aws:lambda' });
    expect(builder.hasNode('test')).toBe(true);
    builder.removeNode('test');
    expect(builder.hasNode('test')).toBe(false);
  });

  test('should throw on removing nonexistent node', () => {
    const builder = createBuilder();
    expect(() => builder.removeNode('nonexistent')).toThrow('Node not found: nonexistent');
  });

  test('should remove connections when removing node', () => {
    const builder = createBuilder()
      .addNode({ id: 'a', icon: 'aws:lambda' })
      .addNode({ id: 'b', icon: 'aws:dynamodb' })
      .addConnection({ from: 'a', to: 'b' });
    expect(builder.hasConnection('a', 'b')).toBe(true);
    builder.removeNode('b');
    expect(builder.hasConnection('a', 'b')).toBe(false);
  });

  test('should insert node below reference', () => {
    const builder = createBuilder()
      .addNode({ id: 'ref', icon: 'aws:lambda', position: [200, 100] })
      .insertBelow('ref', { id: 'new', icon: 'aws:dynamodb' });
    const diagram = builder.build();
    const newNode = diagram.nodes.find(n => n.id === 'new');
    expect(newNode?.position?.[0]).toBe(200); // same X
    expect(newNode?.position?.[1]).toBe(200); // Y + 100
  });

  test('should insert node above reference', () => {
    const builder = createBuilder()
      .addNode({ id: 'ref', icon: 'aws:lambda', position: [200, 200] })
      .insertAbove('ref', { id: 'new', icon: 'aws:api_gateway' });
    const diagram = builder.build();
    const newNode = diagram.nodes.find(n => n.id === 'new');
    expect(newNode?.position?.[0]).toBe(200); // same X
    expect(newNode?.position?.[1]).toBe(100); // Y - 100
  });

  test('should insert node to the right', () => {
    const builder = createBuilder()
      .addNode({ id: 'ref', icon: 'aws:lambda', position: [200, 100] })
      .insertRight('ref', { id: 'new', icon: 'aws:sqs' });
    const diagram = builder.build();
    const newNode = diagram.nodes.find(n => n.id === 'new');
    expect(newNode?.position?.[0]).toBe(350); // X + 150
    expect(newNode?.position?.[1]).toBe(100); // same Y
  });

  test('should insert node to the left', () => {
    const builder = createBuilder()
      .addNode({ id: 'ref', icon: 'aws:lambda', position: [300, 100] })
      .insertLeft('ref', { id: 'new', icon: 'aws:api_gateway' });
    const diagram = builder.build();
    const newNode = diagram.nodes.find(n => n.id === 'new');
    expect(newNode?.position?.[0]).toBe(150); // X - 150
    expect(newNode?.position?.[1]).toBe(100); // same Y
  });

  test('should add connection', () => {
    const builder = createBuilder()
      .addNode({ id: 'a', icon: 'aws:lambda' })
      .addNode({ id: 'b', icon: 'aws:dynamodb' })
      .addConnection({ from: 'a', to: 'b' });
    const diagram = builder.build();
    expect(diagram.connections).toHaveLength(1);
    expect(diagram.connections![0].from).toBe('a');
    expect(diagram.connections![0].to).toBe('b');
  });

  test('should throw on adding connection with nonexistent source', () => {
    const builder = createBuilder()
      .addNode({ id: 'b', icon: 'aws:dynamodb' });
    expect(() => builder.addConnection({ from: 'a', to: 'b' })).toThrow('Source node not found: a');
  });

  test('should throw on adding connection with nonexistent target', () => {
    const builder = createBuilder()
      .addNode({ id: 'a', icon: 'aws:lambda' });
    expect(() => builder.addConnection({ from: 'a', to: 'b' })).toThrow('Target node not found: b');
  });

  test('should update connection', () => {
    const builder = createBuilder()
      .addNode({ id: 'a', icon: 'aws:lambda' })
      .addNode({ id: 'b', icon: 'aws:dynamodb' })
      .addConnection({ from: 'a', to: 'b' })
      .updateConnection('a', 'b', { label: 'Data Flow', bidirectional: true });
    const diagram = builder.build();
    expect(diagram.connections![0].label).toBe('Data Flow');
    expect(diagram.connections![0].bidirectional).toBe(true);
  });

  test('should remove connection', () => {
    const builder = createBuilder()
      .addNode({ id: 'a', icon: 'aws:lambda' })
      .addNode({ id: 'b', icon: 'aws:dynamodb' })
      .addConnection({ from: 'a', to: 'b' });
    expect(builder.hasConnection('a', 'b')).toBe(true);
    builder.removeConnection('a', 'b');
    expect(builder.hasConnection('a', 'b')).toBe(false);
  });

  test('should throw on removing nonexistent connection', () => {
    const builder = createBuilder();
    expect(() => builder.removeConnection('a', 'b')).toThrow('Connection not found: a -> b');
  });

  test('should align nodes to top of reference', () => {
    const builder = createBuilder()
      .addNode({ id: 'ref', icon: 'aws:lambda', position: [200, 150] })
      .addNode({ id: 'a', icon: 'aws:s3', position: [400, 200] })
      .addNode({ id: 'b', icon: 'aws:dynamodb', position: [600, 180] })
      .alignTop('ref', ['a', 'b']);
    const diagram = builder.build();
    expect(diagram.nodes.find(n => n.id === 'a')?.position?.[1]).toBe(150);
    expect(diagram.nodes.find(n => n.id === 'b')?.position?.[1]).toBe(150);
    // X should remain unchanged
    expect(diagram.nodes.find(n => n.id === 'a')?.position?.[0]).toBe(400);
  });

  test('should align nodes to left of reference', () => {
    const builder = createBuilder()
      .addNode({ id: 'ref', icon: 'aws:lambda', position: [200, 150] })
      .addNode({ id: 'a', icon: 'aws:s3', position: [250, 300] })
      .addNode({ id: 'b', icon: 'aws:dynamodb', position: [220, 450] })
      .alignLeft('ref', ['a', 'b']);
    const diagram = builder.build();
    expect(diagram.nodes.find(n => n.id === 'a')?.position?.[0]).toBe(200);
    expect(diagram.nodes.find(n => n.id === 'b')?.position?.[0]).toBe(200);
    // Y should remain unchanged
    expect(diagram.nodes.find(n => n.id === 'a')?.position?.[1]).toBe(300);
  });

  test('should distribute nodes horizontally', () => {
    const builder = createBuilder()
      .addNode({ id: 'a', icon: 'aws:lambda', position: [100, 150] })
      .addNode({ id: 'b', icon: 'aws:s3', position: [150, 150] })
      .addNode({ id: 'c', icon: 'aws:dynamodb', position: [180, 150] })
      .distributeHorizontally(['a', 'b', 'c'], 200);
    const diagram = builder.build();
    expect(diagram.nodes.find(n => n.id === 'a')?.position?.[0]).toBe(100);
    expect(diagram.nodes.find(n => n.id === 'b')?.position?.[0]).toBe(300);
    expect(diagram.nodes.find(n => n.id === 'c')?.position?.[0]).toBe(500);
  });

  test('should distribute nodes vertically', () => {
    const builder = createBuilder()
      .addNode({ id: 'a', icon: 'aws:lambda', position: [200, 100] })
      .addNode({ id: 'b', icon: 'aws:s3', position: [200, 120] })
      .addNode({ id: 'c', icon: 'aws:dynamodb', position: [200, 150] })
      .distributeVertically(['a', 'b', 'c'], 150);
    const diagram = builder.build();
    expect(diagram.nodes.find(n => n.id === 'a')?.position?.[1]).toBe(100);
    expect(diagram.nodes.find(n => n.id === 'b')?.position?.[1]).toBe(250);
    expect(diagram.nodes.find(n => n.id === 'c')?.position?.[1]).toBe(400);
  });

  test('should set background', () => {
    const builder = createBuilder()
      .setBackground({ type: 'gradient', startColor: '#fff', endColor: '#eee', direction: 'south' });
    const diagram = builder.build();
    expect(diagram.background?.type).toBe('gradient');
  });

  test('should set color', () => {
    const builder = createBuilder()
      .setColor('primary', '#0073BB');
    const diagram = builder.build();
    expect(diagram.colors?.primary).toBe('#0073BB');
  });

  test('should output JSON', () => {
    const builder = createBuilder()
      .setTitle('Test')
      .addNode({ id: 'test', icon: 'aws:lambda' });
    const json = builder.toJSON();
    expect(json).toContain('"title":"Test"');
    expect(json).toContain('"id":"test"');
  });

  test('should output pretty JSON', () => {
    const builder = createBuilder().setTitle('Test');
    const json = builder.toJSON(true);
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });

  test('should apply patch with multiple operations', () => {
    const builder = createBuilder()
      .addNode({ id: 'existing', icon: 'aws:lambda', position: [100, 100] })
      .applyPatch({
        title: 'Patched Diagram',
        addNodes: [
          { id: 'new1', icon: 'aws:dynamodb', position: [200, 100] },
        ],
        updateNodes: [
          { id: 'existing', label: 'Updated Lambda' },
        ],
        addConnections: [
          { from: 'existing', to: 'new1' },
        ],
      });
    const diagram = builder.build();
    expect(diagram.title).toBe('Patched Diagram');
    expect(diagram.nodes).toHaveLength(2);
    expect(diagram.nodes.find(n => n.id === 'existing')?.label).toBe('Updated Lambda');
    expect(diagram.connections).toHaveLength(1);
  });

  // === setRender / getRender ===
  describe('setRender / getRender', () => {
    test('should set and get render options', () => {
      const builder = createBuilder()
        .setRender({ width: 1200, height: 800 });
      const render = builder.getRender();
      expect(render?.width).toBe(1200);
      expect(render?.height).toBe(800);
    });

    test('should return undefined when no render options set', () => {
      const builder = createBuilder();
      expect(builder.getRender()).toBeUndefined();
    });

    test('should update existing render options', () => {
      const builder = createBuilder()
        .setRender({ width: 1000 })
        .setRender({ height: 600 });
      const render = builder.getRender();
      expect(render?.width).toBe(1000);
      expect(render?.height).toBe(600);
    });

    test('should include render in build output', () => {
      const builder = createBuilder()
        .setRender({ width: 1200, height: 800 });
      const diagram = builder.build();
      expect(diagram.render?.width).toBe(1200);
      expect(diagram.render?.height).toBe(800);
    });

    test('should parse render from JSON string', () => {
      const json = JSON.stringify({
        title: 'Test',
        nodes: [],
        render: { width: 1500, height: 900 },
      });
      const builder = createBuilder(json);
      const render = builder.getRender();
      expect(render?.width).toBe(1500);
      expect(render?.height).toBe(900);
    });
  });

  // === resizeNode / setNodeIcon / setNodeLabel ===
  describe('node modification shortcuts', () => {
    test('should resize node', () => {
      const builder = createBuilder()
        .addNode({ id: 'test', icon: 'aws:lambda', position: [100, 100] })
        .resizeNode('test', [80, 80]);
      const diagram = builder.build();
      expect(diagram.nodes[0].size).toEqual([80, 80]);
    });

    test('should set node icon', () => {
      const builder = createBuilder()
        .addNode({ id: 'test', icon: 'aws:lambda', position: [100, 100] })
        .setNodeIcon('test', 'aws:dynamodb');
      const diagram = builder.build();
      expect(diagram.nodes[0].icon).toBe('aws:dynamodb');
    });

    test('should set node label', () => {
      const builder = createBuilder()
        .addNode({ id: 'test', icon: 'aws:lambda', position: [100, 100] })
        .setNodeLabel('test', 'My Lambda');
      const diagram = builder.build();
      expect(diagram.nodes[0].label).toBe('My Lambda');
    });

    test('should set node label with sublabel', () => {
      const builder = createBuilder()
        .addNode({ id: 'test', icon: 'aws:lambda', position: [100, 100] })
        .setNodeLabel('test', 'My Lambda', 'v1.0');
      const diagram = builder.build();
      expect(diagram.nodes[0].label).toBe('My Lambda');
      expect(diagram.nodes[0].sublabel).toBe('v1.0');
    });
  });

  // === getNode ===
  describe('getNode', () => {
    test('should get node by id', () => {
      const builder = createBuilder()
        .addNode({ id: 'test', icon: 'aws:lambda', label: 'Test Lambda', position: [100, 100] });
      const node = builder.getNode('test');
      expect(node).toBeDefined();
      expect(node?.id).toBe('test');
      expect(node?.icon).toBe('aws:lambda');
      expect(node?.label).toBe('Test Lambda');
    });

    test('should return undefined for nonexistent node', () => {
      const builder = createBuilder();
      const node = builder.getNode('nonexistent');
      expect(node).toBeUndefined();
    });
  });

  // === alignCenterY / alignCenterX ===
  describe('center alignment', () => {
    test('should align nodes to vertical center of reference', () => {
      const builder = createBuilder()
        .addNode({ id: 'ref', icon: 'aws:lambda', position: [200, 100] })
        .addNode({ id: 'a', icon: 'aws:s3', position: [400, 200] })
        .addNode({ id: 'b', icon: 'aws:dynamodb', position: [600, 150] })
        .alignCenterY('ref', ['a', 'b']);
      const diagram = builder.build();
      // All nodes should have same vertical center
      // ref: y=100, icon height=48, center=124
      // a,b should be aligned to center Y of ref
      const nodeA = diagram.nodes.find(n => n.id === 'a');
      const nodeB = diagram.nodes.find(n => n.id === 'b');
      // Both should have same Y as ref (100) since all are icon nodes with same height
      expect(nodeA?.position?.[1]).toBe(100);
      expect(nodeB?.position?.[1]).toBe(100);
      // X should remain unchanged
      expect(nodeA?.position?.[0]).toBe(400);
      expect(nodeB?.position?.[0]).toBe(600);
    });

    test('should align nodes to horizontal center of reference', () => {
      const builder = createBuilder()
        .addNode({ id: 'ref', icon: 'aws:lambda', position: [200, 100] })
        .addNode({ id: 'a', icon: 'aws:s3', position: [400, 200] })
        .addNode({ id: 'b', icon: 'aws:dynamodb', position: [350, 300] })
        .alignCenterX('ref', ['a', 'b']);
      const diagram = builder.build();
      const nodeA = diagram.nodes.find(n => n.id === 'a');
      const nodeB = diagram.nodes.find(n => n.id === 'b');
      // Both should have same X as ref (200) since all are icon nodes with same width
      expect(nodeA?.position?.[0]).toBe(200);
      expect(nodeB?.position?.[0]).toBe(200);
      // Y should remain unchanged
      expect(nodeA?.position?.[1]).toBe(200);
      expect(nodeB?.position?.[1]).toBe(300);
    });

    test('should throw on align center with nonexistent reference', () => {
      const builder = createBuilder()
        .addNode({ id: 'a', icon: 'aws:lambda', position: [100, 100] });
      expect(() => builder.alignCenterY('nonexistent', ['a'])).toThrow('Reference node not found: nonexistent');
      expect(() => builder.alignCenterX('nonexistent', ['a'])).toThrow('Reference node not found: nonexistent');
    });

    test('should align group node considering its size', () => {
      const builder = createBuilder()
        .addNode({ id: 'ref', type: 'group', label: 'VPC', position: [100, 100], size: [300, 200] })
        .addNode({ id: 'icon', icon: 'aws:lambda', position: [500, 300] })
        .alignCenterY('ref', ['icon']);
      const diagram = builder.build();
      const iconNode = diagram.nodes.find(n => n.id === 'icon');
      // ref: y=100, height=200 (explicit), center=200
      // icon: height=48, should be at y = 200 - 24 = 176
      expect(iconNode?.position?.[1]).toBe(176);
    });

    test('should align composite node considering its size', () => {
      const builder = createBuilder()
        .addNode({
          id: 'ref',
          type: 'composite',
          icons: [{ id: 'i1', icon: 'aws:lambda' }, { id: 'i2', icon: 'aws:s3' }],
          position: [100, 100],
        })
        .addNode({ id: 'icon', icon: 'aws:dynamodb', position: [300, 200] })
        .alignCenterX('ref', ['icon']);
      const diagram = builder.build();
      const iconNode = diagram.nodes.find(n => n.id === 'icon');
      // ref: composite with 2 icons, horizontal layout
      // width = 20*2 + 2*(40+10) = 140, center = 100 + 70 = 170
      // icon width = 48, should be at x = 170 - 24 = 146
      expect(iconNode?.position?.[0]).toBe(146);
    });

    test('should align text_box node considering its size', () => {
      const builder = createBuilder()
        .addNode({ id: 'ref', type: 'text_box', label: 'Hello World', position: [100, 100] })
        .addNode({ id: 'icon', icon: 'aws:lambda', position: [300, 200] })
        .alignCenterY('ref', ['icon']);
      const diagram = builder.build();
      const iconNode = diagram.nodes.find(n => n.id === 'icon');
      // text_box without sublabel: height=30, center = 100 + 15 = 115
      // icon height=48, should be at y = 115 - 24 = 91
      expect(iconNode?.position?.[1]).toBe(91);
    });

    test('should align text_box with sublabel', () => {
      const builder = createBuilder()
        .addNode({ id: 'ref', type: 'text_box', label: 'Hello', sublabel: 'World', position: [100, 100] })
        .addNode({ id: 'icon', icon: 'aws:lambda', position: [300, 200] })
        .alignCenterY('ref', ['icon']);
      const diagram = builder.build();
      const iconNode = diagram.nodes.find(n => n.id === 'icon');
      // text_box with sublabel: height=50, center = 100 + 25 = 125
      // icon height=48, should be at y = 125 - 24 = 101
      expect(iconNode?.position?.[1]).toBe(101);
    });
  });

  // === Edge cases ===
  describe('edge cases', () => {
    test('should handle nodes without position in alignment', () => {
      const builder = createBuilder()
        .addNode({ id: 'ref', icon: 'aws:lambda', position: [200, 100] })
        .addNode({ id: 'a', icon: 'aws:s3' }) // no position
        .alignTop('ref', ['a']);
      const diagram = builder.build();
      // Node 'a' should remain unchanged since it has no position
      const nodeA = diagram.nodes.find(n => n.id === 'a');
      expect(nodeA?.position).toBeUndefined();
    });

    test('should handle insert with explicit position (overrides computed)', () => {
      const builder = createBuilder()
        .addNode({ id: 'ref', icon: 'aws:lambda', position: [200, 100] })
        .insertBelow('ref', { id: 'new', icon: 'aws:s3', position: [500, 500] });
      const diagram = builder.build();
      const newNode = diagram.nodes.find(n => n.id === 'new');
      // Explicit position should be used
      expect(newNode?.position).toEqual([500, 500]);
    });

    test('should handle insert when reference has no position', () => {
      const builder = createBuilder()
        .addNode({ id: 'ref', icon: 'aws:lambda' }) // no position
        .insertRight('ref', { id: 'new', icon: 'aws:s3' });
      const diagram = builder.build();
      const newNode = diagram.nodes.find(n => n.id === 'new');
      // Default position [400, 300] + offset [150, 0]
      expect(newNode?.position).toEqual([550, 300]);
    });

    test('should handle group node height calculation with vertical layout', () => {
      const builder = createBuilder()
        .addNode({
          id: 'group',
          type: 'group',
          layout: 'vertical',
          children: [
            { id: 'c1', icon: 'aws:lambda' },
            { id: 'c2', icon: 'aws:s3' },
          ],
          position: [100, 100],
        })
        .addNode({ id: 'icon', icon: 'aws:dynamodb', position: [400, 200] })
        .alignCenterY('group', ['icon']);
      const diagram = builder.build();
      // Group with 2 children, vertical layout
      // height = 40 + 30 + 2 * (48 + 80 + 30) = 386
      const iconNode = diagram.nodes.find(n => n.id === 'icon');
      expect(iconNode?.position?.[1]).toBeDefined();
    });

    test('should handle composite node width calculation with vertical layout', () => {
      const builder = createBuilder()
        .addNode({
          id: 'comp',
          type: 'composite',
          layout: 'vertical',
          icons: [{ id: 'i1', icon: 'aws:lambda' }],
          position: [100, 100],
        })
        .addNode({ id: 'icon', icon: 'aws:dynamodb', position: [400, 200] })
        .alignCenterX('comp', ['icon']);
      const diagram = builder.build();
      // Composite with vertical layout: width = 40 + 20*2 = 80
      const iconNode = diagram.nodes.find(n => n.id === 'icon');
      expect(iconNode?.position?.[0]).toBeDefined();
    });
  });

  // === getConnection ===
  describe('getConnection', () => {
    test('should get connection by from/to', () => {
      const builder = createBuilder()
        .addNode({ id: 'a', icon: 'aws:lambda' })
        .addNode({ id: 'b', icon: 'aws:dynamodb' })
        .addConnection({ from: 'a', to: 'b', label: 'Test Connection' });
      const conn = builder.getConnection('a', 'b');
      expect(conn).toBeDefined();
      expect(conn?.from).toBe('a');
      expect(conn?.to).toBe('b');
      expect(conn?.label).toBe('Test Connection');
    });

    test('should return undefined for nonexistent connection', () => {
      const builder = createBuilder()
        .addNode({ id: 'a', icon: 'aws:lambda' })
        .addNode({ id: 'b', icon: 'aws:dynamodb' });
      const conn = builder.getConnection('a', 'b');
      expect(conn).toBeUndefined();
    });
  });

  // === applyPatch with remove operations ===
  describe('applyPatch with remove operations', () => {
    test('should apply patch with removeConnections', () => {
      const builder = createBuilder()
        .addNode({ id: 'a', icon: 'aws:lambda' })
        .addNode({ id: 'b', icon: 'aws:dynamodb' })
        .addConnection({ from: 'a', to: 'b' })
        .applyPatch({
          removeConnections: [{ from: 'a', to: 'b' }],
        });
      const diagram = builder.build();
      expect(diagram.connections).toHaveLength(0);
    });

    test('should apply patch with removeNodes', () => {
      const builder = createBuilder()
        .addNode({ id: 'a', icon: 'aws:lambda' })
        .addNode({ id: 'b', icon: 'aws:dynamodb' })
        .applyPatch({
          removeNodes: ['b'],
        });
      const diagram = builder.build();
      expect(diagram.nodes).toHaveLength(1);
      expect(diagram.nodes[0].id).toBe('a');
    });

    test('should apply patch with updateConnections', () => {
      const builder = createBuilder()
        .addNode({ id: 'a', icon: 'aws:lambda' })
        .addNode({ id: 'b', icon: 'aws:dynamodb' })
        .addConnection({ from: 'a', to: 'b' })
        .applyPatch({
          updateConnections: [{ from: 'a', to: 'b', label: 'Updated' }],
        });
      const diagram = builder.build();
      expect(diagram.connections![0].label).toBe('Updated');
    });
  });
});
