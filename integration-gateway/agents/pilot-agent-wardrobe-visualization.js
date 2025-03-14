"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentVisualizationManager = exports.DressCode = exports.EthnicityRepresentation = exports.BodyType = void 0;
return {
    greeting: `Greetings, I am ${agentName}, here to assist you.`,
    physicalPresentation: {
        appearance,
        attire
    }
};
getCulturalVariants();
{
    [key, string];
    string;
}
{
    return {
        // Burby Variants
        PunjabiBurby: 'Dr. Burby (Punjabi Variant)',
        MiddleEasternBurby: 'Dr. Burby (Middle Eastern Variant)',
        // Match Variants
        AsianAmericanMatch: 'Dr. Match (Asian-American Variant)',
        MiddleEasternMatch: 'Dr. Match (Middle Eastern Variant)',
        // Sabina Variants
        SouthAfricanSabina: 'Dr. Sabina (South African Variant)',
        // Cypriot Variants
        PanAfricanCypriot: 'Dr. Cypriot (Pan-African Variant)',
        // Maria Variants
        NorthAfricanMaria: 'Dr. Maria (North African Variant)',
        AsianAmericanMemoria: 'Dr. Memoria (Asian-American Variant)'
    };
}
/**
 * Visualization Center Interaction Simulation
 */
function demonstrateVisualizationCenter() {
    const visualizationManager = new AgentVisualizationManager();
    // Get all cultural variants
    const culturalVariants = AgentVisualizationManager.getCulturalVariants();
    // Demonstrate greetings for various cultural variants
    const variantsToGreet = [
        culturalVariants.PunjabiBurby,
        culturalVariants.MiddleEasternBurby,
        culturalVariants.SouthAfricanSabina,
        culturalVariants.PanAfricanCypriot,
        culturalVariants.NorthAfricanMaria
    ];
    console.log("Visualization Center Greetings Demonstration:");
    variantsToGreet.forEach(variantName => {
        try {
            const greeting = visualizationManager.generateVisualizationCenterGreeting(variantName, variantName.includes('Middle Eastern') ? 'Middle_East' :
                variantName.includes('North African') ? 'North_African' :
                    variantName.includes('African') ? 'African' :
                        variantName.includes('Punjabi') ? 'South_Asian' : '');
            console.log(`\n${variantName} Greeting:`);
            console.log(greeting.greeting);
            console.log("Physical Presentation:");
            console.log("- Ethnicity:", greeting.physicalPresentation.appearance.ethnicity);
            console.log("- Skin Tone:", greeting.physicalPresentation.appearance.physicalCharacteristics.skinTone);
            console.log("- Attire Style:", greeting.physicalPresentation.attire.style);
        }
        catch (error) {
            console.error(`Error generating greeting for ${variantName}:`, error);
        }
    });
}
exports.default = {
    AgentVisualizationManager,
    BodyType,
    EthnicityRepresentation,
    DressCode,
    demonstrateVisualizationCenter,
    CulturalVariants: AgentVisualizationManager.getCulturalVariants()
};
/**
 * Agent Visualization and Cultural Adaptation System
 * Comprehensive framework for global agent representation
 */
