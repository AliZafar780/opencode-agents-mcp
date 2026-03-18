import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';

const FILESYSTEM_ALLOWED_DIRECTORIES = ['/home/aliz'];

class FilesystemMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'filesystem-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'read_file',
          description: 'Read contents of a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the file' },
              offset: { type: 'number', description: 'Line offset to start reading' },
              limit: { type: 'number', description: 'Number of lines to read' }
            },
            required: ['path']
          }
        },
        {
          name: 'write_file',
          description: 'Write content to a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the file' },
              content: { type: 'string', description: 'Content to write' }
            },
            required: ['path', 'content']
          }
        },
        {
          name: 'list_directory',
          description: 'List contents of a directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to directory' }
            },
            required: ['path']
          }
        },
        {
          name: 'create_directory',
          description: 'Create a new directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path for new directory' }
            },
            required: ['path']
          }
        },
        {
          name: 'delete_file',
          description: 'Delete a file or directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to delete' },
              recursive: { type: 'boolean', description: 'Delete recursively' }
            },
            required: ['path']
          }
        },
        {
          name: 'move_path',
          description: 'Move or rename a file or directory',
          inputSchema: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source path' },
              destination: { type: 'string', description: 'Destination path' }
            },
            required: ['source', 'destination']
          }
        },
        {
          name: 'copy_path',
          description: 'Copy a file or directory',
          inputSchema: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source path' },
              destination: { type: 'string', description: 'Destination path' }
            },
            required: ['source', 'destination']
          }
        },
        {
          name: 'get_file_info',
          description: 'Get information about a file or directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to file or directory' }
            },
            required: ['path']
          }
        },
        {
          name: 'search_files',
          description: 'Search for files matching a pattern',
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Directory to search' },
              pattern: { type: 'string', description: 'Glob pattern to match' }
            },
            required: ['directory', 'pattern']
          }
        },
        {
          name: 'search_content',
          description: 'Search for content within files',
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Directory to search' },
              query: { type: 'string', description: 'Text to search for' },
              filePattern: { type: 'string', description: 'File pattern to match' }
            },
            required: ['directory', 'query']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'read_file':
            return await this.readFile(args.path, args.offset, args.limit);
          case 'write_file':
            return await this.writeFile(args.path, args.content);
          case 'list_directory':
            return await this.listDirectory(args.path);
          case 'create_directory':
            return await this.createDirectory(args.path);
          case 'delete_file':
            return await this.deleteFile(args.path, args.recursive);
          case 'move_path':
            return await this.movePath(args.source, args.destination);
          case 'copy_path':
            return await this.copyPath(args.source, args.destination);
          case 'get_file_info':
            return await this.getFileInfo(args.path);
          case 'search_files':
            return await this.searchFiles(args.directory, args.pattern);
          case 'search_content':
            return await this.searchContent(args.directory, args.query, args.filePattern);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  isPathAllowed(filePath) {
    const normalized = path.normalize(filePath);
    return FILESYSTEM_ALLOWED_DIRECTORIES.some(dir => normalized.startsWith(dir));
  }

  async readFile(filePath, offset, limit) {
    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: Path not allowed');
    }
    let content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    if (offset !== undefined) {
      lines.splice(0, offset);
    }
    if (limit !== undefined) {
      lines.splice(limit);
    }
    
    content = lines.join('\n');
    return { content: [{ type: 'text', text: content }] };
  }

  async writeFile(filePath, content) {
    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: Path not allowed');
    }
    await fs.writeFile(filePath, content, 'utf-8');
    return { content: [{ type: 'text', text: `File written: ${filePath}` }] };
  }

  async listDirectory(dirPath) {
    if (!this.isPathAllowed(dirPath)) {
      throw new Error('Access denied: Path not allowed');
    }
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result = entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file'
    }));
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  async createDirectory(dirPath) {
    if (!this.isPathAllowed(dirPath)) {
      throw new Error('Access denied: Path not allowed');
    }
    await fs.mkdir(dirPath, { recursive: true });
    return { content: [{ type: 'text', text: `Directory created: ${dirPath}` }] };
  }

  async deleteFile(filePath, recursive = false) {
    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: Path not allowed');
    }
    if (recursive) {
      await fs.rm(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }
    return { content: [{ type: 'text', text: `Deleted: ${filePath}` }] };
  }

  async movePath(source, destination) {
    if (!this.isPathAllowed(source) || !this.isPathAllowed(destination)) {
      throw new Error('Access denied: Path not allowed');
    }
    await fs.rename(source, destination);
    return { content: [{ type: 'text', text: `Moved: ${source} -> ${destination}` }] };
  }

  async copyPath(source, destination) {
    if (!this.isPathAllowed(source) || !this.isPathAllowed(destination)) {
      throw new Error('Access denied: Path not allowed');
    }
    const stats = await fs.stat(source);
    if (stats.isDirectory()) {
      await this.copyDirectory(source, destination);
    } else {
      await fs.copyFile(source, destination);
    }
    return { content: [{ type: 'text', text: `Copied: ${source} -> ${destination}` }] };
  }

  async copyDirectory(source, destination) {
    await fs.mkdir(destination, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async getFileInfo(filePath) {
    if (!this.isPathAllowed(filePath)) {
      throw new Error('Access denied: Path not allowed');
    }
    const stats = await fs.stat(filePath);
    const info = {
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
    return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
  }

  async searchFiles(directory, pattern) {
    if (!this.isPathAllowed(directory)) {
      throw new Error('Access denied: Path not allowed');
    }
    const matches = await this.glob(directory, pattern);
    return { content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }] };
  }

  async glob(dir, pattern) {
    const results = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await this.glob(fullPath, pattern));
      } else if (regex.test(entry.name)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  async searchContent(directory, query, filePattern = '*') {
    if (!this.isPathAllowed(directory)) {
      throw new Error('Access denied: Path not allowed');
    }
    const results = [];
    const regex = new RegExp(query, 'gi');
    const fileRegex = new RegExp(filePattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    
    await this.searchInDir(directory, regex, fileRegex, results);
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  async searchInDir(dir, regex, fileRegex, results) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.searchInDir(fullPath, regex, fileRegex, results);
      } else if (fileRegex.test(entry.name)) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              results.push({ file: fullPath, line: i + 1, content: lines[i].trim() });
            }
          }
        } catch (e) {
          // Skip binary files
        }
      }
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Filesystem MCP Server running on stdio');
  }
}

const server = new FilesystemMCPServer();
server.start();
