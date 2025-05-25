import { EventEmitter } from 'events';

class PromptEngine {
constructor() {
    this.emitter = new EventEmitter();
}

async processIconSelection(iconId, ownerGoals) {
    const prompts = await this.generateIconPrompts(iconId, ownerGoals);
    this.notifyAgents(iconId, prompts);
    return prompts;
}

async generateIconPrompts(iconId, ownerGoals) {
    // Generate contextual prompts based on icon and owner goals
    const basePrompts = {
    integrate: ["How can we integrate this with existing systems?", "What integration points need attention?"],
    academy: ["What learning objectives align with this goal?", "How can we structure this knowledge?"],
    'q4d-lenz': ["What patterns emerge from this analysis?", "How does this align with quality standards?"]
    };

    return basePrompts[iconId] || [];
}

notifyAgents(iconId, prompts) {
    this.emitter.emit('iconUpdate', {
    icon: iconId,
    prompts,
    timestamp: Date.now()
    });
}

subscribeToUpdates(callback) {
    this.emitter.on('iconUpdate', callback);
}

unsubscribeFromUpdates(callback) {
    this.emitter.off('iconUpdate', callback);
}
}

export default new PromptEngine();
    

the academy offer 10 20 and 30 minu sessions if teh owner wants  to  unlock skill rlea eat icona and mroe 
adnd the gen ai educatin comes from gen ai reaction to the customers 'icon s and theri prtompt engite  



