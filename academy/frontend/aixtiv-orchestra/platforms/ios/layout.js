import React, { useState } from 'react';
import { colors, typography, effects } from './design-tokens';

const Layout = ({ children, currentPage, totalPages }) => {
const { activeIcons } = useIconState();

const styles = {
    container: {
    display: 'flex',
    minHeight: '100vh',
    background: colors.base.primary,
    },
    
    iconMenu: {
    width: '48px',
    backgroundColor: colors.base.shadow,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 8px',
    gap: '15px',
    boxShadow: `${effects.shadow.offset} 0 ${effects.shadow.blur} ${effects.shadow.spread} rgba(0,0,0,${effects.shadow.opacity})`,
    },
    
    mainContent: {
    flex: 1,
    padding: '20px',
    position: 'relative',
    },
    
    bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: '48px', // Match iconMenu width
    right: 0,
    height: '32px',
    backgroundColor: colors.base.shadow,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    fontSize: typography.sizes.small,
    },
    
    copyright: {
    color: colors.effects.glow,
    textAlign: 'right',
    },
    
    pageNumber: {
    color: colors.effects.glow,
    },
};

const IconMenu = () => (
    <div style={styles.iconMenu}>
    {activeIcons.map((icon, index) => (
        <IconButton key={index} icon={icon} />
    ))}
    </div>
);

return (
    <div style={styles.container}>
    <IconMenu />
    <div style={styles.mainContent}>
        {children}
        <div style={styles.bottomBar}>
        <div style={styles.pageNumber}>
            Page {currentPage} of {totalPages}
        </div>
        <div style={styles.copyright}>
            © {new Date().getFullYear()} All Rights Reserved
        </div>
        </div>
    </div>
    </div>
);
};

const IconButton = ({ icon }) => {
return (
    <button
    style={{
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: colors.effects.glow,
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    }}
    onClick={icon.onClick}
    >
    {icon.component}
    </button>
);
};


export default Layout;

