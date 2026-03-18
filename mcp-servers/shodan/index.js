import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class ShodanMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'shodan-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.apiKey = process.env.SHODAN_API_KEY || '';
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'shodan_host',
          description: 'Get information about a host (IP, hostname)',
          inputSchema: {
            type: 'object',
            properties: {
              host: { type: 'string', description: 'IP address or hostname' },
              history: { type: 'boolean', description: 'Show historical data' }
            },
            required: ['host']
          }
        },
        {
          name: 'shodan_search',
          description: 'Search Shodan for devices/services',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              limit: { type: 'number', description: 'Number of results (default 10)' }
            },
            required: ['query']
          }
        },
        {
          name: 'shodan_dns_lookup',
          description: 'Perform DNS lookup',
          inputSchema: {
            type: 'object',
            properties: {
              hostname: { type: 'string', description: 'Hostname to lookup' }
            },
            required: ['hostname']
          }
        },
        {
          name: 'shodan_dns_reverse',
          description: 'Perform reverse DNS lookup',
          inputSchema: {
            type: 'object',
            properties: {
              ip: { type: 'string', description: 'IP address' }
            },
            required: ['ip']
          }
        },
        {
          name: 'shodan_my_ip',
          description: 'Get your external IP address',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'shodan_scan',
          description: 'Scan an IP/network using Shodan',
          inputSchema: {
            type: 'object',
            properties: {
              ips: { type: 'string', description: 'IP addresses or CIDR' }
            },
            required: ['ips']
          }
        },
        {
          name: 'shodan_vulns',
          description: 'Get vulnerabilities for a host',
          inputSchema: {
            type: 'object',
            properties: {
              host: { type: 'string', description: 'IP address' }
            },
            required: ['host']
          }
        },
        {
          name: 'shodan_honeyscore',
          description: 'Check if IP is a honeypot',
          inputSchema: {
            type: 'object',
            properties: {
              ip: { type: 'string', description: 'IP address to check' }
            },
            required: ['ip']
          }
        },
        {
          name: 'censys_host',
          description: 'Get host information from Censys',
          inputSchema: {
            type: 'object',
            properties: {
              ip: { type: 'string', description: 'IP address' }
            },
            required: ['ip']
          }
        },
        {
          name: 'censys_search',
          description: 'Search Censys for certificates/hosts',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Censys query' },
              resource: { type: 'string', enum: ['hosts', 'certificates'], description: 'Resource type' }
            },
            required: ['query']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'shodan_host':
            return await this.shodanHost(args.host, args.history);
          case 'shodan_search':
            return await this.shodanSearch(args.query, args.limit);
          case 'shodan_dns_lookup':
            return await this.shodanDnsLookup(args.hostname);
          case 'shodan_dns_reverse':
            return await this.shodanDnsReverse(args.ip);
          case 'shodan_my_ip':
            return await this.shodanMyIP();
          case 'shodan_scan':
            return await this.shodanScan(args.ips);
          case 'shodan_vulns':
            return await this.shodanVulns(args.host);
          case 'shodan_honeyscore':
            return await this.shodanHoneyscore(args.ip);
          case 'censys_host':
            return await this.censysHost(args.ip);
          case 'censys_search':
            return await this.censysSearch(args.query, args.resource);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async runShodan(args) {
    if (!this.apiKey) {
      throw new Error('SHODAN_API_KEY not set');
    }
    const cmd = `shodan ${args} --json`;
    const { stdout } = await execAsync(cmd);
    return JSON.parse(stdout);
  }

  async shodanHost(host, history = false) {
    const data = await this.runShodan(`host ${host}${history ? ' --history' : ''}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async shodanSearch(query, limit = 10) {
    const data = await this.runShodan(`search ${query} --limit ${limit}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async shodanDnsLookup(hostname) {
    const data = await this.runShodan(`dns ${hostname}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async shodanDnsReverse(ip) {
    const data = await this.runShodan(`dns --reverse ${ip}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async shodanMyIP() {
    const data = await this.runShodan('myip');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async shodanScan(ips) {
    const data = await this.runShodan(`scan ${ips}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async shodanVulns(host) {
    const data = await this.runShodan(`host ${host} --vulnerabilities`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async shodanHoneyscore(ip) {
    const data = await this.runShodan(`honeyscore ${ip}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async censysHost(ip) {
    const censysApiId = process.env.CENSYS_API_ID;
    const censysApiSecret = process.env.CENSYS_API_SECRET;
    
    if (!censysApiId || !censysApiSecret) {
      return { content: [{ type: 'text', text: 'CENSYS_API_ID and CENSYS_API_SECRET not set' }], isError: true };
    }

    const auth = Buffer.from(`${censysApiId}:${censysApiSecret}`).toString('base64');
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch(`https://censys.io/api/v1/view/ipv4/${ip}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async censysSearch(query, resource = 'hosts') {
    const censysApiId = process.env.CENSYS_API_ID;
    const censysApiSecret = process.env.CENSYS_API_SECRET;
    
    if (!censysApiId || !censysApiSecret) {
      return { content: [{ type: 'text', text: 'CENSYS_API_ID and CENSYS_API_SECRET not set' }], isError: true };
    }

    const auth = Buffer.from(`${censysApiId}:${censysApiSecret}`).toString('base64');
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch(`https://censys.io/api/v1/search/${resource}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, page: 1, fields: ['ip', 'protocols', 'tls', 'location'] })
    });
    
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Shodan/Censys MCP Server running on stdio');
  }
}

const server = new ShodanMCPServer();
server.start();
