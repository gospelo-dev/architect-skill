#!/usr/bin/env bun
/**
 * html-render.ts - Convert HTML file to PNG, JPEG, or PDF using Puppeteer
 *
 * Usage:
 *   bun run bin/html-render.ts png <input.html> <output.png> [width] [height] [scale] [fullPage]
 *   bun run bin/html-render.ts jpg <input.html> <output.jpg> [width] [height] [scale] [fullPage] [quality]
 *   bun run bin/html-render.ts pdf <input.html> <output.pdf> [width] [height] [format] [landscape]
 *
 * Works on:
 *   - macOS (with bundled Chromium or system Chrome)
 *   - Ubuntu/Linux (Web Claude environment)
 */

import puppeteer, { type Browser, type Page, type PaperFormat } from 'puppeteer';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Parse arguments
const [mode, inputHtml, outputFile, ...rest] = process.argv.slice(2);

if (!mode || !inputHtml || !outputFile) {
  console.error('Usage:');
  console.error('  bun run html-render.ts png <input.html> <output.png> [width] [height] [scale] [fullPage]');
  console.error('  bun run html-render.ts jpg <input.html> <output.jpg> [width] [height] [scale] [fullPage] [quality]');
  console.error('  bun run html-render.ts pdf <input.html> <output.pdf> [width] [height] [format] [landscape]');
  process.exit(1);
}

// Resolve absolute path
const absoluteInputPath = resolve(inputHtml);

if (!existsSync(absoluteInputPath)) {
  console.error(`File not found: ${absoluteInputPath}`);
  process.exit(1);
}

// Convert file path to file:// URL
const fileUrl = `file://${absoluteInputPath}`;

// Puppeteer launch options
function getLaunchOptions(): Parameters<typeof puppeteer.launch>[0] {
  const baseOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--allow-file-access-from-files',
    ],
  };

  // Check for custom Chrome path
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return {
      ...baseOptions,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    };
  }

  // On Ubuntu (Web Claude), check common Chrome locations
  const linuxChromePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];

  for (const chromePath of linuxChromePaths) {
    if (existsSync(chromePath)) {
      return {
        ...baseOptions,
        executablePath: chromePath,
      };
    }
  }

  // On macOS, check for Chrome
  const macChromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];

  for (const chromePath of macChromePaths) {
    if (existsSync(chromePath)) {
      return {
        ...baseOptions,
        executablePath: chromePath,
      };
    }
  }

  // Let Puppeteer use its bundled Chromium
  return baseOptions;
}

// Image conversion (PNG or JPEG)
async function convertToImage(type: 'png' | 'jpeg'): Promise<void> {
  const [widthStr, heightStr, scaleStr, fullPageStr, qualityStr] = rest;
  const width = parseInt(widthStr || '1920', 10);
  const height = parseInt(heightStr || '1080', 10);
  const scale = parseFloat(scaleStr || '2');
  const fullPage = fullPageStr === 'true';
  const quality = type === 'jpeg' ? parseInt(qualityStr || '90', 10) : undefined;

  let browser: Browser | null = null;

  try {
    console.error(`Launching browser...`);
    browser = await puppeteer.launch(getLaunchOptions());

    const page: Page = await browser.newPage();

    await page.setViewport({
      width,
      height,
      deviceScaleFactor: scale,
    });

    console.error(`Loading: ${fileUrl}`);
    await page.goto(fileUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for animations/transitions
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

    console.error(`Taking screenshot (${type.toUpperCase()})...`);
    await page.screenshot({
      path: outputFile,
      fullPage,
      type,
      quality,
      omitBackground: false,
    });

    console.error(`Saved: ${outputFile}`);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// PDF conversion
async function convertToPdf(): Promise<void> {
  const [widthStr, heightStr, formatStr, landscapeStr] = rest;
  const width = parseInt(widthStr || '1920', 10);
  const height = parseInt(heightStr || '1080', 10);
  const format = (formatStr || 'a4') as PaperFormat;
  const landscape = landscapeStr === 'true';

  let browser: Browser | null = null;

  try {
    console.error(`Launching browser...`);
    browser = await puppeteer.launch(getLaunchOptions());

    const page: Page = await browser.newPage();

    // Set viewport for rendering
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 2,
    });

    console.error(`Loading: ${fileUrl}`);
    await page.goto(fileUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for animations/transitions
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

    console.error(`Generating PDF...`);
    await page.pdf({
      path: outputFile,
      format,
      landscape,
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    console.error(`Saved: ${outputFile}`);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main
switch (mode) {
  case 'png':
    await convertToImage('png');
    break;
  case 'jpg':
  case 'jpeg':
    await convertToImage('jpeg');
    break;
  case 'pdf':
    await convertToPdf();
    break;
  default:
    console.error(`Unknown mode: ${mode}`);
    console.error('Use "png", "jpg", or "pdf"');
    process.exit(1);
}
