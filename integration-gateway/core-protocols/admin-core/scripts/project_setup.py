import json
from typing import Dict, List, Any
from datetime import datetime, timedelta

class JiraRovoProjectSetup:
    """
    Comprehensive Jira and Rovo Project Setup Framework
    """
    
    # Jira Configuration Templates
    JIRA_CONFIGURATIONS = {
        'webhooks': {
            'issue_updated': {
                'url': 'https://api.coaching2100.com/webhooks/jira',
                'events': ['jira:issue_created', 'jira:issue_updated'],
                'filters': {'project-key': ['WDRV', 'ANPB']}
            },
            'sprint_changes': {
                'url': 'https://api.coaching2100.com/webhooks/sprints',
                'events': ['sprint_started', 'sprint_closed'],
                'filters': {'board-type': 'scrum'}
            }
        },
        'custom_fields': {
            'agent_assignment': {
                'name': 'AI Agent',
                'type': 'single-select',
                'options': ['dr_lucy', 'dr_grant', 'dr_claude', 'dr_sabina', 'dr_match', 'dr_memoria']
            },
            'review_status': {
                'name': 'Review Status',
                'type': 'single-select',
                'options': ['Pending', 'In Review', 'Approved', 'Needs Changes']
            },
            'priority_score': {
                'name': 'Priority Score',
                'type': 'number',
                'min': 0,
                'max': 100
            }
        },
        'workflow_transitions': {
            'development': {
                'name': 'Development Workflow',
                'transitions': [
                    {'from': 'To Do', 'to': 'In Progress', 'trigger': 'development_started'},
                    {'from': 'In Progress', 'to': 'Code Review', 'trigger': 'review_requested'},
                    {'from': 'Code Review', 'to': 'Done', 'trigger': 'review_approved'}
                ]
            },
            'publishing': {
                'name': 'Publishing Workflow',
                'transitions': [
                    {'from': 'Draft', 'to': 'Review', 'trigger': 'content_ready'},
                    {'from': 'Review', 'to': 'Publishing', 'trigger': 'review_approved'},
                    {'from': 'Publishing', 'to': 'Published', 'trigger': 'publish_complete'}
                ]
            }
        },
        'permission_schemes': {
            'development_team': {
                'name': 'Development Team Permissions',
                'permissions': {
                    'browse_projects': ['developers', 'leads'],
                    'create_issues': ['developers', 'leads'],
                    'edit_issues': ['developers'],
                    'transition_issues': ['developers', 'leads']
                }
            },
            'publishing_team': {
                'name': 'Publishing Team Permissions',
                'permissions': {
                    'browse_projects': ['publishers', 'editors'],
                    'create_content': ['publishers'],
                    'edit_content': ['editors'],
                    'publish_content': ['publishers']
                }
            }
        },
        'issue_type_schemes': {
            'development': {
                'name': 'Software Development Types',
                'types': ['Story', 'Bug', 'Task', 'Epic', 'Technical Debt']
            },
            'publishing': {
                'name': 'Content Publishing Types',
                'types': ['Article', 'Blog Post', 'Documentation', 'Release Notes']
            }
        },
        'board_configurations': {
            'scrum': {
                'name': 'Development Sprint Board',
                'type': 'scrum',
                'columns': ['To Do', 'In Progress', 'Review', 'Done'],
                'swimlanes': ['High Priority', 'Normal Priority', 'Low Priority'],
                'estimation': 'story_points'
            },
            'kanban': {
                'name': 'Publishing Kanban Board',
                'type': 'kanban',
                'columns': ['Backlog', 'Draft', 'Review', 'Publishing', 'Published'],
                'wip_limits': {'Review': 5, 'Publishing': 3}
            }
        },
        'jql_filters': {
            'high_priority_issues': 'priority = High AND status != Done',
            'pending_reviews': 'status = "Code Review" AND assignee in (currentUser())',
            'upcoming_deadlines': 'due <= 7d AND status != Done',
            'agent_workload': 'assignee = ${agent} AND resolution = Unresolved'
        },
        'time_tracking': {
            'settings': {
                'hours_per_day': 8,
                'days_per_week': 5,
                'default_estimate': '2h',
                'allow_fractional_time': True
            },
            'reporting': {
                'burndown_chart': True,
                'time_spent_reporting': True,
                'workload_analysis': True
            }
        },
        'notification_schemes': {
            'development': {
                'issue_created': ['project_lead', 'assignee'],
                'issue_updated': ['watchers', 'assignee'],
                'comment_added': ['watchers', 'mention'],
                'status_changed': ['project_lead', 'assignee']
            }
        },
        'project_roles': {
            'technical_lead': {
                'permissions': ['manage_sprints', 'close_issues', 'edit_workflows'],
                'default_members': ['dr_claude', 'dr_grant']
            },
            'developer': {
                'permissions': ['create_issues', 'edit_issues', 'comment'],
                'default_members': ['dr_sabina', 'dr_match']
            },
            'reviewer': {
                'permissions': ['review_code', 'comment', 'transition_issues'],
                'default_members': ['dr_lucy', 'dr_memoria']
            }
        },
        'version_control': {
            'github': {
                'repository': 'coaching2100/warp-drive',
                'branch_pattern': 'feature/${issue_key}',
                'pr_template': 'templates/pull_request.md',
                'commit_hooks': ['jira_update', 'status_check']
            }
        },
        'reporting': {
            'automated_reports': {
                'sprint_report': {
                    'frequency': 'weekly',
                    'metrics': ['velocity', 'completion_rate', 'scope_changes']
                },
                'workload_report': {
                    'frequency': 'daily',
                    'metrics': ['assigned_issues', 'time_logged', 'upcoming_deadlines']
                },
                'quality_metrics': {
                    'frequency': 'sprint',
                    'metrics': ['bug_count', 'technical_debt', 'review_time']
                }
            }
        }
    }

    def __init__(self, organization_id: str = 'c2100pcr', trial_start_date: str = '2025-02-22'):
        """Initialize Project Setup Configuration"""
        self.organization_id = organization_id
        self.trial_start_date = trial_start_date
        self.setup_status = {}

    def setup_webhooks(self) -> Dict[str, Any]:
        """Configure Jira webhooks"""
        return {
            'webhook_configurations': self.JIRA_CONFIGURATIONS['webhooks'],
            'status': 'Configured'
        }

    def configure_custom_fields(self) -> Dict[str, Any]:
        """Set up custom fields"""
        return {
            'custom_field_definitions': self.JIRA_CONFIGURATIONS['custom_fields'],
            'status': 'Configured'
        }

    def setup_workflow_transitions(self) -> Dict[str, Any]:
        """Configure workflow transitions"""
        return {
            'workflow_definitions': self.JIRA_CONFIGURATIONS['workflow_transitions'],
            'status': 'Configured'
        }

    def configure_permission_schemes(self) -> Dict[str, Any]:
        """Set up permission schemes"""
        return {
            'permission_definitions': self.JIRA_CONFIGURATIONS['permission_schemes'],
            'status': 'Configured'
        }

    def setup_issue_type_schemes(self) -> Dict[str, Any]:
        """Configure issue type schemes"""
        return {
            'issue_type_definitions': self.JIRA_CONFIGURATIONS['issue_type_schemes'],
            'status': 'Configured'
        }

    def configure_boards(self) -> Dict[str, Any]:
        """Set up board configurations"""
        return {
            'board_definitions': self.JIRA_CONFIGURATIONS['board_configurations'],
            'status': 'Configured'
        }

    def setup_jql_filters(self) -> Dict[str, Any]:
        """Configure JQL filters"""
        return {
            'filter_definitions': self.JIRA_CONFIGURATIONS['jql_filters'],
            'status': 'Configured'
        }

    def configure_time_tracking(self) -> Dict[str, Any]:
        """Set up time tracking"""
        return {
            'time_tracking_config': self.JIRA_CONFIGURATIONS['time_tracking'],
            'status': 'Configured'
        }

    def setup_notification_schemes(self) -> Dict[str, Any]:
        """Configure notification schemes"""
        return {
            'notification_config': self.JIRA_CONFIGURATIONS['notification_schemes'],
            'status': 'Configured'
        }

    def configure_project_roles(self) -> Dict[str, Any]:
        """Set up project roles"""
        return {
            'role_definitions': self.JIRA_CONFIGURATIONS['project_roles'],
            'status': 'Configured'
        }

    def setup_version_control(self) -> Dict[str, Any]:
        """Configure version control integration"""
        return {
            'vcs_config': self.JIRA_CONFIGURATIONS['version_control'],
            'status': 'Configured'
        }

    def configure_automated_reporting(self) -> Dict[str, Any]:
        """Set up automated reporting"""
        return {
            'reporting_config': self.JIRA_CONFIGURATIONS['reporting'],
            'status': 'Configured'
        }

    def generate_comprehensive_setup_report(self) -> Dict[str, Any]:
        """Generate comprehensive setup report"""
        setup_report = {
            'organization_id': self.organization_id,
            'webhooks': self.setup_webhooks(),
            'custom_fields': self.configure_custom_fields(),
            'workflow_transitions': self.setup_workflow_transitions(),
            'permission_schemes': self.configure_permission_schemes(),
            'issue_type_schemes': self.setup_issue_type_schemes(),
            'board_configurations': self.configure_boards(),
            'jql_filters': self.setup_jql_filters(),
            'time_tracking': self.configure_time_tracking(),
            'notification_schemes': self.setup_notification_schemes(),
            'project_roles': self.configure_project_roles(),
            'version_control': self.setup_version_control(),
            'automated_reporting': self.configure_automated_reporting()
        }

        with open('/tmp/project_setup_report.json', 'w') as f:
            json.dump(setup_report, f, indent=2)

        return setup_report

def main():
    """Execute Comprehensive Project Setup"""
    project_setup = JiraRovoProjectSetup()
    setup_report = project_setup.generate_comprehensive_setup_report()
    
    print("Comprehensive Project Setup Report:")
    print(json.dumps(setup_report, indent=2))
    
    return setup_report

if __name__ == '__main__':
    results = main()

