import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class KubernetesMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'kubernetes-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'k8s_pods',
          description: 'List pods in a namespace',
          inputSchema: {
            type: 'object',
            properties: {
              namespace: { type: 'string', description: 'Kubernetes namespace' },
              all: { type: 'boolean', description: 'Show all namespaces' }
            }
          }
        },
        {
          name: 'k8s_services',
          description: 'List services in a namespace',
          inputSchema: {
            type: 'object',
            properties: {
              namespace: { type: 'string', description: 'Kubernetes namespace' }
            }
          }
        },
        {
          name: 'k8s_deployments',
          description: 'List deployments in a namespace',
          inputSchema: {
            type: 'object',
            properties: {
              namespace: { type: 'string', description: 'Kubernetes namespace' }
            }
          }
        },
        {
          name: 'k8s_namespaces',
          description: 'List all namespaces',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'k8s_get',
          description: 'Get any Kubernetes resource',
          inputSchema: {
            type: 'object',
            properties: {
              resource: { type: 'string', description: 'Resource type (pod, svc, deploy, etc.)' },
              name: { type: 'string', description: 'Resource name' },
              namespace: { type: 'string', description: 'Namespace' },
              output: { type: 'string', description: 'Output format (json, yaml)' }
            },
            required: ['resource']
          }
        },
        {
          name: 'k8s_describe',
          description: 'Describe a Kubernetes resource',
          inputSchema: {
            type: 'object',
            properties: {
              resource: { type: 'string', description: 'Resource type' },
              name: { type: 'string', description: 'Resource name' },
              namespace: { type: 'string', description: 'Namespace' }
            },
            required: ['resource', 'name']
          }
        },
        {
          name: 'k8s_logs',
          description: 'Get pod logs',
          inputSchema: {
            type: 'object',
            properties: {
              pod: { type: 'string', description: 'Pod name' },
              namespace: { type: 'string', description: 'Namespace' },
              container: { type: 'string', description: 'Container name' },
              tail: { type: 'number', description: 'Lines to show' },
              previous: { type: 'boolean', description: 'Previous container logs' }
            },
            required: ['pod']
          }
        },
        {
          name: 'k8s_exec',
          description: 'Execute command in a pod',
          inputSchema: {
            type: 'object',
            properties: {
              pod: { type: 'string', description: 'Pod name' },
              namespace: { type: 'string', description: 'Namespace' },
              container: { type: 'string', description: 'Container name' },
              command: { type: 'string', description: 'Command to execute' }
            },
            required: ['pod', 'command']
          }
        },
        {
          name: 'k8s_apply',
          description: 'Apply a Kubernetes manifest',
          inputSchema: {
            type: 'object',
            properties: {
              manifest: { type: 'string', description: 'Manifest content (YAML/JSON)' },
              file: { type: 'string', description: 'Path to manifest file' }
            }
          }
        },
        {
          name: 'k8s_delete',
          description: 'Delete a Kubernetes resource',
          inputSchema: {
            type: 'object',
            properties: {
              resource: { type: 'string', description: 'Resource type' },
              name: { type: 'string', description: 'Resource name' },
              namespace: { type: 'string', description: 'Namespace' },
              force: { type: 'boolean', description: 'Force deletion' }
            },
            required: ['resource', 'name']
          }
        },
        {
          name: 'k8s_scale',
          description: 'Scale a deployment',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Deployment name' },
              replicas: { type: 'number', description: 'Number of replicas' },
              namespace: { type: 'string', description: 'Namespace' }
            },
            required: ['name', 'replicas']
          }
        },
        {
          name: 'k8s_port_forward',
          description: 'Port forward to a pod',
          inputSchema: {
            type: 'object',
            properties: {
              pod: { type: 'string', description: 'Pod name' },
              localPort: { type: 'number', description: 'Local port' },
              podPort: { type: 'number', description: 'Pod port' },
              namespace: { type: 'string', description: 'Namespace' }
            },
            required: ['pod', 'localPort']
          }
        },
        {
          name: 'k8s_configmap',
          description: 'Manage configmaps',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['get', 'create', 'delete'], description: 'Action' },
              name: { type: 'string', description: 'Configmap name' },
              namespace: { type: 'string', description: 'Namespace' },
              data: { type: 'object', description: 'Configmap data' }
            },
            required: ['action', 'name']
          }
        },
        {
          name: 'k8s_secret',
          description: 'Manage secrets',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['get', 'create', 'delete'], description: 'Action' },
              name: { type: 'string', description: 'Secret name' },
              namespace: { type: 'string', description: 'Namespace' },
              data: { type: 'object', description: 'Secret data' }
            },
            required: ['action', 'name']
          }
        },
        {
          name: 'k8s_context',
          description: 'Manage kubectl context',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['current', 'list', 'use'], description: 'Action' },
              name: { type: 'string', description: 'Context name' }
            },
            required: ['action']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'k8s_pods':
            return await this.pods(args.namespace, args.all);
          case 'k8s_services':
            return await this.services(args.namespace);
          case 'k8s_deployments':
            return await this.deployments(args.namespace);
          case 'k8s_namespaces':
            return await this.namespaces();
          case 'k8s_get':
            return await this.get(args.resource, args.name, args.namespace, args.output);
          case 'k8s_describe':
            return await this.describe(args.resource, args.name, args.namespace);
          case 'k8s_logs':
            return await this.logs(args.pod, args.namespace, args.container, args.tail, args.previous);
          case 'k8s_exec':
            return await this.exec(args.pod, args.namespace, args.container, args.command);
          case 'k8s_apply':
            return await this.apply(args.manifest, args.file);
          case 'k8s_delete':
            return await this.delete(args.resource, args.name, args.namespace, args.force);
          case 'k8s_scale':
            return await this.scale(args.name, args.replicas, args.namespace);
          case 'k8s_port_forward':
            return await this.portForward(args.pod, args.localPort, args.podPort, args.namespace);
          case 'k8s_configmap':
            return await this.configmap(args.action, args.name, args.namespace, args.data);
          case 'k8s_secret':
            return await this.secret(args.action, args.name, args.namespace, args.data);
          case 'k8s_context':
            return await this.context(args.action, args.name);
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

  async pods(namespace = 'default', all = false) {
    const ns = all ? '--all-namespaces' : (namespace ? `-n ${namespace}` : '');
    const output = await this.runCmd(`kubectl get pods ${ns} -o json`);
    const data = JSON.parse(output);
    return { content: [{ type: 'text', text: JSON.stringify(data.items.map(p => ({
      name: p.metadata.name,
      namespace: p.metadata.namespace,
      status: p.status.phase,
      ready: p.status.containerStatuses?.map(c => `${c.ready ? 1 : 0}/${1}`).join(', '),
      restarts: p.status.containerStatuses?.[0]?.restartCount || 0,
      age: p.metadata.creationTimestamp
    })), null, 2) }] };
  }

  async services(namespace = 'default') {
    const output = await this.runCmd(`kubectl get svc -n ${namespace} -o json`);
    const data = JSON.parse(output);
    return { content: [{ type: 'text', text: JSON.stringify(data.items.map(s => ({
      name: s.metadata.name,
      type: s.spec.type,
      clusterIP: s.spec.clusterIP,
      ports: s.spec.ports?.map(p => `${p.port}/${p.protocol}`)
    })), null, 2) }] };
  }

  async deployments(namespace = 'default') {
    const output = await this.runCmd(`kubectl get deploy -n ${namespace} -o json`);
    const data = JSON.parse(output);
    return { content: [{ type: 'text', text: JSON.stringify(data.items.map(d => ({
      name: d.metadata.name,
      ready: `${d.status.readyReplicas || 0}/${d.spec.replicas}`,
      available: d.status.availableReplicas || 0,
      age: d.metadata.creationTimestamp
    })), null, 2) }] };
  }

  async namespaces() {
    const output = await this.runCmd('kubectl get ns -o json');
    const data = JSON.parse(output);
    return { content: [{ type: 'text', text: JSON.stringify(data.items.map(ns => ({
      name: ns.metadata.name,
      status: ns.status.phase
    })), null, 2) }] };
  }

  async get(resource, name, namespace, output = 'json') {
    let cmd = `kubectl get ${resource}`;
    if (name) cmd += ` ${name}`;
    if (namespace) cmd += ` -n ${namespace}`;
    cmd += ` -o ${output}`;
    
    const result = await this.runCmd(cmd);
    return { content: [{ type: 'text', text: output === 'json' ? JSON.stringify(JSON.parse(result), null, 2) : result }] };
  }

  async describe(resource, name, namespace) {
    let cmd = `kubectl describe ${resource} ${name}`;
    if (namespace) cmd += ` -n ${namespace}`;
    
    const output = await this.runCmd(cmd);
    return { content: [{ type: 'text', text: output }] };
  }

  async logs(pod, namespace = 'default', container, tail, previous = false) {
    let cmd = `kubectl logs ${pod}`;
    if (namespace) cmd += ` -n ${namespace}`;
    if (container) cmd += ` -c ${container}`;
    if (tail) cmd += ` --tail=${tail}`;
    if (previous) cmd += ' --previous';
    
    const output = await this.runCmd(cmd);
    return { content: [{ type: 'text', text: output }] };
  }

  async exec(pod, namespace = 'default', container, command) {
    let cmd = `kubectl exec ${pod}`;
    if (namespace) cmd += ` -n ${namespace}`;
    if (container) cmd += ` -c ${container}`;
    cmd += ` -- ${command}`;
    
    const output = await this.runCmd(cmd);
    return { content: [{ type: 'text', text: output }] };
  }

  async apply(manifest, file) {
    let cmd = 'kubectl apply';
    if (file) cmd += ` -f ${file}`;
    else cmd += ` -f -`;
    
    const output = await this.runCmd(cmd);
    return { content: [{ type: 'text', text: output }] };
  }

  async delete(resource, name, namespace, force = false) {
    let cmd = `kubectl delete ${resource} ${name}`;
    if (namespace) cmd += ` -n ${namespace}`;
    if (force) cmd += ' --grace-period=0 --force';
    
    const output = await this.runCmd(cmd);
    return { content: [{ type: 'text', text: output }] };
  }

  async scale(name, replicas, namespace = 'default') {
    const output = await this.runCmd(`kubectl scale deployment ${name} --replicas=${replicas} -n ${namespace}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async portForward(pod, localPort, podPort = 80, namespace = 'default') {
    const output = await this.runCmd(`kubectl port-forward ${pod} ${localPort}:${podPort} -n ${namespace}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async configmap(action, name, namespace = 'default', data) {
    if (action === 'get') {
      return await this.get('configmap', name, namespace);
    } else if (action === 'create') {
      const dataStr = Object.entries(data).map(([k, v]) => `--from-literal=${k}=${v}`).join(' ');
      const output = await this.runCmd(`kubectl create configmap ${name} ${dataStr} -n ${namespace}`);
      return { content: [{ type: 'text', text: output }] };
    } else if (action === 'delete') {
      return await this.delete('configmap', name, namespace);
    }
  }

  async secret(action, name, namespace = 'default', data) {
    if (action === 'get') {
      return await this.get('secret', name, namespace);
    } else if (action === 'create') {
      const dataStr = Object.entries(data).map(([k, v]) => `--from-literal=${k}=${v}`).join(' ');
      const output = await this.runCmd(`kubectl create secret generic ${name} ${dataStr} -n ${namespace}`);
      return { content: [{ type: 'text', text: output }] };
    } else if (action === 'delete') {
      return await this.delete('secret', name, namespace);
    }
  }

  async context(action, name) {
    if (action === 'current') {
      const output = await this.runCmd('kubectl config current-context');
      return { content: [{ type: 'text', text: output }] };
    } else if (action === 'list') {
      const output = await this.runCmd('kubectl config get-contexts -o name');
      return { content: [{ type: 'text', text: output }] };
    } else if (action === 'use') {
      const output = await this.runCmd(`kubectl config use-context ${name}`);
      return { content: [{ type: 'text', text: output }] };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Kubernetes MCP Server running on stdio');
  }
}

const server = new KubernetesMCPServer();
server.start();
