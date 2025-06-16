const { NFTShowcase } = require('@2100/nft-showcase');
const { Timeline } = require('@2100/timeline-view');
const { LiveStats } = require('@2100/live-statistics');

class EnhancedNFTDisplay {
  constructor(config) {
    this.showcase = new NFTShowcase({
      showcaseId: config.showcaseId,
      displayOptions: {
        interactive3D: true,
        zoomable: true,
        rotatable: true
      }
    });

    this.timeline = new Timeline({
      timelineId: config.timelineId,
      options: {
        chronological: true,
        categorized: true,
        milestones: true
      }
    });

    this.liveStats = new LiveStats({
      statsId: config.statsId,
      refreshRate: '5s',
      metrics: ['contributions', 'recognitions', 'rankings']
    });
  }

  async createAcesDisplay(pilotData) {
    const display = await this.showcase.createSpecialGallery({
      type: pilotData.experienceYears < 5 ? 'jr_aces' : 'aces',
      pilot: {
        name: pilotData.name,
        rank: pilotData.rank,
        specialties: pilotData.specialties,
        achievements: pilotData.achievements
      },
      display: {
        theme: 'ace_wall',
        layout: '3d_showcase',
        features: {
          rotatingDisplay: true,
          achievementSpotlight: true,
          rankBadge: true
        }
      }
    });

    return display;
  }

  async updateTimelineView(achievements) {
    return this.timeline.addMilestones(achievements.map(achievement => ({
      date: achievement.timestamp,
      title: achievement.title,
      category: achievement.category,
      nftRef: achievement.nftId,
      significance: achievement.significance
    })));
  }

  async createLiveStatsDisplay(pilotId) {
    return this.liveStats.createDashboard({
      pilotId: pilotId,
      displays: [
        {
          type: 'contribution_chart',
          timeRange: '24h',
          updateFrequency: '5m'
        },
        {
          type: 'recognition_feed',
          limit: 10,
          autoScroll: true
        },
        {
          type: 'ranking_position',
          context: ['overall', 'specialty', 'experience_group']
        }
      ]
    });
  }
}

module.exports = EnhancedNFTDisplay;

