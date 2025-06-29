# Squadron 5 & 6 Deployment with Horizontal Scaling

## Squadron Organization

### Squadron 5: CRX Opus Master Trainers (11 Units)
**Role**: Elite training specialists and premium service delivery
**Model**: Claude 3 Opus
**Scaling Type**: Vertical + Horizontal
**Base Cost**: $495-9,900/month

### Squadron 6: PCP Sonnet Trainees (100 Units)  
**Role**: Learning co-pilots in training phase
**Model**: Claude 3.5 Sonnet
**Scaling Type**: Horizontal Auto-scaling
**Base Cost**: $900-18,000/month

## Horizontal Scaling Architecture

### Auto-Scaling Configuration

#### Squadron 5 (CRX Opus) - Premium Scaling
```yaml
squadron_5_scaling:
  base_instances: 11
  scaling_type: "manual_premium"
  max_instances: 50
  scaling_triggers:
    - premium_client_demand
    - training_load_spikes
    - specialized_expertise_requests
  scaling_metrics:
    - cpu_utilization > 80%
    - request_queue_depth > 100
    - response_time > 2s
  cost_awareness: true
  approval_required: true
```

#### Squadron 6 (PCP Sonnet) - Elastic Scaling
```yaml
squadron_6_scaling:
  base_instances: 100
  scaling_type: "auto_elastic"
  min_instances: 50
  max_instances: 1000
  scaling_triggers:
    - training_demand
    - client_service_load
    - learning_cohort_size
  scaling_metrics:
    - active_training_sessions
    - client_request_volume
    - response_latency
  auto_scale_up: true
  auto_scale_down: true
  scale_down_protection: true
```

## Scaling Implementation Options

### 1. Cloud Run Auto-Scaling (Recommended)
**Advantages:**
- Automatic horizontal scaling based on traffic
- Pay-per-request model
- Built-in load balancing
- Regional distribution

**Configuration:**
```yaml
squadron_5_cloud_run:
  min_instances: 11
  max_instances: 50
  concurrency: 5  # Higher for Opus quality
  cpu: "2"
  memory: "4Gi"
  scaling_threshold: 80%

squadron_6_cloud_run:
  min_instances: 100
  max_instances: 1000
  concurrency: 10  # Higher throughput for training
  cpu: "1"
  memory: "2Gi"
  scaling_threshold: 70%
```

### 2. Kubernetes Horizontal Pod Autoscaler (HPA)
**Advantages:**
- Fine-grained control
- Custom metrics scaling
- Multi-dimensional scaling
- Cost optimization

**Configuration:**
```yaml
squadron_5_hpa:
  minReplicas: 11
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: 75%
    - type: Object
      object:
        name: premium_requests_per_second
        target: 10

squadron_6_hpa:
  minReplicas: 100
  maxReplicas: 1000
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: 70%
    - type: Object
      object:
        name: training_sessions_active
        target: 100
```

### 3. Firebase Functions Auto-Scaling
**Advantages:**
- Serverless deployment
- Automatic scaling to zero
- Global distribution
- Simple deployment

**Configuration:**
```javascript
// Squadron 5 - Premium scaling
exports.squadron5Handler = functions
  .region('us-west1')
  .runWith({
    minInstances: 11,
    maxInstances: 50,
    memory: '4GB',
    timeoutSeconds: 300
  })
  .https.onRequest(handler);

// Squadron 6 - Elastic scaling  
exports.squadron6Handler = functions
  .region('us-west1')
  .runWith({
    minInstances: 100,
    maxInstances: 1000,
    memory: '2GB',
    timeoutSeconds: 120
  })
  .https.onRequest(handler);
```

## Regional Scaling Distribution

### Squadron 5 (CRX) Regional Scaling
```
MOCOA Regions:
├── us-west1-a: 3 base + 0-15 scale (Premium clients)
├── us-west1-b: 3 base + 0-15 scale (Premium clients)
└── eu-west1: 2 base + 0-10 scale (GDPR premium)

MOCORIX:
└── us-west1-c: 2 base + 0-8 scale (Training intensive)

MOCORIX2:
└── us-central1: 1 base + 0-2 scale (Orchestration)
```

### Squadron 6 (PCP) Regional Scaling
```
Distributed Training:
├── us-west1-a: 30 base + 0-300 scale
├── us-west1-b: 30 base + 0-300 scale  
├── eu-west1: 20 base + 0-200 scale
├── us-west1-c: 15 base + 0-150 scale
└── us-central1: 5 base + 0-50 scale
```

## Scaling Cost Management

### Dynamic Cost Controls
```yaml
cost_management:
  squadron_5:
    max_monthly_budget: $15000  # Premium budget
    scale_down_trigger: 90%_budget
    approval_required: true
    
  squadron_6:
    max_monthly_budget: $25000  # Training budget
    scale_down_trigger: 80%_budget
    auto_optimize: true
```

### Scaling Scenarios & Costs

#### Light Scaling (Base + 20%)
- **Squadron 5**: 13 instances = $585-11,700/month
- **Squadron 6**: 120 instances = $1,080-21,600/month
- **Total**: $1,665-33,300/month

#### Moderate Scaling (Base + 50%)
- **Squadron 5**: 16 instances = $720-14,400/month  
- **Squadron 6**: 150 instances = $1,350-27,000/month
- **Total**: $2,070-41,400/month

#### Heavy Scaling (Base + 100%)
- **Squadron 5**: 22 instances = $990-19,800/month
- **Squadron 6**: 200 instances = $1,800-36,000/month  
- **Total**: $2,790-55,800/month

## Scaling Benefits

### Squadron 5 Benefits:
- **Premium availability** during high-demand periods
- **Training capacity** scales with cohort sizes
- **Global coverage** with regional scaling
- **Cost control** with approval gates

### Squadron 6 Benefits:
- **Elastic training capacity** for varying cohort sizes
- **Client service scaling** as graduates deploy
- **Cost efficiency** with auto-scale down
- **Global distribution** for low latency

## Recommended Scaling Strategy
1. **Start with Cloud Run** for simplicity and cost efficiency
2. **Enable auto-scaling** for Squadron 6 immediately
3. **Manual approval scaling** for Squadron 5 premium instances
4. **Monitor and optimize** scaling triggers based on actual usage
5. **Implement cost alerts** at 80% of monthly budgets

This gives you elastic, cost-effective scaling while maintaining premium service quality.
