import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class WhatsAppMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'whatsapp-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.WHATSAPP_FROM || '';
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'whatsapp_send',
          description: 'Send a WhatsApp message',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient WhatsApp number (with country code)' },
              message: { type: 'string', description: 'Message to send' }
            },
            required: ['to', 'message']
          }
        },
        {
          name: 'whatsapp_send_media',
          description: 'Send WhatsApp message with media',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient number' },
              message: { type: 'string', description: 'Message text' },
              mediaUrl: { type: 'string', description: 'Media URL (image, video, document)' }
            },
            required: ['to', 'message']
          }
        },
        {
          name: 'whatsapp_webhook_setup',
          description: 'Get webhook setup instructions',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'whatsapp_status',
          description: 'Check WhatsApp API status',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'whatsapp_templates',
          description: 'List WhatsApp message templates',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of templates' }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'whatsapp_send':
            return await this.sendMessage(args.to, args.message);
          case 'whatsapp_send_media':
            return await this.sendMedia(args.to, args.message, args.mediaUrl);
          case 'whatsapp_webhook_setup':
            return await this.webhookSetup();
          case 'whatsapp_status':
            return await this.status();
          case 'whatsapp_templates':
            return await this.listTemplates(args.limit);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async twilioAPI(endpoint, method = 'GET', body = null) {
    if (!this.accountSid || !this.authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN not set');
    }

    const { default: fetch } = await import('node-fetch');
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    
    const options = {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    if (body) {
      const params = new URLSearchParams(body);
      options.body = params.toString();
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}${endpoint}`;
    const response = await fetch(url, options);
    return await response.json();
  }

  async sendMessage(to, message) {
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = this.fromNumber || 'whatsapp:+14155238886';
    
    const body = {
      From: formattedFrom,
      To: formattedTo,
      Body: message
    };

    const data = await this.twilioAPI('/Messages.json', 'POST', body);
    
    if (data.sid) {
      return { content: [{ type: 'text', text: JSON.stringify({ sid: data.sid, status: data.status }, null, 2) }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async sendMedia(to, message, mediaUrl) {
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = this.fromNumber || 'whatsapp:+14155238886';
    
    const body = {
      From: formattedFrom,
      To: formattedTo,
      Body: message,
      MediaUrl: mediaUrl
    };

    const data = await this.twilioAPI('/Messages.json', 'POST', body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async webhookSetup() {
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify({
          instructions: "To receive WhatsApp messages:",
          steps: [
            "1. Set up Twilio WhatsApp sandbox at https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox",
          ],
          env_vars_needed: [
            "TWILIO_ACCOUNT_SID",
            "TWILIO_AUTH_TOKEN", 
            "WHATSAPP_FROM (your Twilio WhatsApp number)"
          ],
          webhook_url: "Configure your OpenCode webhook URL in Twilio console"
        }, null, 2)
      }] 
    };
  }

  async status() {
    const data = await this.twilioAPI('/Messages.json', 'GET');
    return { content: [{ type: 'text', text: JSON.stringify({ account_status: data }, null, 2) }] };
  }

  async listTemplates(limit = 10) {
    return { 
      content: [{ 
        type: 'text', 
        text: "WhatsApp templates require WhatsApp Business API. Use simple messages for now."
      }] 
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('WhatsApp MCP Server running on stdio');
  }
}

const server = new WhatsAppMCPServer();
server.start();
