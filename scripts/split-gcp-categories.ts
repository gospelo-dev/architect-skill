#!/usr/bin/env bun
/**
 * Split Google Cloud icons into categories based on slug prefix
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const GCP_DIR = 'src/icons/google-cloud';
const generalPath = join(GCP_DIR, 'general.json');

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

// Define category prefixes
const CATEGORY_PREFIXES: Record<string, string> = {
  'access': 'Security',
  'advanced': 'AI & ML',
  'agent': 'AI & ML',
  'ai': 'AI & ML',
  'analytics': 'Analytics',
  'anthos': 'Containers',
  'api': 'API Services',
  'apigee': 'API Services',
  'app': 'Compute',
  'artifact': 'Developer Tools',
  'asset': 'Management',
  'assured': 'Security',
  'automl': 'AI & ML',
  'bare': 'Compute',
  'binary': 'Security',
  'certificate': 'Security',
  'cloud_api': 'API Services',
  'cloud_armor': 'Security',
  'cloud_asset': 'Management',
  'cloud_audit': 'Management',
  'cloud_build': 'Developer Tools',
  'cloud_cdn': 'Networking',
  'cloud_code': 'Developer Tools',
  'cloud_composer': 'Data Services',
  'cloud_data': 'Data Services',
  'cloud_deploy': 'Developer Tools',
  'cloud_deployment': 'Management',
  'cloud_dns': 'Networking',
  'cloud_domains': 'Networking',
  'cloud_ekm': 'Security',
  'cloud_endpoints': 'API Services',
  'cloud_external': 'Networking',
  'cloud_firewall': 'Networking',
  'cloud_for': 'Solutions',
  'cloud_functions': 'Compute',
  'cloud_generic': 'General',
  'cloud_gpu': 'Compute',
  'cloud_healthcare': 'Healthcare',
  'cloud_hsm': 'Security',
  'cloud_ids': 'Security',
  'cloud_inference': 'AI & ML',
  'cloud_interconnect': 'Networking',
  'cloud_jobs': 'AI & ML',
  'cloud_load': 'Networking',
  'cloud_logging': 'Monitoring',
  'cloud_media': 'Media',
  'cloud_monitoring': 'Monitoring',
  'cloud_nat': 'Networking',
  'cloud_natural': 'AI & ML',
  'cloud_network': 'Networking',
  'cloud_ops': 'Monitoring',
  'cloud_optimization': 'AI & ML',
  'cloud_router': 'Networking',
  'cloud_routes': 'Networking',
  'cloud_run': 'Compute',
  'cloud_scheduler': 'Compute',
  'cloud_security': 'Security',
  'cloud_shell': 'Developer Tools',
  'cloud_spanner': 'Databases',
  'cloud_sql': 'Databases',
  'cloud_storage': 'Storage',
  'cloud_tasks': 'Compute',
  'cloud_test': 'Developer Tools',
  'cloud_tpu': 'Compute',
  'cloud_translation': 'AI & ML',
  'cloud_vision': 'AI & ML',
  'cloud_vpn': 'Networking',
  'compute': 'Compute',
  'config': 'Management',
  'contact': 'Services',
  'container': 'Containers',
  'data': 'Data Services',
  'database': 'Databases',
  'dialogflow': 'AI & ML',
  'document': 'AI & ML',
  'error': 'Monitoring',
  'essential': 'Services',
  'gke': 'Containers',
  'google': 'Google Services',
  'identity': 'Identity',
  'iot': 'IoT',
  'key': 'Security',
  'local': 'Networking',
  'media': 'Media',
  'migrate': 'Migration',
  'network': 'Networking',
  'os': 'Compute',
  'partner': 'Marketplace',
  'persistent': 'Storage',
  'policy': 'Management',
  'premium': 'Networking',
  'private': 'Networking',
  'producer': 'API Services',
  'recommendations': 'AI & ML',
  'release': 'Developer Tools',
  'retail': 'Solutions',
  'secret': 'Security',
  'security': 'Security',
  'sensitive': 'Security',
  'service': 'Management',
  'source': 'Developer Tools',
  'standard': 'Networking',
  'stream': 'Analytics',
  'talent': 'Solutions',
  'tensor': 'AI & ML',
  'traffic': 'Networking',
  'user': 'Identity',
  'vertex': 'AI & ML',
  'virtual': 'Networking',
  'vmware': 'Compute',
  'web': 'Security',
};

// Single word and special slugs to category mapping
const SINGLE_WORD_MAPPING: Record<string, string> = {
  'administration': 'Management',
  'anthos': 'Containers',
  'api': 'API Services',
  'automl': 'AI & ML',
  'batch': 'Compute',
  'beyondcorp': 'Security',
  'bigquery': 'Analytics',
  'bigtable': 'Databases',
  'billing': 'Management',
  'catalog': 'Data Services',
  'cloud_apis': 'API Services',
  'configuration_management': 'Management',
  'connectivity_test': 'Networking',
  'connectors': 'Integration',
  'dataflow': 'Data Services',
  'datalab': 'Data Services',
  'dataplex': 'Data Services',
  'datapol': 'Data Services',
  'dataprep': 'Data Services',
  'dataproc': 'Data Services',
  'dataproc_metastore': 'Data Services',
  'datashare': 'Data Services',
  'datastore': 'Databases',
  'datastream': 'Data Services',
  'debugger': 'Developer Tools',
  'developer_portal': 'Developer Tools',
  'dialogflow': 'AI & ML',
  'early_access_center': 'General',
  'eventarc': 'Events',
  'filestore': 'Storage',
  'financial_services_marketplace': 'Marketplace',
  'firestore': 'Databases',
  'fleet_engine': 'Solutions',
  'free_trial': 'General',
  'game_servers': 'Gaming',
  'gce_systems_management': 'Management',
  'genomics': 'Healthcare',
  'healthcare_nlp_api': 'Healthcare',
  'home': 'General',
  'identity-aware_proxy': 'Identity',
  'kuberun': 'Containers',
  'launcher': 'General',
  'looker': 'Analytics',
  'managed_service_for_microsoft_active_directory': 'Identity',
  'memorystore': 'Databases',
  'my_cloud': 'General',
  'onboarding': 'General',
  'performance_dashboard': 'Monitoring',
  'permissions': 'Identity',
  'phishing_protection': 'Security',
  'profiler': 'Developer Tools',
  'project': 'Management',
  'pubsub': 'Events',
  'quantum_engine': 'Compute',
  'quotas': 'Management',
  'real-world_insights': 'Analytics',
  'risk_manager': 'Security',
  'runtime_config': 'Management',
  'security': 'Security',
  'speech-to-text': 'AI & ML',
  'stackdriver': 'Monitoring',
  'support': 'Services',
  'tensorflow_enterprise': 'AI & ML',
  'text-to-speech': 'AI & ML',
  'tools_for_powershell': 'Developer Tools',
  'trace': 'Monitoring',
  'transfer': 'Data Services',
  'transfer_appliance': 'Migration',
  'vertexai': 'AI & ML',
  'video_intelligence_api': 'AI & ML',
  'visual_inspection': 'AI & ML',
  'workflows': 'Integration',
  'workload_identity_pool': 'Identity',
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
    // Find matching prefix (longer prefixes first for better matching)
    const sortedPrefixes = Object.entries(CATEGORY_PREFIXES)
      .sort((a, b) => b[0].length - a[0].length);
    
    for (const [prefix, catName] of sortedPrefixes) {
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

  writeFileSync(join(GCP_DIR, filename), JSON.stringify(categoryData, null, 2) + '\n');
  console.log(`  ${category}: ${icons.length} icons -> ${filename}`);
}

// Update _index.json
const indexData = {
  provider: 'google-cloud',
  totalIcons: data.icons.length,
  categories: categoryFiles,
};
writeFileSync(join(GCP_DIR, '_index.json'), JSON.stringify(indexData, null, 2) + '\n');

console.log(`\nCreated ${categoryFiles.length} category files`);
console.log('Total icons:', data.icons.length);
