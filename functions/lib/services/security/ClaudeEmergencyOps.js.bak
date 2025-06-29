"use strict";
// Claude Emergency Ops Module (C.E.O.M)
// Version 1.0 – Designed for Vision Lake / ASOOS Command Layer
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeEmergencyOps = void 0;
const core_1 = require("@asooos/core");
class ClaudeEmergencyOps {
    static async drainLake(options) {
        core_1.Logger.warn(`[DRAIN] Claude override initiated by ${options.issuedBy}: ${options.reason}`);
        // Step 1: Halt orchestration
        core_1.OrchestrationGraph.freezeAll();
        // Step 2: Preserve memory snapshot if requested
        if (options.preserveMemory) {
            await core_1.MemorySystem.snapshot("pre-drain", options.timestamp || new Date());
        }
        // Step 3: Audit log
        core_1.Logger.event("override", {
            action: "drain",
            issuedBy: options.issuedBy,
            reason: options.reason,
            time: new Date().toISOString(),
        });
    }
    static async restorePlan(opts) {
        core_1.Logger.info(`[RESTORE] Request by ${opts.issuedBy} to restore plan from ${opts.from.toISOString()} in mode: ${opts.mode}`);
        const snapshot = await core_1.MemorySystem.loadSnapshotByTime(opts.from);
        if (!snapshot)
            throw new Error("No snapshot found for specified time");
        let graph = snapshot.orchestrationGraph;
        if (opts.mode === "rebased") {
            graph = ClaudeEmergencyOps.rebaseTimestamps(graph);
        }
        if (opts.mode === "ghost") {
            core_1.Logger.info("Ghost mode active: simulation only, no live reactivation");
            return graph;
        }
        // Re-activate the restored plan
        core_1.OrchestrationGraph.load(graph);
        core_1.OrchestrationGraph.start();
        core_1.Logger.event("restore", {
            action: "restore_plan",
            from: opts.from.toISOString(),
            mode: opts.mode,
            issuedBy: opts.issuedBy,
            executedAt: new Date().toISOString(),
        });
    }
    static rebaseTimestamps(graph) {
        const now = Date.now();
        const delta = now - new Date(graph.timestamp).getTime();
        graph.tasks = graph.tasks.map((task) => (Object.assign(Object.assign({}, task), { scheduledFor: new Date(new Date(task.scheduledFor).getTime() + delta).toISOString() })));
        graph.timestamp = new Date().toISOString();
        return graph;
    }
    static registerOverrideRole(role) {
        core_1.Auth.allow(role, ["override", "restore"]);
    }
    static async auditTrail() {
        return core_1.Logger.query({ category: ["override", "restore"] });
    }
}
exports.ClaudeEmergencyOps = ClaudeEmergencyOps;
// CLI Shortcuts (to bind to your next-gen-aixtiv CLI)
// claude override:drain --reason="reset" --by="CEO"
// claude restore --from="2025-05-07T14:00" --mode=rebased --by="CEO"
//# sourceMappingURL=ClaudeEmergencyOps.js.map