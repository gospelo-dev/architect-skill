#!/usr/bin/env bun
/**
 * Add Tech Stack icons (Simple Icons) to the icons directory
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ICONS_DIR = 'src/icons';
const TECH_STACK_DIR = join(ICONS_DIR, 'tech-stack');
const SIMPLE_ICONS_DATA = '.icons/tech-stack-icons/data/simple-icons.json';
const SIMPLE_ICONS_DIR = '.icons/tech-stack-icons/icons';

// Ensure directory exists
function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Write JSON file
function writeJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

// Get available icon files
function getIconFiles(): Set<string> {
  const files = new Set<string>();
  const entries = require('fs').readdirSync(SIMPLE_ICONS_DIR);
  for (const entry of entries) {
    if (entry.endsWith('.svg')) {
      files.add(entry.replace('.svg', ''));
    }
  }
  return files;
}

// Read Simple Icons metadata
interface SimpleIcon {
  title: string;
  hex: string;
  source?: string;
}

// Define tech stack categories with slugs
const TECH_STACK_CATEGORIES: Record<string, string[]> = {
  'Languages': [
    'python', 'javascript', 'typescript', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
    'scala', 'elixir', 'dart', 'perl', 'lua', 'haskell', 'julia', 'fortran', 'c', 'cplusplus',
    'r', 'clojure', 'erlang', 'fsharp', 'groovy', 'crystal', 'nim', 'zig', 'odin', 'v'
  ],
  'Frontend': [
    'react', 'vuedotjs', 'angular', 'svelte', 'nextdotjs', 'nuxtdotjs', 'gatsby', 'astro',
    'solid', 'lit', 'preact', 'remix', 'qwik', 'alpinedotjs', 'storybook', 'tailwindcss',
    'bootstrap', 'sass', 'less', 'postcss', 'vite', 'webpack', 'rollup', 'esbuild',
    'html5', 'css3', 'webcomponentsdotorg', 'threedotjs', 'babel', 'eslint', 'prettier'
  ],
  'Backend': [
    'nodedotjs', 'express', 'fastapi', 'flask', 'django', 'springboot', 'laravel',
    'rubyonrails', 'phoenix', 'gin', 'fastify', 'nestjs', 'koa', 'hono',
    'adonisjs', 'actix', 'rocket', 'axum', 'echo'
  ],
  'Cloud': [
    'googlecloud', 'digitalocean', 'vercel', 'netlify', 'cloudflare', 'vultr',
    'render', 'railway', 'flydotio', 'upcloud', 'scaleway', 'hetzner', 'civo', 'akamai'
  ],
  'Databases': [
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'mariadb', 'sqlite',
    'apachecassandra', 'couchbase', 'neo4j', 'influxdb', 'firebase', 'supabase', 'planetscale',
    'cockroachlabs', 'timescale', 'surrealdb', 'clickhouse', 'duckdb', 'questdb',
    'arangodb', 'dgraph', 'fauna', 'neon', 'turso'
  ],
  'DevOps': [
    'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'circleci', 'githubactions',
    'gitlab', 'bitbucket', 'travisci', 'teamcity', 'argo', 'helm', 'puppet', 'chef',
    'vagrant', 'packer', 'pulumi', 'rancher', 'portainer', 'podman', 'containerd',
    'istio', 'linkerd', 'consul', 'vault', 'nomad', 'waypoint', 'boundary'
  ],
  'Messaging': [
    'apachekafka', 'rabbitmq', 'mqtt', 'nats', 'zeromq', 'apachepulsar'
  ],
  'Monitoring': [
    'prometheus', 'grafana', 'datadog', 'newrelic', 'elastic', 'splunk', 'dynatrace',
    'sentry', 'honeybadger', 'jaeger', 'zipkin', 'opentelemetry', 'logstash', 'kibana',
    'fluentd', 'vector', 'uptimekuma'
  ],
  'Web Servers': [
    'nginx', 'apache', 'caddy', 'traefik', 'envoyproxy', 'haproxy'
  ],
  'Tools': [
    'git', 'github', 'jira', 'confluence', 'slack', 'discord', 'figma', 'notion',
    'trello', 'asana', 'linear', 'postman', 'insomnia', 'swagger', 'graphql',
    'curl', 'miro', 'clickup', 'todoist', 'airtable'
  ],
  'OS': [
    'linux', 'ubuntu', 'debian', 'fedora', 'archlinux', 'centos', 'alpinelinux',
    'apple', 'ios', 'android', 'redhat', 'opensuse', 'manjaro', 'nixos', 'voidlinux',
    'gentoo', 'freebsd', 'openbsd'
  ],
  'AI & ML': [
    'tensorflow', 'pytorch', 'huggingface', 'scikitlearn', 'keras', 'mlflow', 'jupyter',
    'pandas', 'numpy', 'opencv', 'langchain', 'weightsandbiases',
    'apacheairflow', 'apachespark', 'databricks', 'googlecolab', 'kaggle', 'anaconda',
    'scipy', 'matplotlib', 'plotly'
  ],
  'Security': [
    'letsencrypt', 'auth0', 'okta', 'snyk', 'sonarqube', 'dependabot',
    'owasp', 'wireshark'
  ],
  'Testing': [
    'jest', 'mocha', 'jasmine', 'cypress', 'playwright', 'selenium', 'puppeteer',
    'pytest', 'vitest', 'testinglibrary', 'cucumber'
  ],
  'Editors': [
    'visualstudiocode', 'vim', 'neovim', 'jetbrains', 'intellijidea', 'pycharm',
    'webstorm', 'goland', 'rider', 'sublimetext', 'emacs', 'eclipseide', 'xcode'
  ],
  'Package Managers': [
    'npm', 'yarn', 'pnpm', 'bun', 'deno', 'homebrew', 'chocolatey', 'snapcraft', 'flatpak'
  ],
  'Services': [
    'stripe', 'paypal', 'square', 'shopify', 'twilio', 'sendgrid', 'mailchimp',
    'mapbox', 'algolia', 'meilisearch', 'typesense', 'contentful', 'strapi', 'sanity',
    'ghost', 'wordpress', 'anthropic', 'openai', 'ollama'
  ]
};

// Main
ensureDir(TECH_STACK_DIR);

// Read Simple Icons data
const simpleIconsData: SimpleIcon[] = JSON.parse(
  readFileSync(SIMPLE_ICONS_DATA, 'utf-8')
);

// Build slug to title map
const slugToTitle = new Map<string, string>();
for (const icon of simpleIconsData) {
  // Generate slug (Simple Icons uses lowercase without special chars)
  let slug = icon.title.toLowerCase();
  for (const [char, replacement] of Object.entries({
    ' ': '', '.': 'dot', '+': 'plus', '#': 'sharp', '&': 'and', "'": '', '-': '', '/': ''
  })) {
    slug = slug.split(char).join(replacement);
  }
  slug = slug.replace(/[^a-z0-9]/g, '');
  slugToTitle.set(slug, icon.title);
}

// Get available icon files
const availableIcons = getIconFiles();

// Base URL for Simple Icons
const BASE_URL = 'https://cdn.jsdelivr.net/npm/simple-icons/icons/';

// Write metadata
const meta = {
  repository: 'https://github.com/simple-icons/simple-icons',
  commitId: 'a1c92418865a14cc3b1f58a1731ad603785251bf',
  commitDate: '2025-12-31',
  lastUpdated: new Date().toISOString().split('T')[0],
};
writeJson(join(TECH_STACK_DIR, '_meta.json'), meta);

let totalIcons = 0;
const categoryFiles: string[] = [];

// Process each category
for (const [category, slugs] of Object.entries(TECH_STACK_CATEGORIES)) {
  const icons = [];

  for (const slug of slugs) {
    if (availableIcons.has(slug)) {
      const displayName = slugToTitle.get(slug) || slug;
      icons.push({
        slug,
        displayName,
        url: `${BASE_URL}${slug}.svg`,
      });
    }
  }

  if (icons.length > 0) {
    const filename = category.toLowerCase().replace(/[&\s]+/g, '-').replace(/--+/g, '-') + '.json';
    categoryFiles.push(filename);

    const categoryData = {
      category,
      count: icons.length,
      icons,
    };

    writeJson(join(TECH_STACK_DIR, filename), categoryData);
    totalIcons += icons.length;
    console.log(`  ${category}: ${icons.length} icons`);
  }
}

// Write index
const indexData = {
  provider: 'tech-stack',
  totalIcons,
  categories: categoryFiles,
};
writeJson(join(TECH_STACK_DIR, '_index.json'), indexData);

// Update _providers.json
const providersPath = join(ICONS_DIR, '_providers.json');
const providersData = JSON.parse(readFileSync(providersPath, 'utf-8'));
if (!providersData.providers.includes('tech-stack')) {
  providersData.providers.push('tech-stack');
}
providersData.sources['tech-stack'] = meta;
writeJson(providersPath, providersData);

console.log(`\nCreated tech-stack/: ${categoryFiles.length} categories, ${totalIcons} icons`);
