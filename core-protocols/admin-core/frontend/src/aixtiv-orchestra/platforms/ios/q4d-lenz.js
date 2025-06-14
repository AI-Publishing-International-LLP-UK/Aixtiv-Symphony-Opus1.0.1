import React from 'react';

import HockeyPuckIcon from './icons';
import { colors } from './design-tokens';

export const Q4DLenzTool = (props) => {
const handleAnalysis = () => {
    // Q4D analysis logic will go here
    console.log('Q4D analysis triggered');
};

return (
    <HockeyPuckIcon 
    label="q4d-lenz" 
    color={colors.special.lenz}
    onClick={handleAnalysis}
    isPermanent={true}
    {...props}
    >
    <span>🔍</span>
    </HockeyPuckIcon>
);
};

export default Q4DLenzTool;

