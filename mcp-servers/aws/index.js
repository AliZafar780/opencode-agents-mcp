import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class AWSMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'aws-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'aws_ec2_list',
          description: 'List EC2 instances',
          inputSchema: {
            type: 'object',
            properties: {
              region: { type: 'string', description: 'AWS region' }
            }
          }
        },
        {
          name: 'aws_ec2_describe',
          description: 'Describe an EC2 instance',
          inputSchema: {
            type: 'object',
            properties: {
              instanceId: { type: 'string', description: 'Instance ID' },
              region: { type: 'string', description: 'AWS region' }
            },
            required: ['instanceId']
          }
        },
        {
          name: 'aws_ec2_start',
          description: 'Start an EC2 instance',
          inputSchema: {
            type: 'object',
            properties: {
              instanceId: { type: 'string', description: 'Instance ID' },
              region: { type: 'string', description: 'AWS region' }
            },
            required: ['instanceId']
          }
        },
        {
          name: 'aws_ec2_stop',
          description: 'Stop an EC2 instance',
          inputSchema: {
            type: 'object',
            properties: {
              instanceId: { type: 'string', description: 'Instance ID' },
              region: { type: 'string', description: 'AWS region' }
            },
            required: ['instanceId']
          }
        },
        {
          name: 'aws_s3_ls',
          description: 'List S3 buckets or objects',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: { type: 'string', description: 'S3 bucket name' },
              prefix: { type: 'string', description: 'Object prefix' }
            }
          }
        },
        {
          name: 'aws_s3_cp',
          description: 'Copy files to/from S3',
          inputSchema: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source path (local or S3)' },
              destination: { type: 'string', description: 'Destination path (local or S3)' }
            },
            required: ['source', 'destination']
          }
        },
        {
          name: 'aws_s3_sync',
          description: 'Sync directories with S3',
          inputSchema: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source path' },
              destination: { type: 'string', description: 'Destination S3 bucket' },
              delete: { type: 'boolean', description: 'Delete files not in source' }
            },
            required: ['source', 'destination']
          }
        },
        {
          name: 'aws_lambda_list',
          description: 'List Lambda functions',
          inputSchema: {
            type: 'object',
            properties: {
              region: { type: 'string', description: 'AWS region' }
            }
          }
        },
        {
          name: 'aws_lambda_invoke',
          description: 'Invoke a Lambda function',
          inputSchema: {
            type: 'object',
            properties: {
              functionName: { type: 'string', description: 'Function name' },
              payload: { type: 'string', description: 'JSON payload' },
              region: { type: 'string', description: 'AWS region' }
            },
            required: ['functionName']
          }
        },
        {
          name: 'aws_ecs_list',
          description: 'List ECS clusters',
          inputSchema: {
            type: 'object',
            properties: {
              region: { type: 'string', description: 'AWS region' }
            }
          }
        },
        {
          name: 'aws_ecs_services',
          description: 'List ECS services in a cluster',
          inputSchema: {
            type: 'object',
            properties: {
              cluster: { type: 'string', description: 'Cluster name' },
              region: { type: 'string', description: 'AWS region' }
            },
            required: ['cluster']
          }
        },
        {
          name: 'aws_ecs_tasks',
          description: 'List ECS tasks',
          inputSchema: {
            type: 'object',
            properties: {
              cluster: { type: 'string', description: 'Cluster name' },
              region: { type: 'string', description: 'AWS region' }
            },
            required: ['cluster']
          }
        },
        {
          name: 'aws_rds_list',
          description: 'List RDS instances',
          inputSchema: {
            type: 'object',
            properties: {
              region: { type: 'string', description: 'AWS region' }
            }
          }
        },
        {
          name: 'aws_iam_users',
          description: 'List IAM users',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'aws_cf_stacks',
          description: 'List CloudFormation stacks',
          inputSchema: {
            type: 'object',
            properties: {
              region: { type: 'string', description: 'AWS region' }
            }
          }
        },
        {
          name: 'aws_cost',
          description: 'Get cost and usage',
          inputSchema: {
            type: 'object',
            properties: {
              startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
              endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' }
            },
            required: ['startDate', 'endDate']
          }
        },
        {
          name: 'aws_pricing',
          description: 'Get AWS pricing',
          inputSchema: {
            type: 'object',
            properties: {
              service: { type: 'string', description: 'Service name' },
              region: { type: 'string', description: 'AWS region' }
            },
            required: ['service']
          }
        },
        {
          name: 'aws_logs',
          description: 'Get CloudWatch logs',
          inputSchema: {
            type: 'object',
            properties: {
              logGroup: { type: 'string', description: 'Log group name' },
              stream: { type: 'string', description: 'Log stream name' },
              limit: { type: 'number', description: 'Number of events' },
              region: { type: 'string', description: 'AWS region' }
            },
            required: ['logGroup']
          }
        },
        {
          name: 'aws_regions',
          description: 'List available AWS regions',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'aws_whoami',
          description: 'Get current AWS identity',
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
          case 'aws_ec2_list':
            return await this.ec2List(args.region);
          case 'aws_ec2_describe':
            return await this.ec2Describe(args.instanceId, args.region);
          case 'aws_ec2_start':
            return await this.ec2Start(args.instanceId, args.region);
          case 'aws_ec2_stop':
            return await this.ec2Stop(args.instanceId, args.region);
          case 'aws_s3_ls':
            return await this.s3Ls(args.bucket, args.prefix);
          case 'aws_s3_cp':
            return await this.s3Cp(args.source, args.destination);
          case 'aws_s3_sync':
            return await this.s3Sync(args.source, args.destination, args.delete);
          case 'aws_lambda_list':
            return await this.lambdaList(args.region);
          case 'aws_lambda_invoke':
            return await this.lambdaInvoke(args.functionName, args.payload, args.region);
          case 'aws_ecs_list':
            return await this.ecsList(args.region);
          case 'aws_ecs_services':
            return await this.ecsServices(args.cluster, args.region);
          case 'aws_ecs_tasks':
            return await this.ecsTasks(args.cluster, args.region);
          case 'aws_rds_list':
            return await this.rdsList(args.region);
          case 'aws_iam_users':
            return await this.iamUsers();
          case 'aws_cf_stacks':
            return await this.cfStacks(args.region);
          case 'aws_cost':
            return await this.cost(args.startDate, args.endDate);
          case 'aws_pricing':
            return await this.pricing(args.service, args.region);
          case 'aws_logs':
            return await this.logs(args.logGroup, args.stream, args.limit, args.region);
          case 'aws_regions':
            return await this.regions();
          case 'aws_whoami':
            return await this.whoami();
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

  regionFlag(region) {
    return region ? `--region ${region}` : '';
  }

  async ec2List(region) {
    const output = await this.runCmd(`aws ec2 describe-instances ${this.regionFlag(region)} --query 'Reservations[].Instances[]' --output json`);
    return { content: [{ type: 'text', text: output }] };
  }

  async ec2Describe(instanceId, region) {
    const output = await this.runCmd(`aws ec2 describe-instances --instance-ids ${instanceId} ${this.regionFlag(region)} --output json`);
    return { content: [{ type: 'text', text: output }] };
  }

  async ec2Start(instanceId, region) {
    const output = await this.runCmd(`aws ec2 start-instances --instance-ids ${instanceId} ${this.regionFlag(region)} --output json`);
    return { content: [{ type: 'text', text: output }] };
  }

  async ec2Stop(instanceId, region) {
    const output = await this.runCmd(`aws ec2 stop-instances --instance-ids ${instanceId} ${this.regionFlag(region)} --output json`);
    return { content: [{ type: 'text', text: output }] };
  }

  async s3Ls(bucket, prefix) {
    let cmd = 'aws s3 ls';
    if (bucket) {
      cmd += ` s3://${bucket}${prefix ? '/' + prefix : ''}`;
    }
    const output = await this.runCmd(cmd);
    return { content: [{ type: 'text', text: output }] };
  }

  async s3Cp(source, destination) {
    const output = await this.runCmd(`aws s3 cp ${source} ${destination}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async s3Sync(source, destination, deleteFlag = false) {
    const del = deleteFlag ? '--delete' : '';
    const output = await this.runCmd(`aws s3 sync ${source} ${destination} ${del}`);
    return { content: [{ type: 'text', text: output }] };
  }

  async lambdaList(region) {
    const output = await this.runCmd(`aws lambda list-functions ${this.regionFlag(region)} --output json`);
    return { content: [{ type: 'text', text: output }] };
  }

  async lambdaInvoke(functionName, payload, region) {
    const pl = payload ? `--payload '${payload}'` : '';
    const output = await this.runCmd(`aws lambda invoke --function-name ${functionName} ${pl} ${this.regionFlag(region)} /dev/stdout`);
    return { content: [{ type: 'text', text: output }] };
  }

  async ecsList(region) {
    const output = await this.runCmd(`aws ecs list-clusters ${this.regionFlag(region)} --output json`);
    return { content: [{ type: 'text', text: output }] };
  }

  async ecsServices(cluster, region) {
    const output = await this.runCmd(`aws ecs list-services --cluster ${cluster} ${this.regionFlag(region)} --output json`);
    return { content: [{ type: 'text', text: output }] };
  }

  async ecsTasks(cluster, region) {
    const output = await this.runCmd(`aws ecs list-tasks --cluster ${cluster} ${this.regionFlag(region)} --output json`);
    return { content: [{ type: 'text', text', text: output }] };
  }

  async rdsList(region) {
    const output = await this.runCmd(`aws rds describe-db-instances ${this.regionFlag(region)} --output json`);
    return { content: [{ type: 'text', text: output }] };
  }

  async iamUsers() {
    const output = await this.runCmd('aws iam list-users --output json');
    return { content: [{ type: 'text', text: output }] };
  }

  async cfStacks(region) {
    const output = await this.runCmd(`aws cloudformation list-stacks ${this.regionFlag(region)} --output json`);
    return { content: [{ type: 'text', text: output }] };
  }

  async cost(startDate, endDate) {
    const output = await this.runCmd(`aws ce get-cost-and-usage --time-period Start=${startDate},End=${endDate} --granularity DAILY --metrics UnblendedCost --output json`);
    return { content: [{ type: 'text', text: output }] };
  }

  async pricing(service, region) {
    const output = await this.runCmd(`aws pricing get-products --service-code ${service} --region ${region || 'us-east-1'} --max-results 5 --output json`);
    return { content: [{ type: 'text', text: output }] };
  }

  async logs(logGroup, stream, limit, region) {
    let cmd = `aws logs filter-log-events --log-group-name ${logGroup}`;
    if (stream) cmd += ` --log-stream-name ${stream}`;
    if (limit) cmd += ` --limit ${limit}`;
    cmd += ` ${this.regionFlag(region)} --output json`;
    
    const output = await this.runCmd(cmd);
    return { content: [{ type: 'text', text: output }] };
  }

  async regions() {
    const output = await this.runCmd('aws ec2 describe-regions --output json');
    return { content: [{ type: 'text', text: output }] };
  }

  async whoami() {
    const output = await this.runCmd('aws sts get-caller-identity --output json');
    return { content: [{ type: 'text', text: output }] };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AWS MCP Server running on stdio');
  }
}

const server = new AWSMCPServer();
server.start();
