# MCP Servers Configuration

This directory contains custom Model Context Protocol (MCP) servers for enhanced AI development capabilities.

## Installation

```bash
cd /home/aliz/mcp-servers
npm install
```

## Available Servers

### 1. Filesystem Server
Full filesystem operations with security restrictions

**Run:** `node filesystem/index.js`

**Tools:**
- read_file, write_file, list_directory
- create_directory, delete_file, move_path
- copy_path, get_file_info
- search_files, search_content

### 2. Database Server
Multi-database support (PostgreSQL, MySQL, SQLite)

**Run:** `node database/index.js`

**Tools:**
- db_connect, db_disconnect, db_query
- db_execute, db_list_tables, db_describe_table
- db_transaction, db_backup

### 3. Terminal Server
Shell command execution

**Run:** `node terminal/index.js`

**Tools:**
- terminal_exec, terminal_script
- terminal_background, terminal_kill
- terminal_grep, terminal_find

### 4. GitHub Server
GitHub API operations

**Run:** `node github/index.js`

**Tools:**
- github_auth, github_repos, github_repo
- github_issues, github_create_issue
- github_pulls, github_create_pull
- github_commits, github_search
- github_workflows, github_actions

### 5. Docker Server
Docker container management

**Run:** `node docker/index.js`

**Tools:**
- docker_ps, docker_images, docker_run
- docker_exec, docker_logs, docker_stop
- docker_start, docker_rm, docker_build
- docker_pull, docker_push, docker_stats
- docker_compose

### 6. Kubernetes Server
Kubernetes cluster management

**Run:** `node kubernetes/index.js`

**Tools:**
- k8s_pods, k8s_services, k8s_deployments
- k8s_logs, k8s_exec, k8s_apply
- k8s_scale, k8s_port_forward

### 7. AWS Server
AWS resource management

**Run:** `node aws/index.js`

**Tools:**
- aws_ec2_list, aws_ec2_start, aws_ec2_stop
- aws_s3_ls, aws_s3_cp, aws_s3_sync
- aws_lambda_list, aws_lambda_invoke
- aws_ecs_list, aws_rds_list
- aws_cost, aws_logs

## Usage with Claude Code / OpenCode

Add to your `claude.settings.json` or OpenCode config:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["/home/aliz/mcp-servers/filesystem/index.js"]
    },
    "github": {
      "command": "node",
      "args": ["/home/aliz/mcp-servers/github/index.js"]
    },
    "docker": {
      "command": "node",
      "args": ["/home/aliz/mcp-servers/docker/index.js"]
    },
    "kubernetes": {
      "command": "node",
      "args": ["/home/aliz/mcp-servers/kubernetes/index.js"]
    },
    "aws": {
      "command": "node",
      "args": ["/home/aliz/mcp-servers/aws/index.js"]
    }
  }
}
```

## Environment Variables

- `GITHUB_TOKEN` - For GitHub MCP server
- Database connection configs for database server
- `AWS_PROFILE` or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` for AWS server
