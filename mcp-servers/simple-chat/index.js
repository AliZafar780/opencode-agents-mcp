#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class SimpleChatMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'simple-chat-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'whatsapp_message',
          description: 'Send a WhatsApp message to a phone number',
          inputSchema: {
            type: 'object',
            properties: {
              phone: { type: 'string', description: 'Phone number with country code (e.g., +1234567890)' },
              message: { type: 'string', description: 'Message to send' }
            },
            required: ['phone', 'message']
          }
        },
        {
          name: 'telegram_message',
          description: 'Send a Telegram message to a chat ID',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: { type: 'string', description: 'Telegram chat ID (number or username)' },
              message: { type: 'string', description: 'Message to send' }
            },
            required: ['chat_id', 'message']
          }
        },
        {
          name: 'slack_message',
          description: 'Send a Slack message to a channel or user',
          inputSchema: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel name (e.g., #general) or user ID' },
              message: { type: 'string', description: 'Message to send' }
            },
            required: ['channel', 'message']
          }
        },
        {
          name: 'send_all_platforms',
          description: 'Send message to multiple platforms at once',
          inputSchema: {
            type: 'object',
            properties: {
              whatsapp: { type: 'string', description: 'WhatsApp number (optional)' },
              telegram: { type: 'string', description: 'Telegram chat ID (optional)' },
              slack: { type: 'string', description: 'Slack channel (optional)' },
              message: { type: 'string', description: 'Message to send to all' }
            },
            required: ['message']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'whatsapp_message':
            return await this.sendWhatsApp(args.phone, args.message);
          case 'telegram_message':
            return await this.sendTelegram(args.chat_id, args.message);
          case 'slack_message':
            return await this.sendSlack(args.channel, args.message);
          case 'send_all_platforms':
            return await this.sendAll(args.whatsapp, args.telegram, args.slack, args.message);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async sendWhatsApp(phone, message) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      return { content: [{ type: 'text', text: '⚠️ WhatsApp not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN' }], isError: true };
    }

    const { default: fetch } = await import('node-fetch');
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const formData = new URLSearchParams();
    formData.append('From', process.env.WHATSAPP_FROM || 'whatsapp:+14155238886');
    formData.append('To', `whatsapp:${phone.replace(/^\+/, '')}`);
    formData.append('Body', message);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}` },
        body: formData
      }
    );
    
    const data = await response.json();
    
    if (data.sid) {
      return { content: [{ type: 'text', text: `✅ WhatsApp sent to ${phone}: ${message.substring(0, 50)}...` }] };
    }
    return { content: [{ type: 'text', text: `❌ Failed: ${data.message || 'Unknown error'}` }], isError: true };
  }

  async sendTelegram(chatId, message) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return { content: [{ type: 'text', text: '⚠️ Telegram not configured. Add TELEGRAM_BOT_TOKEN' }], isError: true };
    }

    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
      }
    );
    
    const data = await response.json();
    
    if (data.ok) {
      return { content: [{ type: 'text', text: `✅ Telegram sent to ${chatId}: ${message.substring(0, 50)}...` }] };
    }
    return { content: [{ type: 'text', text: `❌ Failed: ${data.description || 'Unknown error'}` }], isError: true };
  }

  async sendSlack(channel, message) {
    const botToken = process.env.SLACK_BOT_TOKEN;
    
    if (!botToken) {
      return { content: [{ type: 'text', text: '⚠️ Slack not configured. Add SLACK_BOT_TOKEN' }], isError: true };
    }

    const { default: fetch } = await import('node-fetch');
    
    let channelId = channel;
    if (channel.startsWith('#')) {
      channelId = channel.replace('#', '');
    }
    
    const response = await fetch(
      'https://slack.com/api/chat.postMessage',
      {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          channel: channelId, 
          text: message,
          mrkdwn: true
        })
      }
    );
    
    const data = await response.json();
    
    if (data.ok) {
      return { content: [{ type: 'text', text: `✅ Slack sent to #${channelId}: ${message.substring(0, 50)}...` }] };
    }
    return { content: [{ type: 'text', text: `❌ Failed: ${data.error || 'Unknown error'}` }], isError: true };
  }

  async sendAll(whatsapp, telegram, slack, message) {
    const results = [];
    
    if (whatsapp) {
      const r = await this.sendWhatsApp(whatsapp, message);
      results.push(r.content[0].text);
    }
    
    if (telegram) {
      const r = await this.sendTelegram(telegram, message);
      results.push(r.content[0].text);
    }
    
    if (slack) {
      const r = await this.sendSlack(slack, message);
      results.push(r.content[0].text);
    }
    
    if (results.length === 0) {
      return { content: [{ type: 'text', text: '⚠️ No platforms specified. Add whatsapp, telegram, or slack.' }], isError: true };
    }
    
    return { content: [{ type: 'text', text: results.join('\n') }] };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('📱 Simple Chat MCP running on stdio');
  }
}

new SimpleChatMCPServer().start();
