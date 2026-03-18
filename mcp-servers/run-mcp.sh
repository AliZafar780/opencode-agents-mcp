#!/bin/bash
# Load environment variables and start MCP server
export $(cat /home/aliz/mcp-servers/.env | grep -v '^#' | xargs)
exec node "$@"
