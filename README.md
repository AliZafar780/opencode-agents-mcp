# 🚀 OpenCode Agents & MCP Server Collection

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/AliZafar780/opencode-agents-mcp)
![GitHub stars](https://img.shields.io/github/stars/AliZafar780/opencode-agents-mcp)
![GitHub forks](https://img.shields.io/github/forks/AliZafar780/opencode-agents-mcp)
![GitHub license](https://img.shields.io/github/license/AliZafar780/opencode-agents-mcp)
![Discord](https://img.shields.io/discord/123456789)

**A comprehensive collection of AI agent skills and Model Context Protocol (MCP) servers for building powerful automation and development workflows.**

</div>

---

## ✨ Features

- **40+ Specialized AI Agent Skills** - From exploit development to machine learning
- **20+ MCP Servers** - Ready-to-use integrations with popular services
- **Security-Focused** - All secrets removed, safe to share
- **Well-Documented** - Complete setup guides included
- **Modular Architecture** - Pick and choose what you need

---

## 📁 Repository Structure

```
opencode-agents-mcp/
├── skills/                    # AI Agent Skills
│   ├── exploit-development/   # Exploit development & security research
│   ├── threat-intelligence/   # Threat hunting & IOC collection
│   ├── malware-analysis/      # Reverse engineering & malware investigation
│   ├── web-vulnerability-scanner/  # OWASP testing & security assessment
│   ├── network-scanner/       # Reconnaissance & port scanning
│   ├── cloud-security-audit/  # AWS, Azure, GCP security auditing
│   ├── mobile-security-tester/ # iOS & Android app security
│   ├── secure-code-review/    # Source code security analysis
│   ├── api-security-tester/  # REST, GraphQL, SOAP API testing
│   ├── password-auditor/     # Password strength & hash analysis
│   ├── ethical-hacking/      # Penetration testing & red teaming
│   ├── security-engineer/    # Threat modeling & secure coding
│   ├── security-audit/       # Enterprise security assessment
│   ├── social-engineering-awareness/  # Phishing simulation
│   ├── machine-learning/     # MLOps & ML platform design
│   ├── ai-ml/                # LLM integration & prompt engineering
│   ├── data-engineering/     # ETL/ELT & data pipelines
│   ├── database/             # Distributed databases & NewSQL
│   ├── devops/               # GitOps & multi-cloud infrastructure
│   ├── backend-api/          # Scalable microservices architecture
│   ├── system-design/        # Distributed systems design patterns
│   ├── cloud-architecture/  # Serverless & cloud-native patterns
│   ├── mobile-development/   # Cross-platform mobile development
│   ├── blockchain/            # Smart contracts & DeFi protocols
│   ├── automation/           # Workflow automation & RPA
│   ├── integration/         # API & webhook integrations
│   ├── monitoring/          # Observability & alerting
│   ├── performance/         # eBPF tracing & systems optimization
│   ├── debugger/            # System-level debugging
│   ├── test-engineer/       # Property-based testing & chaos engineering
│   ├── code-reviewer/       # Code quality & architectural analysis
│   ├── refactor/            # Large-scale refactoring
│   ├── documentation/       # Technical documentation
│   ├── architecture-review/  # Enterprise architecture governance
│   ├── incident-response/   # Incident management & post-mortem
│   ├── 10x-developer/       # Ultimate productivity agent
│   ├── code-generator/      # AI code generation
│   └── ...
│
├── mcp-servers/              # Model Context Protocol Servers
│   ├── aws/                  # AWS EC2, S3, and more
│   ├── shodan/               # Internet scanning & vulnerability data
│   ├── github/               # Repository management & GitHub API
│   ├── slack/                # Slack messaging & channel management
│   ├── notion/               # Notion workspace integration
│   ├── docker/               # Docker container management
│   ├── kubernetes/           # K8s pods, services, deployments
│   ├── cve/                  # CVE database search
│   ├── search/               # Web search & scraping
│   ├── telegram/             # Telegram bot integration
│   ├── whatsapp/             # WhatsApp messaging
│   ├── chat-bridge/          # Cross-platform chat bridge
│   ├── terminal/             # Terminal command execution
│   ├── filesystem/           # File operations
│   ├── database/             # Database operations
│   └── ...
│
├── docs/                     # Documentation
│   ├── SETUP.md             # Quick start guide
│   ├── MCP_SETUP.md         # MCP server configuration
│   └── ...
│
└── README.md                # This file
```

---

## 🎯 Skills Overview

| Category | Skills |
|----------|--------|
| **Security** | exploit-development, threat-intelligence, malware-analysis, web-vulnerability-scanner, network-scanner, cloud-security-audit, mobile-security-tester, secure-code-review, api-security-tester, password-auditor, ethical-hacking, security-engineer, security-audit, social-engineering-awareness |
| **AI/ML** | machine-learning, ai-ml, data-engineering |
| **Cloud/DevOps** | devops, cloud-architecture, kubernetes, docker, monitoring |
| **Backend** | backend-api, system-design, database, api-architecture |
| **Development** | code-generator, code-reviewer, refactor, debugger, test-engineer |
| **Mobile** | mobile-development |
| **Web3** | blockchain |
| **Productivity** | automation, integration, documentation, incident-response, architecture-review, 10x-developer |

---

## 🔧 MCP Servers Overview

| Server | Description |
|--------|-------------|
| **AWS** | EC2, S3, Lambda management |
| **Shodan** | Internet device scanning |
| **GitHub** | Repository, issues, PRs |
| **Slack** | Channel & messaging |
| **Notion** | Pages & databases |
| **Docker** | Container operations |
| **Kubernetes** | Pods, services, deployments |
| **CVE** | Vulnerability database |
| **Search** | Web scraping & search |
| **Telegram** | Bot messaging |
| **WhatsApp** | WhatsApp API |
| **Terminal** | Shell execution |

---

## 🚦 Quick Start

### Clone the Repository

```bash
git clone https://github.com/AliZafar780/opencode-agents-mcp.git
cd opencode-agents-mcp
```

### Setup MCP Servers

```bash
cd mcp-servers
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys
```

### Run an MCP Server

```bash
# With environment variables
source .env
node mcp-servers/shodan/index.js

# Or use the wrapper script
./mcp-servers/run-mcp.sh mcp-servers/shodan/index.js
```

---

## 📖 Detailed Guides

### MCP Server Configuration

Each MCP server can be configured via environment variables. See `mcp-servers/.env.example` for the required variables.

```bash
# Example: Setup Shodan MCP
SHODAN_API_KEY=your_api_key_here

# Example: Setup GitHub MCP
GITHUB_TOKEN=your_github_token_here

# Example: Setup Slack MCP
SLACK_BOT_TOKEN=xoxb-your-token-here
```

### Using Skills

Skills are loaded through OpenCode. Each skill directory contains:
- `SKILL.md` - Skill definition and capabilities
- Configuration files for the skill

---

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- OpenCode for the amazing agentic coding platform
- All the MCP server developers
- The security research community

---

<div align="center">

**Star us on GitHub** ⭐ | **Follow for updates** 📢 | **Join the community** 💬

</div>