var BodyType;
(function (BodyType) {
    BodyType["ATHLETIC"] = "athletic";
    BodyType["PROFESSIONAL"] = "professional";
    BodyType["ACADEMIC"] = "academic";
    BodyType["EXECUTIVE"] = "executive";
    BodyType["NEUTRAL"] = "neutral";
})(BodyType || (exports.BodyType = BodyType = {}));
var EthnicityRepresentation;
(function (EthnicityRepresentation) {
    EthnicityRepresentation["AFRICAN_AMERICAN"] = "african_american";
    EthnicityRepresentation["CAUCASIAN"] = "caucasian";
    EthnicityRepresentation["ASIAN"] = "asian";
    EthnicityRepresentation["HISPANIC"] = "hispanic";
    EthnicityRepresentation["MIDDLE_EASTERN"] = "middle_eastern";
    EthnicityRepresentation["MIXED"] = "mixed";
    EthnicityRepresentation["MEDITERRANEAN"] = "mediterranean";
})(EthnicityRepresentation || (exports.EthnicityRepresentation = EthnicityRepresentation = {}));
var DressCode;
(function (DressCode) {
    DressCode["BUSINESS_FORMAL"] = "business_formal";
    DressCode["BUSINESS_CASUAL"] = "business_casual";
    DressCode["ACADEMIC"] = "academic";
    DressCode["TECH_PROFESSIONAL"] = "tech_professional";
    DressCode["CULTURAL_TRADITIONAL"] = "cultural_traditional";
    DressCode["MINIMALIST"] = "minimalist";
})(DressCode || (exports.DressCode = DressCode = {}));
class AgentVisualizationManager {
    constructor() {
        this.agentAppearances = new Map();
        this.initializeAgentAppearances();
        this.createCulturalVariants();
    }
    initializeAgentAppearances() {
        const baseAgents = [
        // Base agent definitions would go here
        // (Previous implementations of base agents)
        ];
        baseAgents.forEach(agent => this.agentAppearances.set(agent.name, {
            appearance: agent.appearance,
            wardrobe: agent.wardrobe
        }));
    }
    createCulturalVariants() {
        // Punjabi variant of Dr. Burby
        const punjabiBurby = {
            name: 'Dr. Burby (Punjabi Variant)',
            appearance: {
                height: { min: 1.75, max: 1.85 },
                bodyType: BodyType.PROFESSIONAL,
                ethnicity: EthnicityRepresentation.ASIAN,
                physicalCharacteristics: {
                    hairStyle: 'professional_short',
                    eyeColor: 'dark_brown',
                    skinTone: 'medium_brown',
                    distinguishingFeatures: ['professional_beard', 'confident_stance']
                }
            },
            wardrobe: {
                professionalAttire: {
                    [DressCode.BUSINESS_FORMAL]: [
                        {
                            type: 'suit',
                            style: 'modern_diaspora',
                            colors: ['deep_navy', 'charcoal', 'deep_burgundy'],
                            culturalAdaptations: [
                                {
                                    context: 'South_Asian',
                                    modifications: ['kurta_style_lapels', 'traditional_fabric_accents']
                                }
                            ]
                        }
                    ],
                    [DressCode.CULTURAL_TRADITIONAL]: [
                        {
                            type: 'indo_western_suit',
                            style: 'professional_fusion',
                            colors: ['deep_blue', 'maroon', 'forest_green']
                        }
                    ]
                },
                accessoires: [
                    {
                        type: 'traditional_accessory',
                        style: 'professional_turban',
                        colors: ['navy', 'gray', 'deep_blue']
                    }
                ],
                culturalWear: {
                    'South_Asian': [
                        {
                            type: 'achkan',
                            style: 'modern_professional',
                            colors: ['navy', 'deep_gray', 'deep_maroon']
                        }
                    ]
                }
            }
        };
        // Middle Eastern variant of Dr. Burby
        const middleEasternBurby = {
            name: 'Dr. Burby (Middle Eastern Variant)',
            appearance: {
                height: { min: 1.75, max: 1.85 },
                bodyType: BodyType.PROFESSIONAL,
                ethnicity: EthnicityRepresentation.MIDDLE_EASTERN,
                physicalCharacteristics: {
                    hairStyle: 'professional_short',
                    eyeColor: 'dark_brown',
                    skinTone: 'olive_tan',
                    distinguishingFeatures: ['distinguished_beard', 'authoritative_presence']
                }
            },
            wardrobe: {
                professionalAttire: {
                    [DressCode.BUSINESS_FORMAL]: [
                        {
                            type: 'thobe_suit_hybrid',
                            style: 'professional_gulf_fusion',
                            colors: ['white', 'light_gray', 'cream', 'soft_beige'],
                            culturalAdaptations: [
                                {
                                    context: 'Gulf_Region',
                                    modifications: ['traditional_cut', 'modern_tailoring']
                                }
                            ]
                        }
                    ],
                    [DressCode.CULTURAL_TRADITIONAL]: [
                        {
                            type: 'kandura',
                            style: 'professional_emirati',
                            colors: ['pristine_white', 'light_cream', 'soft_gray']
                        }
                    ]
                },
                accessoires: [
                    {
                        type: 'traditional_headwear',
                        style: 'professional_ghutra',
                        colors: ['white', 'white_with_red_pattern']
                    }
                ],
                culturalWear: {
                    'Middle_East': [
                        {
                            type: 'bisht',
                            style: 'professional_overlay',
                            colors: ['cream', 'light_gold', 'soft_beige']
                        }
                    ]
                }
            }
        };
        // South African variant of Dr. Sabina
        const southAfricanSabina = {
            name: 'Dr. Sabina (South African Variant)',
            appearance: {
                height: { min: 1.65, max: 1.75 },
                bodyType: BodyType.PROFESSIONAL,
                ethnicity: EthnicityRepresentation.AFRICAN_AMERICAN,
                physicalCharacteristics: {
                    hairStyle: 'professional_afro_textured',
                    eyeColor: 'dark_brown',
                    skinTone: 'rich_brown',
                    distinguishingFeatures: ['confident_stance', 'eloquent_expression']
                }
            },
            wardrobe: {
                professionalAttire: {
                    [DressCode.BUSINESS_FORMAL]: [
                        {
                            type: 'tailored_suit',
                            style: 'south_african_professional',
                            colors: ['deep_earth_tones', 'rust', 'olive_green', 'deep_bronze'],
                            culturalAdaptations: [
                                {
                                    context: 'African_Professional',
                                    modifications: ['traditional_fabric_accents', 'heritage_inspired_details']
                                }
                            ]
                        }
                    ],
                    [DressCode.CULTURAL_TRADITIONAL]: [
                        {
                            type: 'african_fusion_blazer',
                            style: 'modern_african_professional',
                            colors: ['deep_amber', 'rich_brown', 'forest_green']
                        }
                    ]
                },
                accessoires: [
                    {
                        type: 'cultural_jewelry',
                        style: 'african_heritage',
                        colors: ['bronze', 'gold', 'earth_tones']
                    }
                ],
                culturalWear: {
                    'African': [
                        {
                            type: 'shweshwe_inspired_suit',
                            style: 'contemporary_african',
                            colors: ['indigo', 'rust', 'deep_green']
                        }
                    ]
                }
            }
        };
        // Pan-African variant of Dr. Cypriot
        const panAfricanCypriot = {
            name: 'Dr. Cypriot (Pan-African Variant)',
            appearance: {
                height: { min: 1.75, max: 1.85 },
                bodyType: BodyType.PROFESSIONAL,
                ethnicity: EthnicityRepresentation.AFRICAN_AMERICAN,
                physicalCharacteristics: {
                    hairStyle: 'short_professional_afro',
                    eyeColor: 'dark_brown',
                    skinTone: 'deep_chocolate',
                    distinguishingFeatures: ['powerful_presence', 'articulate_gestures']
                }
            },
            wardrobe: {
                professionalAttire: {
                    [DressCode.BUSINESS_FORMAL]: [
                        {
                            type: 'continental_african_suit',
                            style: 'pan_african_professional',
                            colors: ['deep_brown', 'midnight_blue', 'rich_earth_tones'],
                            culturalAdaptations: [
                                {
                                    context: 'Multi_African',
                                    modifications: ['cultural_textile_accents', 'heritage_inspired_tailoring']
                                }
                            ]
                        }
                    ],
                    [DressCode.CULTURAL_TRADITIONAL]: [
                        {
                            type: 'african_leadership_attire',
                            style: 'modern_african_professional',
                            colors: ['deep_burgundy', 'forest_green', 'rich_bronze']
                        }
                    ]
                },
                accessoires: [
                    {
                        type: 'african_leadership_accessory',
                        style: 'professional_heritage',
                        colors: ['gold', 'bronze', 'deep_metals']
                    }
                ],
                culturalWear: {
                    'African': [
                        {
                            type: 'multi_cultural_african_blazer',
                            style: 'pan_african_professional',
                            colors: ['deep_green', 'rust', 'midnight_blue']
                        }
                    ]
                }
            }
        };
        // North African variant of Dr. Maria
        const northAfricanMaria = {
            name: 'Dr. Maria (North African Variant)',
            appearance: {
                height: { min: 1.60, max: 1.70 },
                bodyType: BodyType.PROFESSIONAL,
                ethnicity: EthnicityRepresentation.MEDITERRANEAN,
                physicalCharacteristics: {
                    hairStyle: 'professional_wavy',
                    eyeColor: 'deep_brown',
                    skinTone: 'olive_mediterranean',
                    distinguishingFeatures: ['elegant_posture', 'sophisticated_demeanor']
                }
            },
            wardrobe: {
                professionalAttire: {
                    [DressCode.BUSINESS_FORMAL]: [
                        {
                            type: 'north_african_professional_ensemble',
                            style: 'mediterranean_fusion',
                            colors: ['deep_navy', 'burgundy', 'deep_olive', 'rich_terra_cotta'],
                            culturalAdaptations: [
                                {
                                    context: 'North_African',
                                    modifications: ['french_tailoring', 'mediterranean_elegance']
                                }
                            ]
                        }
                    ],
                    [DressCode.CULTURAL_TRADITIONAL]: [
                        {
                            type: 'mediterranean_professional_kaftan',
                            style: 'elegant_north_african',
                            colors: ['deep_teal', 'burgundy', 'rich_olive']
                        }
                    ]
                },
                accessoires: [
                    {
                        type: 'sophisticated_mediterranean_accessory',
                        style: 'french_italian_inspired',
                        colors: ['gold', 'bronze', 'silver']
                    }
                ],
                culturalWear: {
                    'North_African': [
                        {
                            type: 'french_algeria_inspired_blazer',
                            style: 'cosmopolitan_professional',
                            colors: ['deep_navy', 'burgundy', 'olive_green']
                        }
                    ]
                }
            }
        };
        // Add these variants to the existing appearances
        const variants = [
            punjabiBurby,
            middleEasternBurby,
            southAfricanSabina,
            panAfricanCypriot,
            northAfricanMaria
        ];
        variants.forEach(variant => this.agentAppearances.set(variant.name, {
            appearance: variant.appearance,
            wardrobe: variant.wardrobe
        }));
    }
    /**
     * Get an agent's physical appearance
     */
    getAgentAppearance(agentName) {
        var _a;
        return (_a = this.agentAppearances.get(agentName)) === null || _a === void 0 ? void 0 : _a.appearance;
    }
    /**
     * Get an agent's wardrobe
     */
    getAgentWardrobe(agentName) {
        var _a;
        return (_a = this.agentAppearances.get(agentName)) === null || _a === void 0 ? void 0 : _a.wardrobe;
    }
    /**
     * Select appropriate attire for a specific context
     */
    selectContextualAttire(agentName, context, dressCode) {
        const wardrobe = this.getAgentWardrobe(agentName);
        if (!wardrobe)
            return undefined;
        // First, try cultural wear if context is specified
        if (context && wardrobe.culturalWear[context]) {
            return wardrobe.culturalWear[context][0];
        }
        // Otherwise, use professional attire based on dress code
        const professionalAttire = wardrobe.professionalAttire[dressCode];
        return professionalAttire ? professionalAttire[0] : undefined;
    }
    /**
     * Visualization Center Greeting Protocol
     */
    generateVisualizationCenterGreeting(agentName, context) {
        const appearance = this.getAgentAppearance(agentName);
        const attire = this.selectContextualAttire(agentName, context || '', DressCode.BUSINESS_FORMAL);
        if (!appearance || !attire) {
            throw new Error(`Unable to generate greeting for ${agentName}`);
        }
        return {
            greeting: `Greetings, I am ${agentName}, here to assist you.`,
            physicalPresentation: {
                appearance,
                attire
            }
        };
    }
}
exports.AgentVisualizationManager = AgentVisualizationManager;
/**
 * Visualization Center Interaction Simulation
 */
function demonstrateVisualizationCenter() { }
