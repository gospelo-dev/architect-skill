import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(import.meta.dir, '../..');
const CLI_EXT = resolve(PROJECT_ROOT, 'bin/cli-ext.sh');
const CLI_TS = resolve(PROJECT_ROOT, 'bin/cli.ts');
const TEST_OUTPUT_DIR = resolve(PROJECT_ROOT, 'tests/cli-ext/output');

// Helper to run shell commands
async function runCommand(cmd: string): Promise<{ stdout: string; stderr: string; output: string; exitCode: number }> {
  const proc = Bun.spawn(['bash', '-c', cmd], {
    cwd: PROJECT_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  // Combined output for error checking (bash echo -e goes to stdout)
  const output = stdout + stderr;
  return { stdout, stderr, output, exitCode };
}

describe('cli-ext.sh', () => {
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

  describe('help command', () => {
    test('should display help with --help flag', async () => {
      const { stdout, exitCode } = await runCommand(`${CLI_EXT} --help`);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('cli-ext.sh - Extended CLI tools');
      expect(stdout).toContain('html2png');
      expect(stdout).toContain('html2jpg');
      expect(stdout).toContain('html2pdf');
    });

    test('should display help with -h flag', async () => {
      const { stdout, exitCode } = await runCommand(`${CLI_EXT} -h`);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('cli-ext.sh');
    });

    test('should display help with no arguments', async () => {
      const { stdout, exitCode } = await runCommand(CLI_EXT);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage:');
    });
  });

  describe('unknown command', () => {
    test('should error on unknown command', async () => {
      const { output, exitCode } = await runCommand(`${CLI_EXT} unknown-command`);
      expect(exitCode).toBe(1);
      expect(output).toContain('Unknown command');
    });
  });

  describe('html2png', () => {
    const testHtml = resolve(TEST_OUTPUT_DIR, 'test-diagram.html');
    const testPng = resolve(TEST_OUTPUT_DIR, 'test-diagram.png');

    beforeAll(async () => {
      // Generate test HTML using cli.ts
      const sampleJson = resolve(PROJECT_ROOT, 'examples/01-serverless-rest-api.json');
      await runCommand(`bun ${CLI_TS} preview ${sampleJson} ${testHtml}`);
    });

    test('should error on nonexistent input file', async () => {
      const { output, exitCode } = await runCommand(`${CLI_EXT} html2png nonexistent.html`);
      expect(exitCode).toBe(1);
      expect(output).toContain('File not found');
    });

    test('should convert HTML to PNG with default options', async () => {
      const { exitCode } = await runCommand(`${CLI_EXT} html2png ${testHtml} ${testPng}`);
      expect(exitCode).toBe(0);
      expect(existsSync(testPng)).toBe(true);

      // Check file size is reasonable (should be > 10KB for a diagram)
      const stat = Bun.file(testPng);
      expect(stat.size).toBeGreaterThan(10000);
    });

    test('should convert HTML to PNG with --paper option', async () => {
      const outputPng = resolve(TEST_OUTPUT_DIR, 'test-a3.png');
      const { exitCode } = await runCommand(`${CLI_EXT} html2png ${testHtml} ${outputPng} --paper a3-landscape`);
      expect(exitCode).toBe(0);
      expect(existsSync(outputPng)).toBe(true);
    });

    test('should convert HTML to PNG with custom width/height', async () => {
      const outputPng = resolve(TEST_OUTPUT_DIR, 'test-custom-size.png');
      const { exitCode } = await runCommand(`${CLI_EXT} html2png ${testHtml} ${outputPng} --width 1280 --height 720`);
      expect(exitCode).toBe(0);
      expect(existsSync(outputPng)).toBe(true);
    });

    test('should convert HTML to PNG with --scale option', async () => {
      const outputPng = resolve(TEST_OUTPUT_DIR, 'test-scale1.png');
      const { exitCode } = await runCommand(`${CLI_EXT} html2png ${testHtml} ${outputPng} --scale 1`);
      expect(exitCode).toBe(0);
      expect(existsSync(outputPng)).toBe(true);
    });

    test('should error on invalid paper size', async () => {
      const { output, exitCode } = await runCommand(`${CLI_EXT} html2png ${testHtml} ${testPng} --paper invalid-size`);
      expect(exitCode).toBe(1);
      expect(output).toContain('Unknown paper size');
    });

    test('should error on unknown option', async () => {
      const { output, exitCode } = await runCommand(`${CLI_EXT} html2png ${testHtml} ${testPng} --unknown-option`);
      expect(exitCode).toBe(1);
      expect(output).toContain('Unknown option');
    });
  });

  describe('html2jpg', () => {
    const testHtml = resolve(TEST_OUTPUT_DIR, 'test-diagram.html');
    const testJpg = resolve(TEST_OUTPUT_DIR, 'test-diagram.jpg');

    test('should convert HTML to JPG with default options', async () => {
      const { exitCode } = await runCommand(`${CLI_EXT} html2jpg ${testHtml} ${testJpg}`);
      expect(exitCode).toBe(0);
      expect(existsSync(testJpg)).toBe(true);
    });

    test('should convert HTML to JPG with --quality option', async () => {
      const outputJpg = resolve(TEST_OUTPUT_DIR, 'test-quality50.jpg');
      const { exitCode } = await runCommand(`${CLI_EXT} html2jpg ${testHtml} ${outputJpg} --quality 50`);
      expect(exitCode).toBe(0);
      expect(existsSync(outputJpg)).toBe(true);

      // Lower quality should result in smaller file
      const highQuality = Bun.file(testJpg);
      const lowQuality = Bun.file(outputJpg);
      expect(lowQuality.size).toBeLessThan(highQuality.size);
    });

    test('should support html2jpeg alias', async () => {
      const outputJpg = resolve(TEST_OUTPUT_DIR, 'test-jpeg-alias.jpg');
      const { exitCode } = await runCommand(`${CLI_EXT} html2jpeg ${testHtml} ${outputJpg}`);
      expect(exitCode).toBe(0);
      expect(existsSync(outputJpg)).toBe(true);
    });
  });

  describe('html2pdf', () => {
    const testHtml = resolve(TEST_OUTPUT_DIR, 'test-diagram.html');
    const testPdf = resolve(TEST_OUTPUT_DIR, 'test-diagram.pdf');

    test('should convert HTML to PDF with default options', async () => {
      const { exitCode } = await runCommand(`${CLI_EXT} html2pdf ${testHtml} ${testPdf}`);
      expect(exitCode).toBe(0);
      expect(existsSync(testPdf)).toBe(true);

      // Check PDF magic bytes
      const file = Bun.file(testPdf);
      const buffer = await file.arrayBuffer();
      const header = new Uint8Array(buffer.slice(0, 4));
      expect(String.fromCharCode(...header)).toBe('%PDF');
    });

    test('should convert HTML to PDF with --paper option', async () => {
      const outputPdf = resolve(TEST_OUTPUT_DIR, 'test-a3.pdf');
      const { exitCode } = await runCommand(`${CLI_EXT} html2pdf ${testHtml} ${outputPdf} --paper a3-landscape`);
      expect(exitCode).toBe(0);
      expect(existsSync(outputPdf)).toBe(true);
    });

    test('should convert HTML to PDF with --format option', async () => {
      const outputPdf = resolve(TEST_OUTPUT_DIR, 'test-letter.pdf');
      const { exitCode } = await runCommand(`${CLI_EXT} html2pdf ${testHtml} ${outputPdf} --format letter`);
      expect(exitCode).toBe(0);
      expect(existsSync(outputPdf)).toBe(true);
    });
  });

  describe('paper sizes', () => {
    const testHtml = resolve(TEST_OUTPUT_DIR, 'test-diagram.html');

    // Test a subset of paper sizes to avoid too many browser launches
    const paperSizes = [
      'a4-landscape',
      'a4-portrait',
      'fhd-landscape',
      '4k-landscape',
    ];

    for (const paper of paperSizes) {
      test(`should support --paper ${paper}`, async () => {
        const outputPng = resolve(TEST_OUTPUT_DIR, `test-${paper}.png`);
        const { exitCode } = await runCommand(`${CLI_EXT} html2png ${testHtml} ${outputPng} --paper ${paper}`);
        expect(exitCode).toBe(0);
        expect(existsSync(outputPng)).toBe(true);
      });
    }
  });

  describe('auto output filename', () => {
    test('should auto-generate PNG filename from HTML', async () => {
      // Ensure test HTML exists
      const testHtml = resolve(TEST_OUTPUT_DIR, 'test-diagram.html');
      if (!existsSync(testHtml)) {
        const sampleJson = resolve(PROJECT_ROOT, 'examples/01-serverless-rest-api.json');
        await runCommand(`bun ${CLI_TS} preview ${sampleJson} ${testHtml}`);
      }
      // Use absolute path, output should be generated in same directory as input
      const { exitCode } = await runCommand(`${CLI_EXT} html2png ${testHtml}`);
      expect(exitCode).toBe(0);
      const autoOutput = resolve(TEST_OUTPUT_DIR, 'test-diagram.png');
      expect(existsSync(autoOutput)).toBe(true);
    });
  });
});
