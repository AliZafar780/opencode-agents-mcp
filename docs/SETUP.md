# OpenCode Agents & MCP - Setup Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- Git
- API keys for services you want to integrate

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/AliZafar780/opencode-agents-mcp.git
cd opencode-agents-mcp
```

### 2. Install MCP Server Dependencies

```bash
cd mcp-servers
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```bash
# Shodan
SHODAN_API_KEY=your_shodan_api_key

# GitHub
GITHUB_TOKEN=your_github_token

# Slack
SLACK_BOT_TOKEN=xoxb-your-slack-token

# Notion
NOTION_API_KEY=your_notion_api_key

# AWS (if using AWS MCP)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# OpenAI (if needed)
OPENAI_API_KEY=your_openai_key
```

## Running MCP Servers

### Option 1: Direct Execution

```bash
cd mcp-servers
source .env
node mcp-servers/shodan/index.js
```

### Option 2: Using the Wrapper Script

```bash
cd mcp-servers
./run-mcp.sh mcp-servers/shodan/index.js
```

## Testing MCP Servers

### Test Shodan

```bash
source .env
node -e "
const { shodan_search } = require('./shodan/index.js');
shodan_search({ query: 'apache', limit: 5 }).then(console.log);
"
```

### Test GitHub

```bash
source .env
node -e "
const { github_repos } = require('./github/index.js');
github_repos({ type: 'owner' }).then(console.log);
"
```

## Troubleshooting

### MCP Server Not Starting

1. Check if all dependencies are installed: `npm install`
2. Verify environment variables are set: `echo $SHODAN_API_KEY`
3. Check for port conflicts: `lsof -i :port`

### Authentication Errors

1. Verify API keys are correct
2. Check token permissions
3. Ensure API keys are active

## Next Steps

- Configure your preferred MCP servers
- Set up OpenCode with these skills
- Start building your AI agent workflows

## Support

For issues, please open a GitHub issue.
