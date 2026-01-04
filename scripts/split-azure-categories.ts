#!/usr/bin/env bun
/**
 * Split Azure icons into categories based on slug prefix
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const AZURE_DIR = 'src/icons/azure';
const generalPath = join(AZURE_DIR, 'general.json');

interface IconEntry {
  slug: string;
  displayName: string;
  url: string;
}

interface CategoryFile {
  category: string;
  count: number;
  icons: IconEntry[];
}

// Read current general.json
const data: CategoryFile = JSON.parse(readFileSync(generalPath, 'utf-8'));

// Define category prefixes (from slug analysis)
const CATEGORY_PREFIXES: Record<string, string> = {
  'abs': 'Azure Services',
  'active': 'Identity',
  'activity': 'Monitoring',
  'all': 'Resources',
  'analysis': 'Analytics',
  'api': 'API Management',
  'app': 'App Services',
  'application': 'Application',
  'automation': 'Automation',
  'availability': 'Availability',
  'azure': 'Azure Services',
  'batch': 'Compute',
  'biz': 'Integration',
  'blob': 'Storage',
  'bot': 'AI & Cognitive',
  'cache': 'Cache',
  'cdn': 'CDN',
  'cloud': 'Compute',
  'cognitive': 'AI & Cognitive',
  'conditional': 'Identity',
  'container': 'Containers',
  'controls': 'UI Elements',
  'cost': 'Cost Management',
  'data': 'Data Services',
  'ddos': 'Security',
  'dev': 'Developer Tools',
  'devtest': 'Developer Tools',
  'device': 'Devices',
  'diagnostics': 'Monitoring',
  'digital': 'IoT',
  'disk': 'Storage',
  'disks': 'Storage',
  'dns': 'Networking',
  'elastic': 'Databases',
  'enterprise': 'Identity',
  'event': 'Events & Messaging',
  'expressroute': 'Networking',
  'folder': 'UI Elements',
  'front': 'Networking',
  'function': 'Compute',
  'globe': 'UI Elements',
  'hd': 'Analytics',
  'help': 'UI Elements',
  'identity': 'Identity',
  'image': 'Compute',
  'import': 'Data Services',
  'infrastructure': 'Backup & Recovery',
  'input': 'UI Elements',
  'instance': 'Databases',
  'integration': 'Integration',
  'internet': 'Networking',
  'iot': 'IoT',
  'ip': 'Networking',
  'journey': 'IoT',
  'key': 'Security',
  'kubernetes': 'Containers',
  'lab': 'Developer Tools',
  'launch': 'UI Elements',
  'load': 'Networking',
  'log': 'Monitoring',
  'logic': 'Integration',
  'machine': 'AI & Cognitive',
  'managed': 'Managed Services',
  'management': 'Management',
  'media': 'Media',
  'mesh': 'Containers',
  'mobile': 'Mobile',
  'monitor': 'Monitoring',
  'multi': 'Identity',
  'my': 'Management',
  'network': 'Networking',
  'notification': 'Events & Messaging',
  'operation': 'Monitoring',
  'os': 'Compute',
  'outbound': 'Networking',
  'peering': 'Networking',
  'policy': 'Management',
  'power': 'UI Elements',
  'private': 'Networking',
  'process': 'Developer Tools',
  'production': 'Databases',
  'proximity': 'Compute',
  'public': 'Networking',
  'quickstart': 'UI Elements',
  'recovery': 'Backup & Recovery',
  'remote': 'Compute',
  'reserved': 'Networking',
  'resource': 'Resources',
  'route': 'Networking',
  'sap': 'Enterprise',
  'search': 'Search',
  'security': 'Security',
  'server': 'Compute',
  'service': 'Service Bus',
  'shared': 'Compute',
  'software': 'Marketplace',
  'sql': 'Databases',
  'static': 'Web Services',
  'storage': 'Storage',
  'storsimple': 'Storage',
  'stream': 'Analytics',
  'tfs': 'Developer Tools',
  'time': 'Analytics',
  'traffic': 'Networking',
  'universal': 'Services',
  'user': 'Identity',
  'virtual': 'Compute',
  'vm': 'Compute',
  'web': 'Web Services',
  'website': 'Web Services',
  'windows': 'Compute',
};

// Single word slugs to category mapping
const SINGLE_WORD_MAPPING: Record<string, string> = {
  'advisor': 'Management',
  'alerts': 'Monitoring',
  'avs': 'Compute',
  'backlog': 'Developer Tools',
  'blueprints': 'Management',
  'branch': 'Developer Tools',
  'browser': 'UI Elements',
  'bug': 'Developer Tools',
  'builds': 'Developer Tools',
  'capacity': 'Management',
  'code': 'Developer Tools',
  'commit': 'Developer Tools',
  'compliance': 'Security',
  'connections': 'Networking',
  'consortium': 'Blockchain',
  'counter': 'UI Elements',
  'cubes': 'UI Elements',
  'dashboard': 'UI Elements',
  'detonation': 'Security',
  'download': 'UI Elements',
  'education': 'Services',
  'error': 'UI Elements',
  'extendedsecurityupdates': 'Security',
  'extensions': 'Compute',
  'file': 'Storage',
  'files': 'Storage',
  'firewalls': 'Security',
  'ftp': 'Networking',
  'gear': 'UI Elements',
  'groups': 'Identity',
  'guide': 'UI Elements',
  'heart': 'UI Elements',
  'images': 'Compute',
  'information': 'UI Elements',
  'keys': 'Security',
  'learn': 'Services',
  'location': 'UI Elements',
  'machinesazurearc': 'Compute',
  'marketplace': 'Marketplace',
  'media': 'Media',
  'metrics': 'Monitoring',
  'mobile': 'Mobile',
  'module': 'Automation',
  'nat': 'Networking',
  'offers': 'Marketplace',
  'plans': 'Management',
  'power': 'UI Elements',
  'powershell': 'Developer Tools',
  'preview': 'UI Elements',
  'recent': 'UI Elements',
  'relays': 'Events & Messaging',
  'reservations': 'Management',
  'rtos': 'IoT',
  'scale': 'Compute',
  'scheduler': 'Automation',
  'solutions': 'Management',
  'ssd': 'Storage',
  'subscriptions': 'Management',
  'table': 'Storage',
  'tags': 'Management',
  'toolbox': 'UI Elements',
  'updates': 'Management',
  'users': 'Identity',
  'versions': 'UI Elements',
  'workbooks': 'Monitoring',
  'workflow': 'Integration',
  'workspaces': 'Analytics',
};

// Categorize icons
const categorizedIcons: Record<string, IconEntry[]> = {};

for (const icon of data.icons) {
  const slug = icon.slug;
  let category = 'Other';

  // First check single word mapping (exact match)
  if (SINGLE_WORD_MAPPING[slug]) {
    category = SINGLE_WORD_MAPPING[slug];
  } else {
    // Find matching prefix
    for (const [prefix, catName] of Object.entries(CATEGORY_PREFIXES)) {
      if (slug.startsWith(prefix + '_') || slug === prefix) {
        category = catName;
        break;
      }
    }
  }

  if (!categorizedIcons[category]) {
    categorizedIcons[category] = [];
  }
  categorizedIcons[category].push(icon);
}

// Write category files
const categoryFiles: string[] = [];

for (const [category, icons] of Object.entries(categorizedIcons).sort((a, b) => a[0].localeCompare(b[0]))) {
  const filename = category.toLowerCase().replace(/[&\s]+/g, '-').replace(/--+/g, '-') + '.json';
  categoryFiles.push(filename);
  
  const categoryData: CategoryFile = {
    category,
    count: icons.length,
    icons: icons.sort((a, b) => a.slug.localeCompare(b.slug)),
  };
  
  writeFileSync(join(AZURE_DIR, filename), JSON.stringify(categoryData, null, 2) + '\n');
  console.log(`  ${category}: ${icons.length} icons -> ${filename}`);
}

// Update _index.json
const indexData = {
  provider: 'azure',
  totalIcons: data.icons.length,
  categories: categoryFiles,
};
writeFileSync(join(AZURE_DIR, '_index.json'), JSON.stringify(indexData, null, 2) + '\n');

// Remove old general.json
// (keep it for now, can be deleted manually)

console.log(`\nCreated ${categoryFiles.length} category files`);
console.log('Total icons:', data.icons.length);
