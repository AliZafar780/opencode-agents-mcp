import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class BurpMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'burp-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.burpApiUrl = process.env.BURP_API_URL || 'http://127.0.0.1:8080';
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'burp_scan',
          description: 'Start a new Burp Suite scan',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target URL to scan' },
              scanType: { type: 'string', enum: ['crawl', 'audit', 'crawl_and_audit'], description: 'Scan type' }
            },
            required: ['target']
          }
        },
        {
          name: 'burp_spider',
          description: 'Start spidering a target',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target URL to spider' }
            },
            required: ['target']
          }
        },
        {
          name: 'burp_active_scan',
          description: 'Start active scanning',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target URL' },
              insertionPoint: { type: 'string', description: 'Insertion point type' }
            },
            required: ['target']
          }
        },
        {
          name: 'burp_scan_status',
          description: 'Get scan status',
          inputSchema: {
            type: 'object',
            properties: {
              scanId: { type: 'number', description: 'Scan ID' }
            },
            required: ['scanId']
          }
        },
        {
          name: 'burp_scan_issues',
          description: 'Get issues from a scan',
          inputSchema: {
            type: 'object',
            properties: {
              scanId: { type: 'number', description: 'Scan ID' },
              severity: { type: 'string', description: 'Filter by severity' }
            },
            required: ['scanId']
          }
        },
        {
          name: 'burp_proxy',
          description: 'Configure proxy settings',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['status', 'listeners', 'options'], description: 'Proxy action' }
            }
          }
        },
        {
          name: 'burp_request',
          description: 'Send a request through Burp proxy',
          inputSchema: {
            type: 'object',
            properties: {
              method: { type: 'string', description: 'HTTP method' },
              url: { type: 'string', description: 'Target URL' },
              headers: { type: 'object', description: 'Request headers' },
              body: { type: 'string', description: 'Request body' }
            },
            required: ['method', 'url']
          }
        },
        {
          name: 'burp_target_scope',
          description: 'Manage target scope',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['add', 'remove', 'list'], description: 'Scope action' },
              url: { type: 'string', description: 'URL to add/remove' },
              exclude: { type: 'boolean', description: 'Exclude from scope' }
            },
            required: ['action']
          }
        },
        {
          name: 'burp_sitemap',
          description: 'Get sitemap for a target',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target domain' }
            },
            required: ['target']
          }
        },
        {
          name: 'burp_reports',
          description: 'Generate Burp report',
          inputSchema: {
            type: 'object',
            properties: {
              scanId: { type: 'number', description: 'Scan ID' },
              format: { type: 'string', enum: ['HTML', 'XML', 'JSON'], description: 'Report format' },
              output: { type: 'string', description: 'Output file path' }
            },
            required: ['scanId', 'format']
          }
        },
        {
          name: 'burp_extensions',
          description: 'Manage Burp extensions',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['list', 'load', 'unload'], description: 'Extension action' },
              path: { type: 'string', description: 'Extension JAR path' }
            },
            required: ['action']
          }
        },
        {
          name: 'burp_intruder',
          description: 'Configure and run Intruder attacks',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['configure', 'attack', 'results'], description: 'Intruder action' },
              template: { type: 'string', description: 'Request template' },
              payloads: { type: 'array', description: 'Payload positions' }
            },
            required: ['action']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'burp_scan':
            return await this.burpScan(args.target, args.scanType);
          case 'burp_spider':
            return await this.burpSpider(args.target);
          case 'burp_active_scan':
            return await this.burpActiveScan(args.target, args.insertionPoint);
          case 'burp_scan_status':
            return await this.burpScanStatus(args.scanId);
          case 'burp_scan_issues':
            return await this.burpScanIssues(args.scanId, args.severity);
          case 'burp_proxy':
            return await this.burpProxy(args.action);
          case 'burp_request':
            return await this.burpRequest(args.method, args.url, args.headers, args.body);
          case 'burp_target_scope':
            return await this.burpTargetScope(args.action, args.url, args.exclude);
          case 'burp_sitemap':
            return await this.burpSitemap(args.target);
          case 'burp_reports':
            return await this.burpReports(args.scanId, args.format, args.output);
          case 'burp_extensions':
            return await this.burpExtensions(args.action, args.path);
          case 'burp_intruder':
            return await this.burpIntruder(args.action, args.template, args.payloads);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async burpApiCall(endpoint, method = 'GET', body = null) {
    const { default: fetch } = await import('node-fetch');
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    
    try {
      const response = await fetch(`${this.burpApiUrl}${endpoint}`, options);
      return await response.json();
    } catch (e) {
      return { error: 'Burp API not available. Make sure Burp is running with REST API enabled.' };
    }
  }

  async burpScan(target, scanType = 'crawl_and_audit') {
    const data = await this.burpApiCall('/burpsuite/scan/v1/scans', 'POST', {
      urls: [target],
      scanType
    });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async burpSpider(target) {
    const data = await this.burpApiCall('/burpsuite/spider/v1/start', 'POST', {
      url: target
    });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async burpActiveScan(target, insertionPoint = 'URL') {
    const data = await this.burpApiCall('/burpsuite/scanner/v1/active_scan/start', 'POST', {
      urls: [target],
      insertionPointTypes: [insertionPoint]
    });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async burpScanStatus(scanId) {
    const data = await this.burpApiCall(`/burpsuite/scan/v1/scans/${scanId}/status`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async burpScanIssues(scanId, severity) {
    const data = await this.burpApiCall(`/burpsuite/scan/v1/scans/${scanId}/issues`);
    let issues = data.issues || [];
    
    if (severity) {
      issues = issues.filter(i => i.severity.toLowerCase() === severity.toLowerCase());
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }] };
  }

  async burpProxy(action) {
    let data;
    switch (action) {
      case 'status':
        data = await this.burpApiCall('/burpsuite/proxy/v1/status');
        break;
      case 'listeners':
        data = await this.burpApiCall('/burpsuite/proxy/v1/listeners');
        break;
      case 'options':
        data = await this.burpApiCall('/burpsuite/proxy/v1/options');
        break;
      default:
        data = { error: 'Unknown action' };
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async burpRequest(method, url, headers = {}, body = '') {
    const data = await this.burpApiCall('/burpsuite/httppy/v1/request', 'POST', {
      method,
      url,
      headers,
      body
    });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async burpTargetScope(action, url, exclude = false) {
    let data;
    switch (action) {
      case 'add':
        data = await this.burpApiCall('/burpsuite/target/v1/scope', 'POST', {
          url,
          exclude,
          add: true
        });
        break;
      case 'remove':
        data = await this.burpApiCall('/burpsuite/target/v1/scope', 'POST', {
          url,
          exclude,
          add: false
        });
        break;
      case 'list':
        data = await this.burpApiCall('/burpsuite/target/v1/scope');
        break;
      default:
        data = { error: 'Unknown action' };
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async burpSitemap(target) {
    const data = await this.burpApiCall(`/burpsuite/target/v1/sitemap?domain=${encodeURIComponent(target)}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async burpReports(scanId, format, output) {
    const data = await this.burpApiCall('/burpsuite/scan/v1/report', 'POST', {
      scanId,
      format,
      path: output
    });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async burpExtensions(action, path) {
    let data;
    switch (action) {
      case 'list':
        data = await this.burpApiCall('/burpsuite/extensions/v1/list');
        break;
      case 'load':
        data = await this.burpApiCall('/burpsuite/extensions/v1/load', 'POST', { path });
        break;
      case 'unload':
        data = { error: 'Unload requires extension name or ID' };
        break;
      default:
        data = { error: 'Unknown action' };
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async burpIntruder(action, template, payloads) {
    let data;
    switch (action) {
      case 'configure':
        data = await this.burpApiCall('/burpsuite/intruder/v1/configure', 'POST', {
          template,
          payloadPositions: payloads
        });
        break;
      case 'attack':
        data = await this.burpApiCall('/burpsuite/intruder/v1/attack', 'POST', {});
        break;
      case 'results':
        data = await this.burpApiCall('/burpsuite/intruder/v1/results');
        break;
      default:
        data = { error: 'Unknown action' };
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }];
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Burp Suite MCP Server running on stdio');
  }
}

const server = new BurpMCPServer();
server.start();
