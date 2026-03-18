import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class SearchMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'search-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'web_search',
          description: 'Search the web for information',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              numResults: { type: 'number', description: 'Number of results (default 10)' }
            },
            required: ['query']
          }
        },
        {
          name: 'web_fetch',
          description: 'Fetch content from a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to fetch' },
              selector: { type: 'string', description: 'CSS selector for content extraction' }
            },
            required: ['url']
          }
        },
        {
          name: 'web_scrape',
          description: 'Scrape data from web pages',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to scrape' },
              data: { type: 'array', description: 'Fields to extract' }
            },
            required: ['url', 'data']
          }
        },
        {
          name: 'web_screenshots',
          description: 'Take screenshots of web pages',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to screenshot' },
              width: { type: 'number', description: 'Viewport width' },
              height: { type: 'number', description: 'Viewport height' }
            },
            required: ['url']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'web_search':
            return await this.search(args.query, args.numResults);
          case 'web_fetch':
            return await this.fetch(args.url, args.selector);
          case 'web_scrape':
            return await this.scrape(args.url, args.data);
          case 'web_screenshots':
            return await this.screenshot(args.url, args.width, args.height);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async search(query, numResults = 10) {
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    const data = await response.json();
    
    const results = (data.RelatedTopics || []).slice(0, numResults).map(item => ({
      title: item.Text,
      url: item.FirstURL
    }));
    
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  async fetch(url, selector) {
    const { default: fetch } = await import('node-fetch');
    const { JSDOM } = await import('jsdom');
    
    const response = await fetch(url);
    const html = await response.text();
    
    if (selector) {
      const dom = new JSDOM(html);
      const elements = dom.window.document.querySelectorAll(selector);
      const extracted = Array.from(elements).map(el => el.textContent.trim());
      return { content: [{ type: 'text', text: JSON.stringify(extracted, null, 2) }] };
    }
    
    return { content: [{ type: 'text', text: html.substring(0, 10000) }] };
  }

  async scrape(url, data) {
    const { default: fetch } = await import('node-fetch');
    const { JSDOM } = await import('jsdom');
    
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const result = {};
    for (const field of data) {
      const elements = doc.querySelectorAll(field.selector);
      if (field.multiple) {
        result[field.name] = Array.from(elements).map(el => el.textContent.trim());
      } else {
        result[field.name] = elements[0]?.textContent.trim() || null;
      }
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  async screenshot(url, width = 1280, height = 720) {
    return { 
      content: [{ 
        type: 'text', 
        text: `Screenshot tool requires Puppeteer. URL: ${url}` 
      }] 
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Search MCP Server running on stdio');
  }
}

const server = new SearchMCPServer();
server.start();
