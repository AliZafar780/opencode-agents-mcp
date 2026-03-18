import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Octokit } from '@octokit/rest';

class GitHubMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'github-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.octokit = null;
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'github_auth',
          description: 'Authenticate with GitHub using a token',
          inputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string', description: 'GitHub personal access token' }
            },
            required: ['token']
          }
        },
        {
          name: 'github_repos',
          description: 'List repositories for the authenticated user',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              type: { type: 'string', description: 'Filter: all, owner, member' }
            }
          }
        },
        {
          name: 'github_repo',
          description: 'Get information about a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'github_contents',
          description: 'Get contents of a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              path: { type: 'string', description: 'File path' },
              ref: { type: 'string', description: 'Git reference (branch/tag/commit)' }
            },
            required: ['owner', 'repo', 'path']
          }
        },
        {
          name: 'github_tree',
          description: 'Get repository tree structure',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              recursive: { type: 'boolean', description: 'Recursive tree' }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'github_issues',
          description: 'List issues in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              state: { type: 'string', description: 'open, closed, all' },
              labels: { type: 'string', description: 'Filter by labels' }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'github_create_issue',
          description: 'Create a new issue',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              title: { type: 'string', description: 'Issue title' },
              body: { type: 'string', description: 'Issue body' },
              labels: { type: 'array', description: 'Issue labels' }
            },
            required: ['owner', 'repo', 'title']
          }
        },
        {
          name: 'github_pulls',
          description: 'List pull requests',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              state: { type: 'string', description: 'open, closed, all' }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'github_create_pull',
          description: 'Create a new pull request',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              title: { type: 'string', description: 'PR title' },
              body: { type: 'string', description: 'PR body' },
              head: { type: 'string', description: 'Head branch' },
              base: { type: 'string', description: 'Base branch' }
            },
            required: ['owner', 'repo', 'title', 'head', 'base']
          }
        },
        {
          name: 'github_commits',
          description: 'List commits in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              path: { type: 'string', description: 'Filter by file path' },
              limit: { type: 'number', description: 'Number of commits' }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'github_branches',
          description: 'List branches in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'github_search',
          description: 'Search for code or issues',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['code', 'issues', 'repositories'], description: 'Search type' },
              query: { type: 'string', description: 'Search query' }
            },
            required: ['type', 'query']
          }
        },
        {
          name: 'github_workflows',
          description: 'List GitHub Actions workflows',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'github_actions',
          description: 'Trigger or list workflow runs',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              workflow_id: { type: 'string', description: 'Workflow ID or filename' },
              action: { type: 'string', enum: ['list', 'run'], description: 'Action to perform' }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'github_user',
          description: 'Get authenticated user information',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'github_auth':
            return await this.auth(args.token);
          case 'github_repos':
            return await this.repos(args.owner, args.type);
          case 'github_repo':
            return await this.repo(args.owner, args.repo);
          case 'github_contents':
            return await this.contents(args.owner, args.repo, args.path, args.ref);
          case 'github_tree':
            return await this.tree(args.owner, args.repo, args.recursive);
          case 'github_issues':
            return await this.issues(args.owner, args.repo, args.state, args.labels);
          case 'github_create_issue':
            return await this.createIssue(args.owner, args.repo, args.title, args.body, args.labels);
          case 'github_pulls':
            return await this.pulls(args.owner, args.repo, args.state);
          case 'github_create_pull':
            return await this.createPull(args.owner, args.repo, args.title, args.body, args.head, args.base);
          case 'github_commits':
            return await this.commits(args.owner, args.repo, args.path, args.limit);
          case 'github_branches':
            return await this.branches(args.owner, args.repo);
          case 'github_search':
            return await this.search(args.type, args.query);
          case 'github_workflows':
            return await this.workflows(args.owner, args.repo);
          case 'github_actions':
            return await this.actions(args.owner, args.repo, args.workflow_id, args.action);
          case 'github_user':
            return await this.user();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  async auth(token) {
    this.octokit = new Octokit({ auth: token });
    const { data } = await this.octokit.users.getAuthenticated();
    return { content: [{ type: 'text', text: `Authenticated as: ${data.login}` }] };
  }

  async repos(owner, type = 'all') {
    if (!this.octokit) throw new Error('Not authenticated');
    const options = this.octokit.repos.list.endpoint.merge({ type });
    const { data } = await this.octokit.request(options);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async repo(owner, repo) {
    if (!this.octokit) throw new Error('Not authenticated');
    const { data } = await this.octokit.repos.get({ owner, repo });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async contents(owner, repo, path, ref) {
    if (!this.octokit) throw new Error('Not authenticated');
    const { data } = await this.octokit.repos.getContent({ owner, repo, path, ref });
    if (data.content) {
      return { content: [{ type: 'text', text: Buffer.from(data.content, 'base64').toString('utf-8') }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async tree(owner, repo, recursive = false) {
    if (!this.octokit) throw new Error('Not authenticated');
    const { data } = await this.octokit.git.getTree({ owner, repo, tree_sha: 'main', recursive });
    return { content: [{ type: 'text', text: JSON.stringify(data.tree, null, 2) }] };
  }

  async issues(owner, repo, state = 'open', labels) {
    if (!this.octokit) throw new Error('Not authenticated');
    const { data } = await this.octokit.issues.list({ owner, repo, state, labels });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async createIssue(owner, repo, title, body, labels = []) {
    if (!this.octokit) throw new Error('Not authenticated');
    const { data } = await this.octokit.issues.create({ owner, repo, title, body, labels });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async pulls(owner, repo, state = 'open') {
    if (!this.octokit) throw new Error('Not authenticated');
    const { data } = await this.octokit.pulls.list({ owner, repo, state });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async createPull(owner, repo, title, body, head, base) {
    if (!this.octokit) throw new Error('Not authenticated');
    const { data } = await this.octokit.pulls.create({ owner, repo, title, body, head, base });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async commits(owner, repo, path, limit = 10) {
    if (!this.octokit) throw new Error('Not authenticated');
    const { data } = await this.octokit.repos.listCommits({ owner, repo, path, per_page: limit });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async branches(owner, repo) {
    if (!this.octokit) throw new Error('Not authenticated');
    const { data } = await this.octokit.repos.listBranches({ owner, repo });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async search(type, query) {
    if (!this.octokit) throw new Error('Not authenticated');
    let data;
    if (type === 'code') {
      ({ data } = await this.octokit.search.code({ q: query }));
    } else if (type === 'issues') {
      ({ data } = await this.octokit.search.issuesAndPullRequests({ q: query }));
    } else if (type === 'repositories') {
      ({ data } = await this.octokit.search.repos({ q: query }));
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async workflows(owner, repo) {
    if (!this.octokit) throw new Error('Not authenticated');
    const { data } = await this.octokit.actions.listRepoWorkflows({ owner, repo });
    return { content: [{ type: 'text', text: JSON.stringify(data.workflows, null, 2) }] };
  }

  async actions(owner, repo, workflow_id, action = 'list') {
    if (!this.octokit) throw new Error('Not authenticated');
    let data;
    if (action === 'list') {
      ({ data } = await this.octokit.actions.listWorkflowRuns({ owner, repo, workflow_id }));
      return { content: [{ type: 'text', text: JSON.stringify(data.workflow_runs, null, 2) }] };
    } else if (action === 'run') {
      ({ data } = await this.octokit.actions.createWorkflowDispatch({ owner, repo, workflow_id, ref: 'main' }));
      return { content: [{ type: 'text', text: 'Workflow dispatched' }] };
    }
  }

  async user() {
    if (!this.octokit) throw new Error('Not authenticated');
    const { data } = await this.octokit.users.getAuthenticated();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub MCP Server running on stdio');
  }
}

const server = new GitHubMCPServer();
server.start();
