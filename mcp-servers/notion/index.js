import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class NotionMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'notion-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.token = process.env.NOTION_API_KEY || '';
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'notion_search',
          description: 'Search pages in Notion',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              limit: { type: 'number', description: 'Number of results' }
            }
          }
        },
        {
          name: 'notion_create_page',
          description: 'Create a new page',
          inputSchema: {
            type: 'object',
            properties: {
              parent: { type: 'string', description: 'Parent page/database ID' },
              title: { type: 'string', description: 'Page title' },
              content: { type: 'string', description: 'Page content (markdown)' }
            },
            required: ['parent', 'title']
          }
        },
        {
          name: 'notion_create_database',
          description: 'Create a database',
          inputSchema: {
            type: 'object',
            properties: {
              parent: { type: 'string', description: 'Parent page ID' },
              name: { type: 'string', description: 'Database name' },
              properties: { type: 'object', description: 'Database properties' }
            },
            required: ['parent', 'name']
          }
        },
        {
          name: 'notion_add_database_entry',
          description: 'Add entry to a database',
          inputSchema: {
            type: 'object',
            properties: {
              database: { type: 'string', description: 'Database ID' },
              properties: { type: 'object', description: 'Entry properties' }
            },
            required: ['database', 'properties']
          }
        },
        {
          name: 'notion_get_page',
          description: 'Get page content',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', description: 'Page ID' }
            },
            required: ['pageId']
          }
        },
        {
          name: 'notion_update_page',
          description: 'Update page properties',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', description: 'Page ID' },
              properties: { type: 'object', description: 'Properties to update' }
            },
            required: ['pageId', 'properties']
          }
        },
        {
          name: 'notion_append_blocks',
          description: 'Add content blocks to a page',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', description: 'Page ID' },
              blocks: { type: 'array', description: 'Blocks to add' }
            },
            required: ['pageId', 'blocks']
          }
        },
        {
          name: 'notion_list_databases',
          description: 'List all databases',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'notion_query_database',
          description: 'Query a database with filters',
          inputSchema: {
            type: 'object',
            properties: {
              databaseId: { type: 'string', description: 'Database ID' },
              filter: { type: 'object', description: 'Filter object' }
            },
            required: ['databaseId']
          }
        },
        {
          name: 'notion_archive_page',
          description: 'Archive a page',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', description: 'Page ID' }
            },
            required: ['pageId']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'notion_search':
            return await this.search(args.query, args.limit);
          case 'notion_create_page':
            return await this.createPage(args.parent, args.title, args.content);
          case 'notion_create_database':
            return await this.createDatabase(args.parent, args.name, args.properties);
          case 'notion_add_database_entry':
            return await this.addDatabaseEntry(args.database, args.properties);
          case 'notion_get_page':
            return await this.getPage(args.pageId);
          case 'notion_update_page':
            return await this.updatePage(args.pageId, args.properties);
          case 'notion_append_blocks':
            return await this.appendBlocks(args.pageId, args.blocks);
          case 'notion_list_databases':
            return await this.listDatabases();
          case 'notion_query_database':
            return await this.queryDatabase(args.databaseId, args.filter);
          case 'notion_archive_page':
            return await this.archivePage(args.pageId);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async notionAPI(endpoint, method = 'POST', body = null) {
    if (!this.token) {
      throw new Error('NOTION_API_KEY not set');
    }

    const { default: fetch } = await import('node-fetch');
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`https://api.notion.com/v1/${endpoint}`, options);
    const data = await response.json();
    
    if (data.object === 'error') {
      throw new Error(data.message || 'Notion API error');
    }
    
    return data;
  }

  async search(query = '', limit = 10) {
    const data = await this.notionAPI('search', 'POST', {
      query,
      filter: { value: 'page', property: 'object' },
      page_size: limit
    });
    return { content: [{ type: 'text', text: JSON.stringify(data.results, null, 2) }] };
  }

  async createPage(parent, title, content = '') {
    const body = {
      parent: { page_id: parent },
      properties: {
        title: { title: [{ text: { content: title } }] }
      }
    };

    if (content) {
      body.children = this.markdownToBlocks(content);
    }

    const data = await this.notionAPI('pages', 'POST', body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async createDatabase(parent, name, properties = {}) {
    const body = {
      parent: { page_id: parent },
      title: [{ text: { content: name } }],
      properties: {
        Name: { title: {} },
        ...properties
      }
    };

    const data = await this.notionAPI('databases', 'POST', body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async addDatabaseEntry(databaseId, properties) {
    const body = {
      parent: { database_id: databaseId },
      properties
    };

    const data = await this.notionAPI('pages', 'POST', body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async getPage(pageId) {
    const [page, blocks] = await Promise.all([
      this.notionAPI(`pages/${pageId}`),
      this.notionAPI(`blocks/${pageId}/children`)
    ]);
    return { content: [{ type: 'text', text: JSON.stringify({ page, blocks: blocks.results }, null, 2) }] };
  }

  async updatePage(pageId, properties) {
    const data = await this.notionAPI(`pages/${pageId}`, 'PATCH', { properties });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async appendBlocks(pageId, blocks) {
    const data = await this.notionAPI(`blocks/${pageId}/children`, 'PATCH', { children: blocks });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async listDatabases() {
    const data = await this.notionAPI('search', 'POST', {
      filter: { value: 'database', property: 'object' },
      page_size: 100
    });
    return { content: [{ type: 'text', text: JSON.stringify(data.results, null, 2) }] };
  }

  async queryDatabase(databaseId, filter = {}) {
    const body = filter ? { filter } : {};
    const data = await this.notionAPI(`databases/${databaseId}/query`, 'POST', body);
    return { content: [{ type: 'text', text: JSON.stringify(data.results, null, 2) }] };
  }

  async archivePage(pageId) {
    const data = await this.notionAPI(`pages/${pageId}`, 'PATCH', { archived: true });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  markdownToBlocks(markdown) {
    const lines = markdown.split('\n');
    return lines.map(line => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: line } }]
      }
    }));
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Notion MCP Server running on stdio');
  }
}

const server = new NotionMCPServer();
server.start();
