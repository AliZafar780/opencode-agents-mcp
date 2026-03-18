import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class TerminalMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'terminal-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'terminal_exec',
          description: 'Execute a shell command',
          inputSchema: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Command to execute' },
              cwd: { type: 'string', description: 'Working directory' },
              timeout: { type: 'number', description: 'Timeout in milliseconds' },
              env: { type: 'object', description: 'Environment variables' }
            },
            required: ['command']
          }
        },
        {
          name: 'terminal_script',
          description: 'Execute a script file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to script file' },
              args: { type: 'array', description: 'Script arguments' },
              interpreter: { type: 'string', description: 'Script interpreter' }
            },
            required: ['path']
          }
        },
        {
          name: 'terminal_background',
          description: 'Start a process in the background',
          inputSchema: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Command to run' },
              cwd: { type: 'string', description: 'Working directory' },
              name: { type: 'string', description: 'Process name for tracking' }
            },
            required: ['command']
          }
        },
        {
          name: 'terminal_list',
          description: 'List running background processes',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'terminal_kill',
          description: 'Kill a background process',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Process name or PID' }
            },
            required: ['name']
          }
        },
        {
          name: 'terminal_output',
          description: 'Get output from a background process',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Process name' }
            },
            required: ['name']
          }
        },
        {
          name: 'terminal_env',
          description: 'Get or set environment variables',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['get', 'set', 'list'], description: 'Action to perform' },
              key: { type: 'string', description: 'Variable name' },
              value: { type: 'string', description: 'Variable value' }
            },
            required: ['action']
          }
        },
        {
          name: 'terminal_grep',
          description: 'Search for patterns in files',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'Search pattern' },
              path: { type: 'string', description: 'Directory to search' },
              options: { type: 'string', description: 'grep options' }
            },
            required: ['pattern', 'path']
          }
        },
        {
          name: 'terminal_find',
          description: 'Find files by name',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'File name pattern' },
              path: { type: 'string', description: 'Directory to search' },
              type: { type: 'string', description: 'Type: f (file), d (directory)' }
            },
            required: ['name', 'path']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'terminal_exec':
            return await this.exec(args.command, args.cwd, args.timeout, args.env);
          case 'terminal_script':
            return await this.script(args.path, args.args, args.interpreter);
          case 'terminal_background':
            return await this.background(args.command, args.cwd, args.name);
          case 'terminal_list':
            return await this.list();
          case 'terminal_kill':
            return await this.kill(args.name);
          case 'terminal_output':
            return await this.output(args.name);
          case 'terminal_env':
            return await this.env(args.action, args.key, args.value);
          case 'terminal_grep':
            return await this.grep(args.pattern, args.path, args.options);
          case 'terminal_find':
            return await this.find(args.name, args.path, args.type);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async exec(command, cwd, timeout = 30000, env = {}) {
    const options = { 
      cwd: cwd || process.cwd(),
      timeout,
      env: { ...process.env, ...env },
      maxBuffer: 10 * 1024 * 1024
    };
    
    const { stdout, stderr } = await execAsync(command, options);
    
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify({ stdout, stderr }, null, 2) 
      }] 
    };
  }

  async script(path, args = [], interpreter) {
    const cmd = interpreter 
      ? `${interpreter} ${path} ${args.join(' ')}`
      : path;
    return await this.exec(cmd);
  }

  async background(command, cwd, name) {
    const nameStr = name || `process_${Date.now()}`;
    const child = exec(command, { cwd: cwd || process.cwd() });
    
    const processInfo = {
      pid: child.pid,
      name: nameStr,
      command,
      startTime: Date.now(),
      output: ''
    };
    
    child.stdout.on('data', (data) => { processInfo.output += data; });
    child.stderr.on('data', (data) => { processInfo.output += data; });
    
    return { 
      content: [{ 
        type: 'text', 
        text: `Started background process: ${nameStr} (PID: ${child.pid})` 
      }] 
    };
  }

  async list() {
    return { content: [{ type: 'text', text: 'No tracked background processes' }] };
  }

  async kill(nameOrPid) {
    try {
      const pid = parseInt(nameOrPid) || null;
      if (pid) {
        process.kill(pid);
      }
      return { content: [{ type: 'text', text: `Process killed: ${nameOrPid}` }] };
    } catch (e) {
      throw new Error(`Failed to kill process: ${e.message}`);
    }
  }

  async output(name) {
    return { content: [{ type: 'text', text: 'Process output not available' }] };
  }

  async env(action, key, value) {
    switch (action) {
      case 'get':
        return { content: [{ type: 'text', text: process.env[key] || '' }] };
      case 'set':
        process.env[key] = value;
        return { content: [{ type: 'text', text: `Set ${key}=${value}` }] };
      case 'list':
        return { content: [{ type: 'text', text: JSON.stringify(process.env, null, 2) }] };
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async grep(pattern, path, options = '') {
    const cmd = `grep -r ${options} "${pattern}" ${path}`;
    return await this.exec(cmd);
  }

  async find(name, path, type = 'f') {
    const cmd = `find ${path} -type ${type} -name "${name}"`;
    return await this.exec(cmd);
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Terminal MCP Server running on stdio');
  }
}

const server = new TerminalMCPServer();
server.start();
