# MCP Server Configuration Guide

## What is MCP?

Model Context Protocol (MCP) is a specification for building AI agents that can interact with external tools and services.

## Available MCP Servers

### 1. Shodan MCP Server

**Purpose:** Internet scanning and vulnerability research

**Environment Variables:**
```bash
SHODAN_API_KEY=your_api_key
```

**Get API Key:** https://account.shodan.io/

**Features:**
- Host information lookup
- Search for devices/services
- Vulnerability data
- DNS lookups

---

### 2. GitHub MCP Server

**Purpose:** Repository management and GitHub API integration

**Environment Variables:**
```bash
GITHUB_TOKEN=your_github_token
```

**Get Token:** https://github.com/settings/tokens

**Required Scopes:**
- repo
- read:org

**Features:**
- List repositories
- Manage issues
- Create PRs
- View commits/branches

---

### 3. Slack MCP Server

**Purpose:** Slack workspace integration

**Environment Variables:**
```bash
SLACK_BOT_TOKEN=xoxb-your-token
```

**Get Token:** https://api.slack.com/apps/

**Features:**
- Send messages
- Create channels
- List users
- Upload files

---

### 4. Notion MCP Server

**Purpose:** Notion workspace integration

**Environment Variables:**
```bash
NOTION_API_KEY=your_notion_key
```

**Get API Key:** https://www.notion.so/my-integrations

**Features:**
- Create pages
- Search pages
- Query databases
- Update properties

---

### 5. AWS MCP Server

**Purpose:** AWS cloud resource management

**Environment Variables:**
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

**Features:**
- EC2 instance management
- S3 bucket operations
- Lambda function management

---

### 6. CVE MCP Server

**Purpose:** CVE vulnerability database search

**Environment Variables:** None required (uses NVD API)

**Features:**
- Search CVEs by keyword
- Get CVE details
- Filter by severity
- Find exploits

---

### 7. Docker MCP Server

**Purpose:** Docker container management

**Environment Variables:**
```bash
DOCKER_HOST=unix:///var/run/docker.sock
```

**Features:**
- List containers
- View logs
- Execute commands
- Build images

---

### 8. Kubernetes MCP Server

**Purpose:** K8s cluster management

**Environment Variables:**
```bash
KUBECONFIG=~/.kube/config
```

**Features:**
- List pods/services
- View logs
- Execute in pods
- Scale deployments

---

### 9. Telegram MCP Server

**Purpose:** Telegram bot integration

**Environment Variables:**
```bash
TELEGRAM_BOT_TOKEN=your_bot_token
```

**Get Token:** @BotFather on Telegram

**Features:**
- Send messages
- Send photos/documents
- Create groups

---

### 10. WhatsApp MCP Server

**Purpose:** WhatsApp messaging via Twilio

**Environment Variables:**
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Features:**
- Send messages
- Send media
- Check status

---

### 11. Search MCP Server

**Purpose:** Web search and scraping

**Environment Variables:** None required

**Features:**
- Web search
- Content scraping
- Screenshot capture

---

## MCP Config File

Create `mcp-servers/mcp-config.json`:

```json
{
  "mcpServers": {
    "shodan": {
      "command": "node",
      "args": ["/path/to/mcp-servers/shodan/index.js"],
      "env": {
        "SHODAN_API_KEY": "${SHODAN_API_KEY}"
      }
    },
    "github": {
      "command": "node",
      "args": ["/path/to/mcp-servers/github/index.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

## Security Notes

1. **Never commit `.env` files** - They contain secrets
2. **Use `.env.example`** as template for configuration
3. **Rotate API keys regularly**
4. **Use least-privilege tokens** - Only grant necessary permissions
5. **Store secrets in vault** - Consider using a secrets manager

## Testing Your Setup

```bash
# Test all configured MCPs
cd mcp-servers
npm test

# Test individual MCP
source .env && node mcp-servers/shodan/index.js
```
