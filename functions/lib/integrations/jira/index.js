"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JIRA_CONFIG = exports.jiraService = exports.JiraService = void 0;
const jira_service_1 = require("./jira-service");
Object.defineProperty(exports, "JiraService", { enumerable: true, get: function () { return jira_service_1.JiraService; } });
Object.defineProperty(exports, "jiraService", { enumerable: true, get: function () { return jira_service_1.jiraService; } });
const jira_config_1 = require("./jira-config");
Object.defineProperty(exports, "JIRA_CONFIG", { enumerable: true, get: function () { return jira_config_1.JIRA_CONFIG; } });
exports.default = jira_service_1.jiraService;
//# sourceMappingURL=index.js.map