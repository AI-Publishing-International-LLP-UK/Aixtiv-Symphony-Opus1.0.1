import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import * as yaml from 'js-yaml';

interface ClientConfig {
  clientId: string;
  subdomain: string;
  companyName: string;
  agentPool: {
    size: number;
    dedicatedAgents: string[];
  };
  customization: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

class WhiteLabelDeployment {
  private templatePath = './config/white-label/deployment-template.yaml';
  private kubeconfig: string;
  
  constructor(private config: ClientConfig) {
    this.kubeconfig = process.env.KUBECONFIG || '~/.kube/config';
  }

  async deploy() {
    try {
      console.log(`Starting deployment for client ${this.config.clientId}`);

      // 1. Create namespace
      await this.createNamespace();

      // 2. Configure resources
      await this.configureResources();

      // 3. Setup agents
      await this.deployAgents();

      // 4. Configure domain and SSL
      await this.configureDomain();

      // 5. Setup monitoring
      await this.setupMonitoring();

      console.log('Deployment completed successfully');
    } catch (error) {
      console.error('Deployment failed:', error);
      throw error;
    }
  }

  private async createNamespace() {
    const namespace = `client-${this.config.clientId}`;
    const cmd = `kubectl create namespace ${namespace}`;
    execSync(cmd);

    // Label namespace
    execSync(`kubectl label namespace ${namespace} type=white-label client=${this.config.clientId}`);
  }

  private async configureResources() {
    const template = yaml.load(readFileSync(this.templatePath, 'utf8')) as any;

    // Update template with client config
    template.metadata.name = `client-${this.config.clientId}`;
    template.spec.resources.agentPool.agentsPerPool = this.config.agentPool.size;

    // Write customized config
    const configPath = `/tmp/${this.config.clientId}-config.yaml`;
    writeFileSync(configPath, yaml.dump(template));

    // Apply configuration
    execSync(`kubectl apply -f ${configPath}`);
  }

  private async deployAgents() {
    for (const agentType of this.config.agentPool.dedicatedAgents) {
      const deploymentConfig = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: `${agentType}-${this.config.clientId}`,
          namespace: `client-${this.config.clientId}`
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              app: agentType,
              client: this.config.clientId
            }
          },
          template: {
            metadata: {
              labels: {
                app: agentType,
                client: this.config.clientId
              }
            },
            spec: {
              containers: [{
                name: agentType,
                image: `gcr.io/api-for-warp-drive/${agentType}:latest`,
                resources: {
                  requests: {
                    memory: "96Gi",
                    cpu: "8"
                  },
                  limits: {
                    memory: "96Gi",
                    cpu: "12"
                  }
                },
                env: [{
                  name: 'CLIENT_ID',
                  value: this.config.clientId
                }]
              }]
            }
          }
        }
      };

      const deploymentPath = `/tmp/${this.config.clientId}-${agentType}-deployment.yaml`;
      writeFileSync(deploymentPath, yaml.dump(deploymentConfig));
      execSync(`kubectl apply -f ${deploymentPath}`);
    }
  }

  private async configureDomain() {
    const ingressConfig = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: `${this.config.clientId}-ingress`,
        namespace: `client-${this.config.clientId}`,
        annotations: {
          'kubernetes.io/ingress.class': 'nginx',
          'cert-manager.io/cluster-issuer': 'letsencrypt-prod'
        }
      },
      spec: {
        rules: [{
          host: `${this.config.subdomain}.2100.cool`,
          http: {
            paths: [{
              path: '/',
              pathType: 'Prefix',
              backend: {
                service: {
                  name: `${this.config.clientId}-service`,
                  port: {
                    number: 80
                  }
                }
              }
            }]
          }
        }],
        tls: [{
          hosts: [`${this.config.subdomain}.2100.cool`],
          secretName: `${this.config.clientId}-tls`
        }]
      }
    };

    const ingressPath = `/tmp/${this.config.clientId}-ingress.yaml`;
    writeFileSync(ingressPath, yaml.dump(ingressConfig));
    execSync(`kubectl apply -f ${ingressPath}`);
  }

  private async setupMonitoring() {
    const monitoringConfig = {
      apiVersion: 'monitoring.coreos.com/v1',
      kind: 'ServiceMonitor',
      metadata: {
        name: `${this.config.clientId}-monitor`,
        namespace: `client-${this.config.clientId}`
      },
      spec: {
        selector: {
          matchLabels: {
            client: this.config.clientId
          }
        },
        endpoints: [{
          port: 'metrics',
          interval: '15s'
        }]
      }
    };

    const monitorPath = `/tmp/${this.config.clientId}-monitor.yaml`;
    writeFileSync(monitorPath, yaml.dump(monitoringConfig));
    execSync(`kubectl apply -f ${monitorPath}`);
  }
}

// Usage example:
/*
const clientConfig: ClientConfig = {
  clientId: 'acme-corp',
  subdomain: 'acme',
  companyName: 'ACME Corporation',
  agentPool: {
    size: 3,
    dedicatedAgents: ['dr-lucy', 'dr-match']
  },
  customization: {
    logo: 'https://acme.com/logo.png',
    primaryColor: '#FF0000',
    secondaryColor: '#00FF00'
  }
};

const deployment = new WhiteLabelDeployment(clientConfig);
deployment.deploy().catch(console.error);
*/

export { WhiteLabelDeployment, ClientConfig };