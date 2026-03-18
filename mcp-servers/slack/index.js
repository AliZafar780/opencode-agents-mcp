import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class SlackMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'slack-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.token = process.env.SLACK_BOT_TOKEN || '';
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'slack_send_message',
          description: 'Send a message to a Slack channel',
          inputSchema: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel ID or name' },
              text: { type: 'string', description: 'Message text' },
              blocks: { type: 'array', description: 'Slack block kit JSON' }
            },
            required: ['channel', 'text']
          }
        },
        {
          name: 'slack_send_dm',
          description: 'Send a direct message to a user',
          inputSchema: {
            type: 'object',
            properties: {
              user: { type: 'string', description: 'User ID or email' },
              text: { type: 'string', description: 'Message text' }
            },
            required: ['user', 'text']
          }
        },
        {
          name: 'slack_list_channels',
          description: 'List Slack channels',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of channels' }
            }
          }
        },
        {
          name: 'slack_list_users',
          description: 'List Slack workspace users',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of users' }
            }
          }
        },
        {
          name: 'slack_create_channel',
          description: 'Create a new Slack channel',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Channel name' },
              isPrivate: { type: 'boolean', description: 'Private channel' }
            },
            required: ['name']
          }
        },
        {
          name: 'slack_archive_channel',
          description: 'Archive a Slack channel',
          inputSchema: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel ID' }
            },
            required: ['channel']
          }
        },
        {
          name: 'slack_add_reaction',
          description: 'Add a reaction to a message',
          inputSchema: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel ID' },
              message: { type: 'string', description: 'Message TS' },
              emoji: { type: 'string', description: 'Emoji name' }
            },
            required: ['channel', 'message', 'emoji']
          }
        },
        {
          name: 'slack_schedule_message',
          description: 'Schedule a message for later',
          inputSchema: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel ID' },
              text: { type: 'string', description: 'Message text' },
              postAt: { type: 'string', description: 'Unix timestamp' }
            },
            required: ['channel', 'text', 'postAt']
          }
        },
        {
          name: 'slack_webhook',
          description: 'Send a message via webhook',
          inputSchema: {
            type: 'object',
            properties: {
              webhookUrl: { type: 'string', description: 'Webhook URL' },
              text: { type: 'string', description: 'Message text' }
            },
            required: ['webhookUrl', 'text']
          }
        },
        {
          name: 'slack_files_upload',
          description: 'Upload a file to Slack',
          inputSchema: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel ID' },
              file: { type: 'string', description: 'File path' },
              title: { type: 'string', description: 'File title' }
            },
            required: ['channel', 'file']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'slack_send_message':
            return await this.sendMessage(args.channel, args.text, args.blocks);
          case 'slack_send_dm':
            return await this.sendDM(args.user, args.text);
          case 'slack_list_channels':
            return await this.listChannels(args.limit);
          case 'slack_list_users':
            return await this.listUsers(args.limit);
          case 'slack_create_channel':
            return await this.createChannel(args.name, args.isPrivate);
          case 'slack_archive_channel':
            return await this.archiveChannel(args.channel);
          case 'slack_add_reaction':
            return await this.addReaction(args.channel, args.message, args.emoji);
          case 'slack_schedule_message':
            return await this.scheduleMessage(args.channel, args.text, args.postAt);
          case 'slack_webhook':
            return await this.webhook(args.webhookUrl, args.text);
          case 'slack_files_upload':
            return await this.uploadFile(args.channel, args.file, args.title);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async slackAPI(method, body = {}) {
    if (!this.token) {
      throw new Error('SLACK_BOT_TOKEN not set');
    }

    const { default: fetch } = await import('node-fetch');
    const response = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Slack API error');
    }
    return data;
  }

  async sendMessage(channel, text, blocks = null) {
    const body = { channel, text };
    if (blocks) body.blocks = blocks;
    const data = await this.slackAPI('chat.postMessage', body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async sendDM(user, text) {
    const userData = await this.slackAPI('users.lookupByEmail', { email: user });
    const userId = userData.user?.id || user;
    return await this.sendMessage(userId, text);
  }

  async listChannels(limit = 100) {
    const data = await this.slackAPI('conversations.list', { limit, types: 'public_channel,private_channel' });
    return { content: [{ type: 'text', text: JSON.stringify(data.channels, null, 2) }] };
  }

  async listUsers(limit = 100) {
    const data = await this.slackAPI('users.list', { limit });
    return { content: [{ type: 'text', text: JSON.stringify(data.members, null, 2) }] };
  }

  async createChannel(name, isPrivate = false) {
    const data = await this.slackAPI('conversations.create', { name, is_private: isPrivate });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async archiveChannel(channel) {
    const data = await this.slackAPI('conversations.archive', { channel });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async addReaction(channel, message, emoji) {
    const data = await this.slackAPI('reactions.add', { channel, timestamp: message, name: emoji });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async scheduleMessage(channel, text, postAt) {
    const data = await this.slackAPI('chat.scheduleMessage', { channel, text, post_at: postAt });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async webhook(webhookUrl, text) {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return { content: [{ type: 'text', text: 'Message sent via webhook' }] };
  }

  async uploadFile(channel, filePath, title) {
    const fs = await import('fs');
    const { default: fetch } = await import('node-fetch');

    const formData = new FormData();
    formData.append('file', fs.default.createReadStream(filePath));
    formData.append('channels', channel);
    if (title) formData.append('title', title);

    const response = await fetch('https://slack.com/api/files.upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
      body: formData
    });

    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Slack MCP Server running on stdio');
  }
}

const server = new SlackMCPServer();
server.start();
