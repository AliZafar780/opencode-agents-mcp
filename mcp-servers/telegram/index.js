import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class TelegramMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'telegram-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'telegram_send_message',
          description: 'Send a message to a Telegram chat',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: { type: 'string', description: 'Chat ID or username' },
              text: { type: 'string', description: 'Message text' },
              parse_mode: { type: 'string', description: 'Parse mode (Markdown, HTML)' }
            },
            required: ['chat_id', 'text']
          }
        },
        {
          name: 'telegram_send_photo',
          description: 'Send a photo to Telegram',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: { type: 'string', description: 'Chat ID' },
              photo: { type: 'string', description: 'Photo URL or file_id' },
              caption: { type: 'string', description: 'Photo caption' }
            },
            required: ['chat_id', 'photo']
          }
        },
        {
          name: 'telegram_send_document',
          description: 'Send a document to Telegram',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: { type: 'string', description: 'Chat ID' },
              document: { type: 'string', description: 'Document URL or file_id' },
              caption: { type: 'string', description: 'Document caption' }
            },
            required: ['chat_id', 'document']
          }
        },
        {
          name: 'telegram_send_inline_keyboard',
          description: 'Send message with inline keyboard',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: { type: 'string', description: 'Chat ID' },
              text: { type: 'string', description: 'Message text' },
              buttons: { type: 'array', description: 'Array of button rows' }
            },
            required: ['chat_id', 'text', 'buttons']
          }
        },
        {
          name: 'telegram_get_updates',
          description: 'Get Telegram updates (messages)',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of updates' },
              timeout: { type: 'number', description: 'Timeout in seconds' }
            }
          }
        },
        {
          name: 'telegram_set_webhook',
          description: 'Set webhook for incoming messages',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Webhook URL' }
            },
            required: ['url']
          }
        },
        {
          name: 'telegram_get_me',
          description: 'Get bot information',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'telegram_create_group',
          description: 'Create a Telegram group',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Group title' },
              users: { type: 'string', description: 'User IDs to add (comma-separated)' }
            },
            required: ['title']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'telegram_send_message':
            return await this.sendMessage(args.chat_id, args.text, args.parse_mode);
          case 'telegram_send_photo':
            return await this.sendPhoto(args.chat_id, args.photo, args.caption);
          case 'telegram_send_document':
            return await this.sendDocument(args.chat_id, args.document, args.caption);
          case 'telegram_send_inline_keyboard':
            return await this.sendInlineKeyboard(args.chat_id, args.text, args.buttons);
          case 'telegram_get_updates':
            return await this.getUpdates(args.limit, args.timeout);
          case 'telegram_set_webhook':
            return await this.setWebhook(args.url);
          case 'telegram_get_me':
            return await this.getMe();
          case 'telegram_create_group':
            return await this.createGroup(args.title, args.users);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async telegramAPI(method, body = null) {
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not set');
    }

    const { default: fetch } = await import('node-fetch');
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/${method}`, options);
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.description || 'Telegram API error');
    }
    
    return data.result;
  }

  async sendMessage(chatId, text, parseMode = null) {
    const body = { chat_id: chatId, text };
    if (parseMode) body.parse_mode = parseMode;
    
    const data = await this.telegramAPI('sendMessage', body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async sendPhoto(chatId, photo, caption = null) {
    const body = { chat_id: chatId, photo };
    if (caption) body.caption = caption;
    
    const data = await this.telegramAPI('sendPhoto', body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async sendDocument(chatId, document, caption = null) {
    const body = { chat_id: chatId, document };
    if (caption) body.caption = caption;
    
    const data = await this.telegramAPI('sendDocument', body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async sendInlineKeyboard(chatId, text, buttons) {
    const keyboard = buttons.map(row => 
      row.map(btn => ({ text: btn.text, url: btn.url || null }))
    );
    
    const body = {
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: keyboard }
    };
    
    const data = await this.telegramAPI('sendMessage', body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async getUpdates(limit = 10, timeout = 0) {
    const data = await this.telegramAPI('getUpdates', { limit, timeout });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async setWebhook(url) {
    const data = await this.telegramAPI('setWebhook', { url });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async getMe() {
    const data = await this.telegramAPI('getMe');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async createGroup(title, users = '') {
    const body = { title };
    if (users) body.users = users;
    
    const data = await this.telegramAPI('createGroupChat', body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Telegram MCP Server running on stdio');
  }
}

const server = new TelegramMCPServer();
server.start();
