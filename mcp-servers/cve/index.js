import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class CVEMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'cve-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.nvdApiKey = process.env.NVD_API_KEY || '';
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'cve_search',
          description: 'Search for CVEs by keyword',
          inputSchema: {
            type: 'object',
            properties: {
              keyword: { type: 'string', description: 'Search keyword' },
              limit: { type: 'number', description: 'Number of results (default 10)' }
            },
            required: ['keyword']
          }
        },
        {
          name: 'cve_details',
          description: 'Get details for a specific CVE',
          inputSchema: {
            type: 'object',
            properties: {
              cveId: { type: 'string', description: 'CVE ID (e.g., CVE-2024-1234)' }
            },
            required: ['cveId']
          }
        },
        {
          name: 'cve_by_year',
          description: 'Get all CVEs from a specific year',
          inputSchema: {
            type: 'object',
            properties: {
              year: { type: 'number', description: 'Year (e.g., 2024)' }
            },
            required: ['year']
          }
        },
        {
          name: 'cve_by_vendor',
          description: 'Get CVEs for a specific vendor/product',
          inputSchema: {
            type: 'object',
            properties: {
              vendor: { type: 'string', description: 'Vendor name (e.g., apache)' },
              product: { type: 'string', description: 'Product name (e.g., log4j)' }
            },
            required: ['vendor']
          }
        },
        {
          name: 'cve_by_severity',
          description: 'Get CVEs by severity level',
          inputSchema: {
            type: 'object',
            properties: {
              severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], description: 'Severity level' },
              limit: { type: 'number', description: 'Number of results' }
            },
            required: ['severity']
          }
        },
        {
          name: 'cve_exploit_available',
          description: 'Find CVEs with known exploits',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of results' }
            }
          }
        },
        {
          name: 'cve_trending',
          description: 'Get trending/popular CVEs',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'number', description: 'Days to look back (default 7)' }
            }
          }
        },
        {
          name: 'cve_metrics',
          description: 'Get CVSS metrics for a CVE',
          inputSchema: {
            type: 'object',
            properties: {
              cveId: { type: 'string', description: 'CVE ID' }
            },
            required: ['cveId']
          }
        },
        {
          name: 'cve_references',
          description: 'Get reference links for a CVE',
          inputSchema: {
            type: 'object',
            properties: {
              cveId: { type: 'string', description: 'CVE ID' }
            },
            required: ['cveId']
          }
        },
        {
          name: 'cve_cpe_match',
          description: 'Find CVEs matching a CPE',
          inputSchema: {
            type: 'object',
            properties: {
              cpe: { type: 'string', description: 'CPE string (e.g., cpe:2.3:a:apache:log4j:*:*:*:*:*:*:*:*' }
            },
            required: ['cpe']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'cve_search':
            return await this.cveSearch(args.keyword, args.limit);
          case 'cve_details':
            return await this.cveDetails(args.cveId);
          case 'cve_by_year':
            return await this.cveByYear(args.year);
          case 'cve_by_vendor':
            return await this.cveByVendor(args.vendor, args.product);
          case 'cve_by_severity':
            return await this.cveBySeverity(args.severity, args.limit);
          case 'cve_exploit_available':
            return await this.cveExploitAvailable(args.limit);
          case 'cve_trending':
            return await this.cveTrending(args.days);
          case 'cve_metrics':
            return await this.cveMetrics(args.cveId);
          case 'cve_references':
            return await this.cveReferences(args.cveId);
          case 'cve_cpe_match':
            return await this.cveCpeMatch(args.cpe);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async fetchNVD(endpoint) {
    const baseUrl = 'https://services.nvd.nist.gov/rest/json';
    const url = `${baseUrl}/${endpoint}`;
    const headers = {};
    
    if (this.nvdApiKey) {
      headers['apiKey'] = this.nvdApiKey;
    }

    const { default: fetch } = await import('node-fetch');
    const response = await fetch(url, { headers });
    return await response.json();
  }

  async cveSearch(keyword, limit = 10) {
    const data = await this.fetchNVD(`cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=${limit}`);
    const results = (data.vulnerabilities || []).slice(0, limit).map(v => ({
      id: v.cve.id,
      description: v.cve.descriptions?.[0]?.value?.substring(0, 200),
      severity: v.cve.metrics?.cvssMetricV31?.[0]?.cvss?.baseScore,
      severityLevel: v.cve.metrics?.cvssMetricV31?.[0]?.cvss?.baseSeverity,
      published: v.cve.published,
      lastModified: v.cve.lastModified
    }));
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  async cveDetails(cveId) {
    const data = await this.fetchNVD(`cves/2.0?cveId=${cveId}`);
    const vuln = data.vulnerabilities?.[0]?.cve;
    
    if (!vuln) {
      return { content: [{ type: 'text', text: 'CVE not found' }], isError: true };
    }

    const details = {
      id: vuln.id,
      description: vuln.descriptions?.[0]?.value,
      severity: vuln.metrics?.cvssMetricV31?.[0]?.cvss,
      metrics: {
        v31: vuln.metrics?.cvssMetricV31?.[0]?.cvss,
        v30: vuln.metrics?.cvssMetricV30?.[0]?.cvss,
        v2: vuln.metrics?.cvssMetricV2?.[0]?.cvss
      },
      references: vuln.references?.map(r => ({ url: r.url, source: r.source, tags: r.tags })),
      weaknesses: vuln.weaknesses?.map(w => w.description?.[0]?.value),
      configurations: vuln.configurations,
      published: vuln.published,
      lastModified: vuln.lastModified
    };
    
    return { content: [{ type: 'text', text: JSON.stringify(details, null, 2) }] };
  }

  async cveByYear(year) {
    const startDate = `${year}-01-01T00:00:00.000Z`;
    const endDate = `${year}-12-31T23:59:59.999Z`;
    const data = await this.fetchNVD(`cves/2.0?pubStartDate=${startDate}&pubEndDate=${endDate}&resultsPerPage=50`);
    
    const results = (data.vulnerabilities || []).map(v => ({
      id: v.cve.id,
      description: v.cve.descriptions?.[0]?.value?.substring(0, 150),
      severity: v.cve.metrics?.cvssMetricV31?.[0]?.cvss?.baseScore,
      severityLevel: v.cve.metrics?.cvssMetricV31?.[0]?.cvss?.baseSeverity
    }));
    
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  async cveByVendor(vendor, product = '') {
    const cpe = product ? `cpe:2.3:*:${vendor}:${product}:*:*:*:*:*:*:*` : `cpe:2.3:*:${vendor}:*:*:*:*:*:*:*`;
    const data = await this.fetchNVD(`cves/2.0?cpeName=${cpe}&resultsPerPage=20`);
    
    const results = (data.vulnerabilities || []).map(v => ({
      id: v.cve.id,
      description: v.cve.descriptions?.[0]?.value?.substring(0, 150),
      severity: v.cve.metrics?.cvssMetricV31?.[0]?.cvss?.baseScore,
      severityLevel: v.cve.metrics?.cvssMetricV31?.[0]?.cvss?.baseSeverity,
      published: v.cve.published
    }));
    
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  async cveBySeverity(severity, limit = 20) {
    const data = await this.fetchNVD(`cves/2.0?cvssV3Severity=${severity}&resultsPerPage=${limit}`);
    
    const results = (data.vulnerabilities || []).map(v => ({
      id: v.cve.id,
      description: v.cve.descriptions?.[0]?.value?.substring(0, 150),
      severity: v.cve.metrics?.cvssMetricV31?.[0]?.cvss?.baseScore,
      vector: v.cve.metrics?.cvssMetricV31?.[0]?.cvss?.vectorString,
      published: v.cve.published
    }));
    
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  async cveExploitAvailable(limit = 20) {
    const data = await this.fetchNVD(`cves/2.0?hasExploit=true&resultsPerPage=${limit}`);
    
    const results = (data.vulnerabilities || []).map(v => ({
      id: v.cve.id,
      description: v.cve.descriptions?.[0]?.value?.substring(0, 150),
      severity: v.cve.metrics?.cvssMetricV31?.[0]?.cvss?.baseScore,
      severityLevel: v.cve.metrics?.cvssMetricV31?.[0]?.cvss?.baseSeverity,
      hasExploit: true,
      published: v.cve.published
    }));
    
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  async cveTrending(days = 7) {
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch('https://api.cvesearch.com/');
    const data = await response.json();
    
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async cveMetrics(cveId) {
    const data = await this.fetchNVD(`cves/2.0?cveId=${cveId}`);
    const vuln = data.vulnerabilities?.[0]?.cve;
    
    if (!vuln) {
      return { content: [{ type: 'text', text: 'CVE not found' }], isError: true };
    }

    const metrics = {
      cvssv31: vuln.metrics?.cvssMetricV31?.[0]?.cvss,
      cvssv30: vuln.metrics?.cvssMetricV30?.[0]?.cvss,
      cvssv2: vuln.metrics?.cvssMetricV2?.[0]?.cvss,
      epss: vuln.metrics?.epss?.[0]?.epss,
      exploitability: vuln.metrics?.cvssMetricV31?.[0]?.exploitabilitySubscore
    };
    
    return { content: [{ type: 'text', text: JSON.stringify(metrics, null, 2) }] };
  }

  async cveReferences(cveId) {
    const data = await this.fetchNVD(`cves/2.0?cveId=${cveId}`);
    const vuln = data.vulnerabilities?.[0]?.cve;
    
    if (!vuln) {
      return { content: [{ type: 'text', text: 'CVE not found' }], isError: true };
    }

    const references = vuln.references?.map(r => ({
      url: r.url,
      source: r.source,
      tags: r.tags,
      lastSeen: r.lastSeen
    })) || [];
    
    return { content: [{ type: 'text', text: JSON.stringify(references, null, 2) }] };
  }

  async cveCpeMatch(cpe) {
    const data = await this.fetchNVD(`cves/2.0?cpeName=${cpe}&resultsPerPage=20`);
    
    const results = (data.vulnerabilities || []).map(v => ({
      id: v.cve.id,
      description: v.cve.descriptions?.[0]?.value?.substring(0, 150),
      severity: v.cve.metrics?.cvssMetricV31?.[0]?.cvss?.baseScore,
      published: v.cve.published
    }));
    
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('CVE/NVD MCP Server running on stdio');
  }
}

const server = new CVEMCPServer();
server.start();
