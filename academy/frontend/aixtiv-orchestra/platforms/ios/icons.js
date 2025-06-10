import React, { useState } from 'react';
import { colors, typography, effects } from './design-tokens';

const HockeyPuckIcon = ({ 
label, 
color = colors.base.primary, 
children, 
onClick,
lastModified,
goals = [],
prompts = []
}) => {
const [isHovered, setIsHovered] = useState(false);

const styles = {
    container: {
    position: 'relative',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    },
    puck: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${colors.effects.glow}`,
    transition: 'all 0.2s ease-in-out',
    boxShadow: isHovered 
        ? `0 ${effects.uplight.offset} ${effects.uplight.blur} ${effects.uplight.spread} rgba(255,255,255,${effects.uplight.opacity})`
        : 'none',
    },
    label: {
    position: 'absolute',
    top: '-20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: colors.base.shadow,
    color: colors.effects.glow,
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: typography.sizes.small,
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.2s ease-in-out',
    whiteSpace: 'nowrap',
    },
};

return (
    <div 
    style={styles.container}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    onClick={onClick}
    >
    <div style={styles.puck}>
        {children}
    </div>
    {label && <div style={styles.label}>{label}</div>}
    </div>
);
};

export const CommunicateIcon = (props) => (
<HockeyPuckIcon label="communicate" {...props}>
    <span>💬</span>
</HockeyPuckIcon>
);

export const GrowIcon = (props) => (
<HockeyPuckIcon label="grow" {...props}>
    <span>🌱</span>
</HockeyPuckIcon>
);

export const CustomerIcon = (props) => (
<HockeyPuckIcon label="customer" {...props}>
    <span>👥</span>
</HockeyPuckIcon>
);

export const ProcessIcon = (props) => (
<HockeyPuckIcon label="process" {...props}>
    <span>⚙️</span>
</HockeyPuckIcon>
);

export const DesignIcon = (props) => (
<HockeyPuckIcon label="design" {...props}>
    <span>🎨</span>
</HockeyPuckIcon>
);

export const AutomateIcon = (props) => (
<HockeyPuckIcon label="automate" {...props}>
    <span>🤖</span>
</HockeyPuckIcon>
);

export const RoiIcon = (props) => (
<HockeyPuckIcon label="roi" {...props}>
    <span>📈</span>
</HockeyPuckIcon>
);

export const WishIcon = (props) => (
<HockeyPuckIcon label="wish" {...props}>
    <span>⭐</span>
</HockeyPuckIcon>
);

export const PrepareIcon = (props) => (
<HockeyPuckIcon label="prepare" {...props}>
    <span>📝</span>
</HockeyPuckIcon>
);

export const DeliverIcon = (props) => (
<HockeyPuckIcon label="deliver" {...props}>
    <span>🚀</span>
</HockeyPuckIcon>
);

export const PresentIcon = (props) => (
<HockeyPuckIcon label="present" {...props}>
    <span>🎯</span>
</HockeyPuckIcon>
);

export const IntegrateIcon = (props) => (
<HockeyPuckIcon label="integrate" {...props} isCore={true}>
    <span>🔄</span>
</HockeyPuckIcon>
);

export const AcademyIcon = (props) => (
<HockeyPuckIcon label="academy" {...props} isCore={true}>
    <span>🎓</span>
</HockeyPuckIcon>
);

export const Q4DLenzIcon = (props) => (
<HockeyPuckIcon label="q4d-lenz" {...props} isPermanent={true}>
    <span>🔍</span>
</HockeyPuckIcon>
);

export const coreIcons = [IntegrateIcon, AcademyIcon, Q4DLenzIcon];

export const standardIcons = [
CommunicateIcon,
GrowIcon, 
CustomerIcon,
ProcessIcon,
DesignIcon,
AutomateIcon,
RoiIcon,
WishIcon,
PrepareIcon,
DeliverIcon,
PresentIcon
];

export default HockeyPuckIcon;

