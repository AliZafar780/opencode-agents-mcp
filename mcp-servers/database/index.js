import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import pg from 'pg';
import mysql from 'mysql2/promise';
import sqlite3 from 'better-sqlite3';

class DatabaseMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'database-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.connections = new Map();
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'db_connect',
          description: 'Connect to a database (PostgreSQL, MySQL, or SQLite)',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Connection name' },
              type: { type: 'string', enum: ['postgresql', 'mysql', 'sqlite'], description: 'Database type' },
              config: { type: 'object', description: 'Database configuration' }
            },
            required: ['name', 'type', 'config']
          }
        },
        {
          name: 'db_disconnect',
          description: 'Disconnect from a database',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Connection name' }
            },
            required: ['name']
          }
        },
        {
          name: 'db_query',
          description: 'Execute a SQL query',
          inputSchema: {
            type: 'object',
            properties: {
              connection: { type: 'string', description: 'Connection name' },
              query: { type: 'string', description: 'SQL query to execute' },
              params: { type: 'array', description: 'Query parameters' }
            },
            required: ['connection', 'query']
          }
        },
        {
          name: 'db_execute',
          description: 'Execute a SQL statement (INSERT, UPDATE, DELETE)',
          inputSchema: {
            type: 'object',
            properties: {
              connection: { type: 'string', description: 'Connection name' },
              statement: { type: 'string', description: 'SQL statement' },
              params: { type: 'array', description: 'Statement parameters' }
            },
            required: ['connection', 'statement']
          }
        },
        {
          name: 'db_list_tables',
          description: 'List all tables in a database',
          inputSchema: {
            type: 'object',
            properties: {
              connection: { type: 'string', description: 'Connection name' }
            },
            required: ['connection']
          }
        },
        {
          name: 'db_describe_table',
          description: 'Get table schema information',
          inputSchema: {
            type: 'object',
            properties: {
              connection: { type: 'string', description: 'Connection name' },
              table: { type: 'string', description: 'Table name' }
            },
            required: ['connection', 'table']
          }
        },
        {
          name: 'db_list_connections',
          description: 'List all active database connections',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'db_transaction',
          description: 'Execute multiple statements in a transaction',
          inputSchema: {
            type: 'object',
            properties: {
              connection: { type: 'string', description: 'Connection name' },
              statements: { type: 'array', description: 'SQL statements to execute' }
            },
            required: ['connection', 'statements']
          }
        },
        {
          name: 'db_backup',
          description: 'Create a database backup',
          inputSchema: {
            type: 'object',
            properties: {
              connection: { type: 'string', description: 'Connection name' },
              outputPath: { type: 'string', description: 'Output file path' }
            },
            required: ['connection', 'outputPath']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'db_connect':
            return await this.connect(args.name, args.type, args.config);
          case 'db_disconnect':
            return await this.disconnect(args.name);
          case 'db_query':
            return await this.query(args.connection, args.query, args.params);
          case 'db_execute':
            return await this.execute(args.connection, args.statement, args.params);
          case 'db_list_tables':
            return await this.listTables(args.connection);
          case 'db_describe_table':
            return await this.describeTable(args.connection, args.table);
          case 'db_list_connections':
            return await this.listConnections();
          case 'db_transaction':
            return await this.transaction(args.connection, args.statements);
          case 'db_backup':
            return await this.backup(args.connection, args.outputPath);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async connect(name, type, config) {
    let connection;
    
    switch (type) {
      case 'postgresql':
        connection = new pg.Pool(config);
        connection.type = 'postgresql';
        break;
      case 'mysql':
        connection = await mysql.createPool(config);
        connection.type = 'mysql';
        break;
      case 'sqlite':
        connection = new sqlite3(config.database);
        connection.type = 'sqlite';
        break;
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
    
    this.connections.set(name, connection);
    return { content: [{ type: 'text', text: `Connected to ${type} database: ${name}` }] };
  }

  async disconnect(name) {
    const conn = this.connections.get(name);
    if (!conn) {
      throw new Error(`Connection not found: ${name}`);
    }
    
    if (conn.type === 'postgresql') {
      await conn.end();
    } else if (conn.type === 'mysql') {
      await conn.end();
    } else if (conn.type === 'sqlite') {
      conn.close();
    }
    
    this.connections.delete(name);
    return { content: [{ type: 'text', text: `Disconnected: ${name}` }] };
  }

  async query(connectionName, query, params = []) {
    const conn = this.connections.get(connectionName);
    if (!conn) {
      throw new Error(`Connection not found: ${connectionName}`);
    }
    
    let result;
    if (conn.type === 'postgresql') {
      result = await conn.query(query, params);
      result = result.rows;
    } else if (conn.type === 'mysql') {
      const [rows] = await conn.execute(query, params);
      result = rows;
    } else if (conn.type === 'sqlite') {
      const stmt = conn.prepare(query);
      result = params.length > 0 ? stmt.all(...params) : stmt.all();
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  async execute(connectionName, statement, params = []) {
    const conn = this.connections.get(connectionName);
    if (!conn) {
      throw new Error(`Connection not found: ${connectionName}`);
    }
    
    let result;
    if (conn.type === 'postgresql') {
      result = await conn.query(statement, params);
      result = { rowCount: result.rowCount };
    } else if (conn.type === 'mysql') {
      const [resultSet] = await conn.execute(statement, params);
      result = { affectedRows: resultSet.affectedRows };
    } else if (conn.type === 'sqlite') {
      const stmt = conn.prepare(statement);
      const info = params.length > 0 ? stmt.run(...params) : stmt.run();
      result = { changes: info.changes };
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  async listTables(connectionName) {
    const conn = this.connections.get(connectionName);
    if (!conn) {
      throw new Error(`Connection not found: ${connectionName}`);
    }
    
    let tables;
    if (conn.type === 'postgresql') {
      const result = await conn.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      tables = result.rows.map(r => r.table_name);
    } else if (conn.type === 'mysql') {
      const [rows] = await conn.execute('SHOW TABLES');
      tables = rows.map(r => Object.values(r)[0]);
    } else if (conn.type === 'sqlite') {
      const stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table'");
      tables = stmt.all().map(r => r.name);
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(tables, null, 2) }] };
  }

  async describeTable(connectionName, table) {
    const conn = this.connections.get(connectionName);
    if (!conn) {
      throw new Error(`Connection not found: ${connectionName}`);
    }
    
    let columns;
    if (conn.type === 'postgresql') {
      const result = await conn.query(
        `SELECT column_name, data_type, is_nullable, column_default 
         FROM information_schema.columns WHERE table_name = $1`,
        [table]
      );
      columns = result.rows;
    } else if (conn.type === 'mysql') {
      const [rows] = await conn.execute(`DESCRIBE ${table}`);
      columns = rows;
    } else if (conn.type === 'sqlite') {
      const stmt = conn.prepare(`PRAGMA table_info(${table})`);
      columns = stmt.all();
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(columns, null, 2) }] };
  }

  async listConnections() {
    const connections = Array.from(this.connections.keys());
    return { content: [{ type: 'text', text: JSON.stringify(connections, null, 2) }] };
  }

  async transaction(connectionName, statements) {
    const conn = this.connections.get(connectionName);
    if (!conn) {
      throw new Error(`Connection not found: ${connectionName}`);
    }
    
    const results = [];
    
    if (conn.type === 'postgresql') {
      const client = await conn.connect();
      try {
        await client.query('BEGIN');
        for (const stmt of statements) {
          const result = await client.query(stmt);
          results.push({ rowCount: result.rowCount, rows: result.rows });
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else if (conn.type === 'mysql') {
      const connection = await conn.getConnection();
      try {
        await connection.beginTransaction();
        for (const stmt of statements) {
          const [result] = await connection.execute(stmt);
          results.push({ affectedRows: result.affectedRows });
        }
        await connection.commit();
      } catch (e) {
        await connection.rollback();
        throw e;
      } finally {
        connection.release();
      }
    } else if (conn.type === 'sqlite') {
      const savepoint = conn.prepare('BEGIN TRANSACTION');
      savepoint.run();
      try {
        for (const stmt of statements) {
          const info = conn.prepare(stmt).run();
          results.push({ changes: info.changes });
        }
        conn.prepare('COMMIT').run();
      } catch (e) {
        conn.prepare('ROLLBACK').run();
        throw e;
      }
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  async backup(connectionName, outputPath) {
    const tables = await this.listTables(connectionName);
    const tableList = JSON.parse(tables.content[0].text);
    const schema = { tables: {} };
    
    for (const table of tableList) {
      const describeResult = await this.describeTable(connectionName, table);
      const dataResult = await this.query(connectionName, `SELECT * FROM ${table}`);
      schema.tables[table] = {
        schema: JSON.parse(describeResult.content[0].text),
        data: JSON.parse(dataResult.content[0].text)
      };
    }
    
    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, JSON.stringify(schema, null, 2));
    
    return { content: [{ type: 'text', text: `Backup saved to: ${outputPath}` }] };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Database MCP Server running on stdio');
  }
}

const server = new DatabaseMCPServer();
server.start();
