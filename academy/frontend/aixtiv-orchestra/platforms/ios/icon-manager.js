import { useState, useEffect } from 'react';

export class IconManager {
constructor() {
    this.MAX_ICONS = 6;
    this.CHANGE_COOLDOWN_DAYS = 30;
    this.CORE_ICONS = ['integrate', 'academy', 'q4d-lenz'];
    this.PERMANENT_TOOLS = ['q4d-lenz'];
}

isCoreIcon(iconId) {
    return this.CORE_ICONS.includes(iconId);
}

isPermanentTool(iconId) {
    return this.PERMANENT_TOOLS.includes(iconId);
}

validateIconChange(lastModified) {
    if (!lastModified) return true;
    const daysSinceChange = (Date.now() - lastModified) / (1000 * 60 * 60 * 24);
    return daysSinceChange >= this.CHANGE_COOLDOWN_DAYS;
}
}

export const useIconState = () => {
const [activeIcons, setActiveIcons] = useState([]);
const [iconHistory, setIconHistory] = useState({});
const [ownerGoals, setOwnerGoals] = useState({});

const manager = new IconManager();

const activateIcon = (icon) => {
    const nonCoreActiveIcons = activeIcons.filter(i => !manager.isCoreIcon(i.id));
    if (nonCoreActiveIcons.length >= (manager.MAX_ICONS - manager.CORE_ICONS.length)) {
        throw new Error('Maximum number of active icons reached');
    }

    const lastModified = iconHistory[icon.id]?.lastModified;
    if (!manager.validateIconChange(lastModified)) {
    throw new Error('Icon cannot be changed yet - monthly restriction');
    }

    setActiveIcons(prev => [...prev, icon]);
    setIconHistory(prev => ({
    ...prev,
    [icon.id]: {
        lastModified: Date.now(),
        prompts: [],
        goals: []
    }
    }));
};

const deactivateIcon = (iconId) => {
    setActiveIcons(prev => prev.filter(icon => icon.id !== iconId));
};

const linkToGoal = (iconId, goalId) => {
    setIconHistory(prev => ({
    ...prev,
    [iconId]: {
        ...prev[iconId],
        goals: [...(prev[iconId]?.goals || []), goalId]
    }
    }));
};

const addPrompt = (iconId, prompt) => {
    setIconHistory(prev => ({
    ...prev,
    [iconId]: {
        ...prev[iconId],
        prompts: [...(prev[iconId]?.prompts || []), prompt]
    }
    }));
};

return {
    activeIcons,
    iconHistory,
    ownerGoals,
    activateIcon,
    deactivateIcon,
    linkToGoal,
    addPrompt
};
};

