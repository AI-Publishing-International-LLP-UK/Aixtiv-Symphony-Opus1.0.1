/**
* Design Tokens - Signature Style v1.1
* Core design system definitions for the aixtiv-orchestra interface
*/

export const colors = {
// Base color with computed variations
base: {
    primary: '#3A4F66',
    uplight: '#4B6582',  // 20% lighter
    shadow: '#2A3B4D',   // 20% darker
},

effects: {
    glow: 'rgba(255, 255, 255, 0.15)',
    ambient: 'rgba(0, 0, 0, 0.08)',
}
};

export const typography = {
sizes: {
    verySmall: '5px',    // Minimum size for subtle elements
    small: '9px',        // Secondary information
    medium: '14px',      // Primary content
},

constraints: {
    minLength: 2,
    maxLength: 32,
    allowedFonts: [
    'Inter',
    'Roboto',
    'Open Sans',
    'System-ui'
    ]
}
};

export const effects = {
uplight: {
    offset: '15px',
    blur: '25px',
    spread: '5px',
    opacity: 0.15
},

shadow: {
    offset: '10px',
    blur: '20px',
    spread: '2px',
    opacity: 0.2
}
};

export const ownerCustomization = {
name: {
    allowFontChange: true,
    allowColorChange: true,
    allowSizeChange: true,
},

title: {
    allowFontChange: true,
    allowColorChange: true,
    allowSizeChange: true,
    maxLines: 2
},

theme: {
    allowBaseColorChange: true,
    preserveContrast: true,
    maintainAccessibility: true
}
};

export const portraitFrame = {
dimensions: {
    width: '120px',
    height: '120px'
},

constraints: {
    format: 'image/jpeg',
    maxSize: '2MB',
    aspectRatio: '1:1',
    captureOnly: true,    // No upload allowed, only camera capture
    noWorkElements: true  // Discourage logos and work-related imagery
},

style: {
    borderRadius: '50%',  // Circular frame
    borderWidth: '2px',
    borderStyle: 'solid'
}
};

