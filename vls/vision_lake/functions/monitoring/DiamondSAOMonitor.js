const { DiamondSAO } = require('@aixtiv/diamond-sao');
const { AlertSystem } = require('@aixtiv/alert-system');
const { MetricsAnalyzer } = require('@aixtiv/metrics-analyzer');

class DiamondSAOMonitor {
  constructor(config) {
    this.diamondSAO = new DiamondSAO(config.diamondSAO);
    this.alertSystem = new AlertSystem(config.alerts);
    this.analyzer = new MetricsAnalyzer(config.analyzer);

    // Warning thresholds
    this.THRESHOLDS = {
      systemHealth: 0.85,
      rewardDistribution: 0.90,
      participationRate: 0.75,
      fairnessScore: 0.95
    };
  }

  async monitorSystemHealth() {
    const healthMetrics = await this.diamondSAO.getSystemHealth();
    
    if (healthMetrics.score < this.THRESHOLDS.systemHealth) {
      await this.alertSystem.notify({
        level: 'warning',
        type: 'system_health',
        message: `System health score (${healthMetrics.score}) below threshold`,
        details: healthMetrics.issues,
        recommendations: healthMetrics.fixes
      });
    }

    return healthMetrics;
  }

  async watchRewardDistribution() {
    const distribution = await this.diamondSAO.getRewardMetrics();
    
    // Check for unfair distributions
    const fairnessScore = await this.analyzer.calculateFairness(distribution);
    
    if (fairnessScore < this.THRESHOLDS.fairnessScore) {
      await this.alertSystem.notify({
        level: 'critical',
        type: 'reward_fairness',
        message: 'Potential unfair reward distribution detected',
        details: {
          score: fairnessScore,
          issues: distribution.anomalies,
          affectedAgents: distribution.impactedAgents
        }
      });
    }

    return {
      distribution,
      fairnessScore,
      status: fairnessScore >= this.THRESHOLDS.fairnessScore ? 'optimal' : 'needs_review'
    };
  }

  async trackParticipation() {
    const participation = await this.diamondSAO.getParticipationMetrics();
    
    if (participation.rate < this.THRESHOLDS.participationRate) {
      await this.alertSystem.notify({
        level: 'warning',
        type: 'low_participation',
        message: 'Agent participation rate below threshold',
        details: {
          currentRate: participation.rate,
          expectedRate: this.THRESHOLDS.participationRate,
          inactiveAgents: participation.inactiveAgents
        },
        recommendations: participation.engagementSuggestions
      });
    }

    return participation;
  }

  async detectAnomalies() {
    const anomalies = await this.analyzer.detectSystemAnomalies();
    
    if (anomalies.length > 0) {
      await this.alertSystem.notify({
        level: 'warning',
        type: 'system_anomalies',
        message: `${anomalies.length} system anomalies detected`,
        details: anomalies.map(a => ({
          type: a.type,
          severity: a.severity,
          impact: a.impact,
          location: a.location
        }))
      });
    }

    return anomalies;
  }

  async generateMayorReport() {
    const [health, rewards, participation, anomalies] = await Promise.all([
      this.monitorSystemHealth(),
      this.watchRewardDistribution(),
      this.trackParticipation(),
      this.detectAnomalies()
    ]);

    return {
      timestamp: new Date().toISOString(),
      systemStatus: {
        health: health.score,
        issues: health.issues.length,
        criticalAlerts: health.issues.filter(i => i.severity === 'critical').length
      },
      rewardMetrics: {
        fairnessScore: rewards.fairnessScore,
        distributionStatus: rewards.status,
        anomalies: rewards.distribution.anomalies.length
      },
      participationMetrics: {
        rate: participation.rate,
        activeAgents: participation.activeAgents,
        inactiveAgents: participation.inactiveAgents.length
      },
      systemAnomalies: {
        count: anomalies.length,
        severity: this.calculateAnomalySeverity(anomalies),
        recommendations: this.generateRecommendations(anomalies)
      },
      recommendations: {
        immediate: this.prioritizeActions(health, rewards, participation, anomalies),
        shortTerm: this.generateShortTermPlans(health, rewards, participation),
        longTerm: this.generateLongTermStrategy(health, rewards, participation)
      }
    };
  }

  calculateAnomalySeverity(anomalies) {
    const severityScores = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 1
    };

    return anomalies.reduce((score, anomaly) => 
      score + severityScores[anomaly.severity], 0) / anomalies.length;
  }

  generateRecommendations(anomalies) {
    return anomalies
      .sort((a, b) => b.severity - a.severity)
      .map(anomaly => ({
        action: anomaly.recommendedAction,
        priority: anomaly.severity,
        impact: anomaly.potentialImpact,
        timeline: anomaly.suggestedTimeline
      }));
  }

  prioritizeActions(health, rewards, participation, anomalies) {
    const actions = [];
    
    if (health.score < this.THRESHOLDS.systemHealth) {
      actions.push({
        type: 'system_health',
        priority: 'critical',
        action: 'Address system health issues',
        details: health.fixes
      });
    }

    if (rewards.fairnessScore < this.THRESHOLDS.fairnessScore) {
      actions.push({
        type: 'reward_fairness',
        priority: 'high',
        action: 'Review reward distribution system',
        details: rewards.distribution.anomalies
      });
    }

    return actions;
  }
}

module.exports = DiamondSAOMonitor;

