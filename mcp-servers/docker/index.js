import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class DockerMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'docker-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'docker_ps',
          description: 'List running containers',
          inputSchema: {
            type: 'object',
            properties: {
              all: { type: 'boolean', description: 'Show all containers' }
            }
          }
        },
        {
          name: 'docker_images',
          description: 'List Docker images',
          inputSchema: {
            type: 'object',
            properties: {
              filter: { type: 'string', description: 'Filter images' }
            }
          }
        },
        {
          name: 'docker_run',
          description: 'Run a new container',
          inputSchema: {
            type: 'object',
            properties: {
              image: { type: 'string', description: 'Image name' },
              name: { type: 'string', description: 'Container name' },
              ports: { type: 'string', description: 'Port mappings' },
              env: { type: 'string', description: 'Environment variables' },
              volumes: { type: 'string', description: 'Volume mounts' },
              detach: { type: 'boolean', description: 'Run in detached mode' },
              command: { type: 'string', description: 'Command to run' }
            },
            required: ['image']
          }
        },
        {
          name: 'docker_exec',
          description: 'Execute command in a running container',
          inputSchema: {
            type: 'object',
            properties: {
              container: { type: 'string', description: 'Container name or ID' },
              command: { type: 'string', description: 'Command to execute' },
              interactive: { type: 'boolean', description: 'Interactive mode' }
            },
            required: ['container', 'command']
          }
        },
        {
          name: 'docker_logs',
          description: 'Get container logs',
          inputSchema: {
            type: 'object',
            properties: {
              container: { type: 'string', description: 'Container name or ID' },
              tail: { type: 'number', description: 'Number of lines to show' },
              follow: { type: 'boolean', description: 'Follow logs' }
            },
            required: ['container']
          }
        },
        {
          name: 'docker_stop',
          description: 'Stop a container',
          inputSchema: {
            type: 'object',
            properties: {
              container: { type: 'string', description: 'Container name or ID' }
            },
            required: ['container']
          }
        },
        {
          name: 'docker_start',
          description: 'Start a container',
          inputSchema: {
            type: 'object',
            properties: {
              container: { type: 'string', description: 'Container name or ID' }
            },
            required: ['container']
          }
        },
        {
          name: 'docker_rm',
          description: 'Remove a container',
          inputSchema: {
            type: 'object',
            properties: {
              container: { type: 'string', description: 'Container name or ID' },
              force: { type: 'boolean', description: 'Force removal' }
            },
            required: ['container']
          }
        },
        {
          name: 'docker_build',
          description: 'Build a Docker image',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Build context path' },
              tag: { type: 'string', description: 'Image tag' },
              dockerfile: { type: 'string', description: 'Dockerfile name' }
            },
            required: ['path', 'tag']
          }
        },
        {
          name: 'docker_pull',
          description: 'Pull an image from registry',
          inputSchema: {
            type: 'object',
            properties: {
              image: { type: 'string', description: 'Image name' }
            },
            required: ['image']
          }
        },
        {
          name: 'docker_push',
          description: 'Push an image to registry',
          inputSchema: {
            type: 'object',
            properties: {
              image: { type: 'string', description: 'Image name' }
            },
            required: ['image']
          }
        },
        {
          name: 'docker_inspect',
          description: 'Inspect a container or image',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Container or image ID' },
              type: { type: 'string', enum: ['container', 'image'] }
            },
            required: ['id', 'type']
          }
        },
        {
          name: 'docker_stats',
          description: 'Get container statistics',
          inputSchema: {
            type: 'object',
            properties: {
              container: { type: 'string', description: 'Container name or ID' },
              stream: { type: 'boolean', description: 'Stream stats' }
            }
          }
        },
        {
          name: 'docker_network_ls',
          description: 'List Docker networks',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'docker_volume_ls',
          description: 'List Docker volumes',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'docker_compose',
          description: 'Run docker-compose commands',
          inputSchema: {
            type: 'object',
            properties: {
              file: { type: 'string', description: 'Compose file path' },
              command: { type: 'string', description: 'up, down, ps, logs' },
              detach: { type: 'boolean', description: 'Detach mode' }
            },
            required: ['command']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'docker_ps':
            return await this.ps(args.all);
          case 'docker_images':
            return await this.images(args.filter);
          case 'docker_run':
            return await this.run(args.image, args.name, args.ports, args.env, args.volumes, args.detach, args.command);
          case 'docker_exec':
            return await this.exec(args.container, args.command, args.interactive);
          case 'docker_logs':
            return await this.logs(args.container, args.tail, args.follow);
          case 'docker_stop':
            return await this.stop(args.container);
          case 'docker_start':
            return await this.start(args.container);
          case 'docker_rm':
            return await this.rm(args.container, args.force);
          case 'docker_build':
            return await this.build(args.path, args.tag, args.dockerfile);
          case 'docker_pull':
            return await this.pull(args.image);
          case 'docker_push':
            return await this.push(args.image);
          case 'docker_inspect':
            return await this.inspect(args.id, args.type);
          case 'docker_stats':
            return await this.stats(args.container, args.stream);
          case 'docker_network_ls':
            return await this.networkLs();
          case 'docker_volume_ls':
            return await this.volumeLs();
          case 'docker_compose':
            return await this.compose(args.file, args.command, args.detach);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async runCmd(cmd) {
    const { stdout, stderr } = await execAsync(cmd);
    return stdout + stderr;
  }

  async ps(all = false) {
    const flag = all ? '-a' : '';
    const output = await this.runCmd(`docker ps ${flag} --format json`);
    const lines = output.trim().split('\n').filter(l => l);
    return { content: [{ type: 'text', text: JSON.stringify(lines.map(l => JSON.parse(l)), null, 2) }] };
  }

  async images(filter) {
    const flag = filter ? `--filter ${filter}` : '';
    const output = await this.runCmd(`docker images ${flag} --format json`);
    const lines = output.trim().split('\n').filter(l => l);
    return { content: [{ type: 'text', text: JSON.stringify(lines.map(l => JSON.parse(l)), null, 2) }] };
  }

  async run(image, name, ports, env, volumes, detach = true, command) {
    let opts = [];
    if (name) opts.push(`--name ${name}`);
    if (ports) opts.push(`-p ${ports}`);
    if (env) opts.push(`-e ${env}`);
    if (volumes) opts.push(`-v ${volumes}`);
    if (detach) opts.push('-d');
    if (command) opts.push(command);
    
    const output = await this.runCmd(`docker run ${opts.join(' ')} ${image}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async exec(container, command, interactive = false) {
    const flag = interactive ? '-it' : '';
    const output = await this.runCmd(`docker exec ${flag} ${container} ${command}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async logs(container, tail, follow = false) {
    const flags = [];
    if (tail) flags.push(`--tail ${tail}`);
    if (follow) flags.push('-f');
    
    const output = await this.runCmd(`docker logs ${flags.join(' ')} ${container}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async stop(container) {
    const output = await this.runCmd(`docker stop ${container}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async start(container) {
    const output = await this.runCmd(`docker start ${container}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async rm(container, force = false) {
    const flag = force ? '-f' : '';
    const output = await this.runCmd(`docker rm ${flag} ${container}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async build(path, tag, dockerfile) {
    const flags = [];
    flags.push(`-t ${tag}`);
    if (dockerfile) flags.push(`-f ${dockerfile}`);
    
    const output = await this.runCmd(`docker build ${flags.join(' ')} ${path}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async pull(image) {
    const output = await this.runCmd(`docker pull ${image}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async push(image) {
    const output = await this.runCmd(`docker push ${image}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async inspect(id, type) {
    const output = await this.runCmd(`docker inspect ${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(JSON.parse(output), null, 2) }] };
  }

  async stats(container, stream = false) {
    const flag = stream ? '--no-stream' : '';
    const output = await this.runCmd(`docker stats ${flag} ${container || ''} --format json`);
    const lines = output.trim().split('\n').filter(l => l);
    return { content: [{ type: 'text', text: JSON.stringify(lines.map(l => JSON.parse(l)), null, 2) }] };
  }

  async networkLs() {
    const output = await this.runCmd('docker network ls --format json');
    const lines = output.trim().split('\n').filter(l => l);
    return { content: [{ type: 'text', text: JSON.stringify(lines.map(l => JSON.parse(l)), null, 2) }] };
  }

  async volumeLs() {
    const output = await this.runCmd('docker volume ls --format json');
    const lines = output.trim().split('\n').filter(l => l);
    return { content: [{ type: 'text', text: JSON.stringify(lines.map(l => JSON.parse(l)), null, 2) }] };
  }

  async compose(file, command, detach = false) {
    const flags = [];
    if (file) flags.push(`-f ${file}`);
    if (detach) flags.push('-d');
    
    const output = await this.runCmd(`docker-compose ${flags.join(' ')} ${command}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Docker MCP Server running on stdio');
  }
}

const server = new DockerMCPServer();
server.start();
