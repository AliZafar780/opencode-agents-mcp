#!/usr/bin/env node

import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const app = express();
app.use(express.json());

const SESSIONS = new Map();

class ChatBridgeMCPServer {
  constructor() {
    this.mcpServer = new Server(
      { name: 'chat-bridge-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupTools();
  }

  setupTools() {
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'chat_new_session',
          description: 'Create a new OpenCode session for a chat',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: { type: 'string', description: 'Chat ID (WhatsApp/Telegram)' },
              prompt: { type: 'string', description: 'Initial prompt to run' }
            },
            required: ['chat_id', 'prompt']
          }
        },
        {
          name: 'chat_send_prompt',
          description: 'Send a prompt to an existing chat session',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: { type: 'string', description: 'Chat ID' },
              prompt: { type: 'string', description: 'Prompt to execute' }
            },
            required: ['chat_id', 'prompt']
          }
        },
        {
          name: 'chat_get_status',
          description: 'Get status of a chat session',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: { type: 'string', description: 'Chat ID' }
            },
            required: ['chat_id']
          }
        },
        {
          name: 'chat_list_sessions',
          description: 'List all active chat sessions',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'chat_close_session',
          description: 'Close a chat session',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: { type: 'string', description: 'Chat ID' }
            },
            required: ['chat_id']
          }
        },
        {
          name: 'chat_send_response',
          description: 'Send response back to chat (WhatsApp/Telegram)',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: { type: 'string', description: 'Chat ID' },
              message: { type: 'string', description: 'Response message' },
              platform: { type: 'string', enum: ['whatsapp', 'telegram'], description: 'Platform' }
            },
            required: ['chat_id', 'message', 'platform']
          }
        },
        {
          name: 'whatsapp_send',
          description: 'Send WhatsApp message via Twilio',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient number' },
              message: { type: 'string', description: 'Message' }
            },
            required: ['to', 'message']
          }
        },
        {
          name: 'telegram_send',
          description: 'Send Telegram message',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: { type: 'string', description: 'Chat ID' },
              message: { type: 'string', description: 'Message' }
            },
            required: ['chat_id', 'message']
          }
        }
      ]
    }));

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'chat_new_session':
            return await this.newSession(args.chat_id, args.prompt);
          case 'chat_send_prompt':
            return await this.sendPrompt(args.chat_id, args.prompt);
          case 'chat_get_status':
            return await this.getStatus(args.chat_id);
          case 'chat_list_sessions':
            return await this.listSessions();
          case 'chat_close_session':
            return await this.closeSession(args.chat_id);
          case 'chat_send_response':
            return await this.sendResponse(args.chat_id, args.message, args.platform);
          case 'whatsapp_send':
            return await this.whatsappSend(args.to, args.message);
          case 'telegram_send':
            return await this.telegramSend(args.chat_id, args.message);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async newSession(chatId, prompt) {
    if (SESSIONS.has(chatId)) {
      return { content: [{ type: 'text', text: `Session already exists for ${chatId}` }] };
    }
    
    const session = {
      id: chatId,
      created: new Date().toISOString(),
      status: 'running',
      history: [{ role: 'user', content: prompt }]
    };
    
    SESSIONS.set(chatId, session);
    
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify({ message: `New session created`, session_id: chatId }, null, 2)
      }] 
    };
  }

  async sendPrompt(chatId, prompt) {
    const session = SESSIONS.get(chatId);
    if (!session) {
      return { content: [{ type: 'text', text: 'No session found' }], isError: true };
    }
    
    session.history.push({ role: 'user', content: prompt });
    
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify({ message: 'Processing...', session_id: chatId }, null, 2)
      }] 
    };
  }

  async getStatus(chatId) {
    const session = SESSIONS.get(chatId);
    if (!session) {
      return { content: [{ type: 'text', text: 'No session found' }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(session, null, 2) }] };
  }

  async listSessions() {
    const sessions = Array.from(SESSIONS.values()).map(s => ({
      chat_id: s.id,
      messages: s.history.length
    }));
    return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] };
  }

  async closeSession(chatId) {
    if (SESSIONS.has(chatId)) {
      SESSIONS.delete(chatId);
      return { content: [{ type: 'text', text: `Session ${chatId} closed` }] };
    }
    return { content: [{ type: 'text', text: 'No session found' }], isError: true };
  }

  async sendResponse(chatId, message, platform) {
    if (platform === 'whatsapp') {
      return await this.whatsappSend(chatId, message);
    } else if (platform === 'telegram') {
      return await this.telegramSend(chatId, message);
    }
    return { content: [{ type: 'text', text: 'Unknown platform' }], isError: true };
  }

  async whatsappSend(to, message) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      return { content: [{ type: 'text', text: 'Twilio not configured' }], isError: true };
    }

    const { default: fetch } = await import('node-fetch');
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const formData = new URLSearchParams();
    formData.append('From', process.env.WHATSAPP_FROM || 'whatsapp:+14155238886');
    formData.append('To', to.startsWith('whatsapp:') ? to : `whatsapp:${to}`);
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
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async telegramSend(chatId, message) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return { content: [{ type: 'text', text: 'Telegram not configured' }], isError: true };
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
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async start() {
    const port = process.env.PORT || 3000;
    
    app.post('/webhook/whatsapp', async (req, res) => {
      const message = req.body?.Body || req.body?.message?.body;
      const from = req.body?.From || req.body?.message?.from;
      
      if (from && message) {
        const chatId = from.replace('whatsapp:', '');
        
        if (!SESSIONS.has(chatId)) {
          await this.newSession(chatId, message);
          await this.whatsappSend(from, "🤖 OpenCode Session Started!");
        } else {
          await this.sendPrompt(chatId, message);
          await this.whatsappSend(from, "⏳ Processing...");
        }
      }
      res.send('OK');
    });

    app.post('/webhook/telegram', async (req, res) => {
      const message = req.body?.message?.text;
      const chatId = req.body?.message?.chat?.id;
      
      if (chatId && message) {
        const chatIdStr = chatId.toString();
        
        if (message.startsWith('/start')) {
          await this.newSession(chatIdStr, 'Start');
          await this.telegramSend(chatId, "🤖 OpenCode Session Started!");
        } else if (message.startsWith('/stop')) {
          await this.closeSession(chatIdStr);
          await this.telegramSend(chatId, "👋 Session closed");
        } else if (!SESSIONS.has(chatIdStr)) {
          await this.newSession(chatIdStr, message);
          await this.telegramSend(chatId, "⏳ Processing...");
        } else {
          await this.sendPrompt(chatIdStr, message);
          await this.telegramSend(chatId, "⏳ Processing...");
        }
      }
      res.send('OK');
    });

    app.get('/status', (req, res) => {
      res.json({ sessions: SESSIONS.size });
    });

    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    
    console.error('🤖 Chat Bridge MCP running on stdio');
  }
}

new ChatBridgeMCPServer().start();
