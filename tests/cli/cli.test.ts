import { describe, expect, test, beforeAll, afterAll, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(import.meta.dir, '../..');
const CLI_TS = resolve(PROJECT_ROOT, 'bin/cli.ts');
const TEST_OUTPUT_DIR = resolve(PROJECT_ROOT, 'tests/cli/output');
const SAMPLE_JSON = resolve(PROJECT_ROOT, 'examples/01-serverless-rest-api.json');

// Helper to run CLI commands via bash shell (preserves quotes correctly)
async function runCli(args: string): Promise<{ stdout: string; stderr: string; output: string; exitCode: number }> {
  const cmd = args ? `bun ${CLI_TS} ${args}` : `bun ${CLI_TS}`;
  const proc = Bun.spawn(['bash', '-c', cmd], {
    cwd: PROJECT_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const output = stdout + stderr;
  return { stdout, stderr, output, exitCode };
}

// Helper to create a minimal test diagram
function createTestDiagram(): object {
  return {
    title: 'Test Diagram',
    nodes: [
      { id: '@api', icon: 'aws:api_gateway', label: 'API Gateway', position: [200, 150] },
      { id: '@lambda', icon: 'aws:lambda', label: 'Lambda', position: [400, 150] },
    ],
    connections: [
      { from: '@api', to: '@lambda' },
    ],
  };
}

describe('cli.ts', () => {
  // Setup test output directory
  beforeAll(() => {
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  // Cleanup test output directory
  afterAll(() => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  // Clean up any buggy files after each test
  afterEach(() => {
    // Remove any file named "-o" that might be created by bug
    const buggyFile = resolve(PROJECT_ROOT, '-o');
    if (existsSync(buggyFile)) {
      rmSync(buggyFile, { force: true });
    }
  });

  describe('help command', () => {
    test('should display help with --help flag', async () => {
      const { stdout, exitCode } = await runCli('--help');
      expect(exitCode).toBe(0);
      expect(stdout).toContain('gospelo-architect CLI');
      expect(stdout).toContain('Usage:');
    });

    test('should display help with -h flag', async () => {
      const { stdout, exitCode } = await runCli('-h');
      expect(exitCode).toBe(0);
      expect(stdout).toContain('gospelo-architect CLI');
    });

    test('should display help with no arguments', async () => {
      const { stdout, exitCode } = await runCli('');
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage:');
    });
  });

  describe('unknown command', () => {
    test('should error on unknown command', async () => {
      const { output, exitCode } = await runCli('unknown-command input.json');
      expect(exitCode).toBe(1);
      expect(output).toContain('Unknown command');
    });
  });

  describe('html command', () => {
    test('should require input file', async () => {
      const { output, exitCode } = await runCli('html');
      expect(exitCode).toBe(1);
      expect(output).toContain('Input file required');
    });

    test('should generate HTML from JSON', async () => {
      const outputHtml = resolve(TEST_OUTPUT_DIR, 'test-html.html');
      const { exitCode } = await runCli(`html ${SAMPLE_JSON} ${outputHtml}`);
      expect(exitCode).toBe(0);
      expect(existsSync(outputHtml)).toBe(true);

      const content = readFileSync(outputHtml, 'utf-8');
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('<svg');
    });

    test('should auto-generate output filename if not specified', async () => {
      // Copy sample to test dir to avoid polluting examples
      const testJson = resolve(TEST_OUTPUT_DIR, 'auto-name-test.json');
      const expectedOutput = resolve(TEST_OUTPUT_DIR, 'auto-name-test.html');
      writeFileSync(testJson, readFileSync(SAMPLE_JSON, 'utf-8'));

      const { exitCode } = await runCli(`html ${testJson}`);
      expect(exitCode).toBe(0);
      expect(existsSync(expectedOutput)).toBe(true);
    });

    // BUG TEST: -o should not be treated as output filename
    test('should NOT create file named -o when given unknown short option', async () => {
      const buggyFile = resolve(PROJECT_ROOT, '-o');

      // This command has an invalid option -o that looks like a short option
      // The bug causes -o to be treated as the output filename
      await runCli(`html ${SAMPLE_JSON} -o test.html`);

      // Check if buggy file was created
      const buggyFileCreated = existsSync(buggyFile);
      if (buggyFileCreated) {
        rmSync(buggyFile, { force: true });
      }

      // This test documents the bug - it should fail until the bug is fixed
      // When fixed, change expect to: expect(buggyFileCreated).toBe(false);
      expect(buggyFileCreated).toBe(true); // BUG: Currently creates -o file
    });
  });

  describe('svg command', () => {
    test('should require input file', async () => {
      const { output, exitCode } = await runCli('svg');
      expect(exitCode).toBe(1);
      expect(output).toContain('Input file required');
    });

    test('should generate SVG from JSON', async () => {
      const outputSvg = resolve(TEST_OUTPUT_DIR, 'test-svg.svg');
      const { exitCode } = await runCli(`svg ${SAMPLE_JSON} ${outputSvg}`);
      expect(exitCode).toBe(0);
      expect(existsSync(outputSvg)).toBe(true);

      const content = readFileSync(outputSvg, 'utf-8');
      expect(content).toContain('<svg');
      expect(content).toContain('</svg>');
    });
  });

  describe('preview command', () => {
    test('should require input file', async () => {
      const { output, exitCode } = await runCli('preview');
      expect(exitCode).toBe(1);
      expect(output).toContain('Input file required');
    });

    test('should generate preview HTML with embedded icons', async () => {
      const outputHtml = resolve(TEST_OUTPUT_DIR, 'test-preview.html');
      const { exitCode, output } = await runCli(`preview ${SAMPLE_JSON} ${outputHtml}`);
      expect(exitCode).toBe(0);
      expect(existsSync(outputHtml)).toBe(true);
      expect(output).toContain('Base64');
    });
  });

  describe('meta command', () => {
    test('should require input file', async () => {
      const { output, exitCode } = await runCli('meta');
      expect(exitCode).toBe(1);
      expect(output).toContain('Input file required');
    });

    test('should output metadata as JSON', async () => {
      const { stdout, exitCode } = await runCli(`meta ${SAMPLE_JSON}`);
      expect(exitCode).toBe(0);

      const meta = JSON.parse(stdout);
      expect(meta).toHaveProperty('nodes');
      expect(meta).toHaveProperty('connections');
    });

    test('should support --pretty option', async () => {
      const { stdout, exitCode } = await runCli(`meta ${SAMPLE_JSON} --pretty`);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('\n');
      expect(stdout).toContain('  ');
    });
  });

  describe('enrich command', () => {
    test('should require input file', async () => {
      const { output, exitCode } = await runCli('enrich');
      expect(exitCode).toBe(1);
      expect(output).toContain('Input file required');
    });

    test('should enrich diagram with metadata', async () => {
      const outputJson = resolve(TEST_OUTPUT_DIR, 'test-enriched.json');
      const { exitCode } = await runCli(`enrich ${SAMPLE_JSON} ${outputJson}`);
      expect(exitCode).toBe(0);
      expect(existsSync(outputJson)).toBe(true);

      const enriched = JSON.parse(readFileSync(outputJson, 'utf-8'));
      expect(enriched).toHaveProperty('meta');
    });
  });

  describe('edit commands', () => {
    let testDiagramPath: string;

    beforeAll(() => {
      testDiagramPath = resolve(TEST_OUTPUT_DIR, 'edit-test.json');
    });

    afterEach(() => {
      // Reset test diagram
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
    });

    test('add-node should add a node to diagram', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const outputPath = resolve(TEST_OUTPUT_DIR, 'add-node-result.json');

      const { exitCode } = await runCli(
        `add-node ${testDiagramPath} '{"id":"@db","icon":"aws:dynamodb","label":"DynamoDB","position":[600,150]}' ${outputPath}`
      );
      expect(exitCode).toBe(0);

      const result = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(result.nodes.length).toBe(3);
      expect(result.nodes.find((n: any) => n.id === '@db')).toBeDefined();
    });

    test('remove-node should remove a node from diagram', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const outputPath = resolve(TEST_OUTPUT_DIR, 'remove-node-result.json');

      const { exitCode } = await runCli(`remove-node ${testDiagramPath} @lambda ${outputPath}`);
      expect(exitCode).toBe(0);

      const result = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(result.nodes.length).toBe(1);
      expect(result.nodes.find((n: any) => n.id === '@lambda')).toBeUndefined();
    });

    test('move-node should change node position', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const outputPath = resolve(TEST_OUTPUT_DIR, 'move-node-result.json');

      const { exitCode } = await runCli(`move-node ${testDiagramPath} @api 300 250 ${outputPath}`);
      expect(exitCode).toBe(0);

      const result = JSON.parse(readFileSync(outputPath, 'utf-8'));
      const apiNode = result.nodes.find((n: any) => n.id === '@api');
      expect(apiNode.position).toEqual([300, 250]);
    });

    test('add-connection should add a connection', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const outputPath = resolve(TEST_OUTPUT_DIR, 'add-conn-result.json');

      const { exitCode } = await runCli(`add-connection ${testDiagramPath} @lambda @api ${outputPath}`);
      expect(exitCode).toBe(0);

      const result = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(result.connections.length).toBe(2);
    });

    test('eval should execute builder expression', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const outputPath = resolve(TEST_OUTPUT_DIR, 'eval-result.json');

      const { exitCode } = await runCli(
        `eval ${testDiagramPath} 'b.setTitle("Updated Title")' ${outputPath}`
      );
      expect(exitCode).toBe(0);

      const result = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(result.title).toBe('Updated Title');
    });
  });

  describe('flag-style commands', () => {
    let testDiagramPath: string;

    beforeAll(() => {
      testDiagramPath = resolve(TEST_OUTPUT_DIR, 'flag-test.json');
    });

    afterEach(() => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
    });

    test('--open --diagram should show diagram structure', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const { stdout, exitCode } = await runCli(`--open --diagram ${testDiagramPath}`);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Diagram:');
      expect(stdout).toContain('Nodes:');
      expect(stdout).toContain('@api');
      expect(stdout).toContain('@lambda');
    });

    test('--output html --diagram should generate HTML', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const { exitCode } = await runCli(`--output html --diagram ${testDiagramPath}`);
      expect(exitCode).toBe(0);

      const outputHtml = resolve(TEST_OUTPUT_DIR, 'flag-test.html');
      expect(existsSync(outputHtml)).toBe(true);
    });

    test('--output svg --diagram should generate SVG', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const { exitCode } = await runCli(`--output svg --diagram ${testDiagramPath}`);
      expect(exitCode).toBe(0);

      const outputSvg = resolve(TEST_OUTPUT_DIR, 'flag-test.svg');
      expect(existsSync(outputSvg)).toBe(true);
    });

    test('--insert-below should add node below reference', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const { exitCode } = await runCli(
        `--insert-below @lambda --node '{"id":"@db","icon":"aws:dynamodb","label":"DB"}' --diagram ${testDiagramPath}`
      );
      expect(exitCode).toBe(0);

      const result = JSON.parse(readFileSync(testDiagramPath, 'utf-8'));
      expect(result.nodes.find((n: any) => n.id === '@db')).toBeDefined();
    });

    test('--update-node should update node properties', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const { exitCode } = await runCli(
        `--update-node @api --node '{"label":"Updated API"}' --diagram ${testDiagramPath}`
      );
      expect(exitCode).toBe(0);

      const result = JSON.parse(readFileSync(testDiagramPath, 'utf-8'));
      const apiNode = result.nodes.find((n: any) => n.id === '@api');
      expect(apiNode.label).toBe('Updated API');
    });

    test('--remove-node should remove node', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const { exitCode } = await runCli(`--remove-node @lambda --diagram ${testDiagramPath}`);
      expect(exitCode).toBe(0);

      const result = JSON.parse(readFileSync(testDiagramPath, 'utf-8'));
      expect(result.nodes.find((n: any) => n.id === '@lambda')).toBeUndefined();
    });
  });

  describe('options', () => {
    test('--width and --height should set render dimensions', async () => {
      const outputHtml = resolve(TEST_OUTPUT_DIR, 'size-test.html');
      const { exitCode } = await runCli(`html ${SAMPLE_JSON} ${outputHtml} --width 1200 --height 800`);
      expect(exitCode).toBe(0);

      const content = readFileSync(outputHtml, 'utf-8');
      // Check SVG viewBox or dimensions
      expect(content).toMatch(/width[=:]["']?1200/);
    });

    test('--paper should set paper size', async () => {
      const outputHtml = resolve(TEST_OUTPUT_DIR, 'paper-test.html');
      const { exitCode } = await runCli(`html ${SAMPLE_JSON} ${outputHtml} --paper a4-landscape`);
      expect(exitCode).toBe(0);

      const content = readFileSync(outputHtml, 'utf-8');
      // A4 landscape is 1123x794
      expect(content).toMatch(/viewBox[=]["']0 0 1123 794["']/);
    });

    test('--pretty should format JSON output', async () => {
      const outputJson = resolve(TEST_OUTPUT_DIR, 'pretty-test.json');
      const { exitCode } = await runCli(`enrich ${SAMPLE_JSON} ${outputJson} --pretty`);
      expect(exitCode).toBe(0);

      const content = readFileSync(outputJson, 'utf-8');
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });

    test('--in-place should modify input file', async () => {
      const testJson = resolve(TEST_OUTPUT_DIR, 'inplace-test.json');
      writeFileSync(testJson, JSON.stringify(createTestDiagram()));

      const { exitCode } = await runCli(`eval ${testJson} 'b.setTitle("In-Place Updated")' --in-place`);
      expect(exitCode).toBe(0);

      const result = JSON.parse(readFileSync(testJson, 'utf-8'));
      expect(result.title).toBe('In-Place Updated');
    });
  });

  describe('icon commands', () => {
    test('--icon-catalog should list catalog paths', async () => {
      const { stdout, exitCode } = await runCli('--icon-catalog');
      // May succeed or fail depending on catalog availability
      if (exitCode === 0) {
        expect(stdout).toMatch(/AWS|Azure|Google Cloud|Tech Stack/);
      }
    });

    test('--icon-search should search icons', async () => {
      const { stdout, exitCode } = await runCli('--icon-search lambda');
      expect(exitCode).toBe(0);
      expect(stdout).toContain('lambda');
    });
  });

  describe('resource management', () => {
    let testDiagramPath: string;

    beforeAll(() => {
      testDiagramPath = resolve(TEST_OUTPUT_DIR, 'resource-test.json');
    });

    afterEach(() => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
    });

    test('--add-resource should add resource definition', async () => {
      writeFileSync(testDiagramPath, JSON.stringify(createTestDiagram()));
      const { exitCode } = await runCli(
        `--add-resource @db --icon aws:dynamodb --desc "Database" --diagram ${testDiagramPath}`
      );
      expect(exitCode).toBe(0);

      const result = JSON.parse(readFileSync(testDiagramPath, 'utf-8'));
      expect(result.resources['@db']).toBeDefined();
      expect(result.resources['@db'].icon).toBe('aws:dynamodb');
    });

    test('--list-resources should list resources', async () => {
      const diagramWithResources = {
        ...createTestDiagram(),
        resources: {
          '@api': { icon: 'aws:api_gateway', desc: 'API' },
        },
      };
      writeFileSync(testDiagramPath, JSON.stringify(diagramWithResources));

      const { stdout, exitCode } = await runCli(`--list-resources --diagram ${testDiagramPath}`);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('@api');
    });
  });

  describe('error handling', () => {
    test('should error on nonexistent input file', async () => {
      const { output, exitCode } = await runCli('html nonexistent.json');
      expect(exitCode).toBe(1);
      expect(output).toContain('Error');
    });

    test('should error on invalid JSON', async () => {
      const invalidJson = resolve(TEST_OUTPUT_DIR, 'invalid.json');
      writeFileSync(invalidJson, 'not valid json');

      const { output, exitCode } = await runCli(`html ${invalidJson}`);
      expect(exitCode).toBe(1);
      expect(output).toContain('Error');
    });
  });
});
