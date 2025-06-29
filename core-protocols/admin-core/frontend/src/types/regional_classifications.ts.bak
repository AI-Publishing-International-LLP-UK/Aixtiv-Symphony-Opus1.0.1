/**
* Global and Regional Classification Systems
* Including Latin American and Asian Standards
*/

// Regional Classification Systems by Continent
export enum RegionalClassificationSystem {

// Latin America
CIUO = 'Clasificación Internacional Uniforme de Ocupaciones', // Spanish ISCO
CBO = 'Classificação Brasileira de Ocupações', // Brazilian Classification
CMO = 'Clasificador Mexicano de Ocupaciones', // Mexican Classification
CIIU = 'Clasificación Industrial Internacional Uniforme', // Spanish ISIC
CAES = 'Clasificador de Actividades Económicas para Encuestas Sociodemográficas', // Argentina
CINE = 'Clasificación Internacional Normalizada de la Educación', // Spanish UNESCO

// Asia
CCDO = 'China Classification and Directory of Occupations',
NCO = 'National Classification of Occupations', // India
KSIC = 'Korean Standard Industrial Classification',
JSIC = 'Japan Standard Industrial Classification',
PSIC = 'Philippine Standard Industrial Classification',
TSIC = 'Thailand Standard Industrial Classification',
VSIC = 'Vietnam Standard Industrial Classification',

// International Standards (for reference)
ISCO = 'International Standard Classification of Occupations',
ISIC = 'International Standard Industrial Classification'
}

// Regional Standards Configuration
export interface RegionalStandard {
system: RegionalClassificationSystem
country: string
language: string[]
baseStandard?: RegionalClassificationSystem // If derived from international standard
currentVersion: string
implementation: {
    official: boolean
    governingBody: string
    lastUpdate: Date
    nextUpdate?: Date
}
mappings: {
    international: {
    iscoMapping?: string
    isicMapping?: string
    }
    regional: Record<string, string> // Maps to other regional standards
}
}

// Regional Classification Entry
export interface RegionalClassificationEntry {
code: string
system: RegionalClassificationSystem
titles: {
    local: string
    english: string
    alternate: Record<string, string[]> // Language code -> titles
}
hierarchy: {
    level: number
    parent?: string
    children?: string[]
    path: string[]
}
descriptions: {
    local: string
    english: string
    context?: Record<string, string>
}
regionalSpecifics: {
    culturalContext?: string[]
    regionalUsage?: string[]
    localRegulations?: string[]
}
}

// Asian Classification Specifics
export interface AsianClassificationSystem {
system: RegionalClassificationSystem
characteristics: {
    usesCharacters: boolean
    characterSet: 'simplified' | 'traditional' | 'other'
    romanization?: string // e.g., 'pinyin', 'romaji'
}
structure: {
    levels: number
    codingPattern: string
    specialFeatures: string[]
}
equivalencies: {
    international: Record<string, string[]>
    regional: Record<string, string[]>
}
}

// Latin American Classification Specifics
export interface LatinAmericanClassificationSystem {
system: RegionalClassificationSystem
characteristics: {
    dialect: string
    regionalVariations: string[]
    indigenousConsiderations?: string[]
}
structure: {
    levels: number
    codingPattern: string
    mercosurCompliant?: boolean
}
equivalencies: {
    international: Record<string, string[]>
    regional: Record<string, string[]>
}
}

// Regional Data Collection Configuration
export interface RegionalDataCollectionConfig {
region: 'asia' | 'latinAmerica' | 'other'
systems: RegionalClassificationSystem[]
sources: Array<{
    name: string
    url: string
    type: 'api' | 'database' | 'file'
    format: string
    authentication?: Record<string, any>
    updateFrequency: string
}>
processing: {
    languageHandling: {
    primaryLanguage: string
    translations: string[]
    transliteration?: boolean
    }
    mappingRules: {
    toInternational: Record<string, string>
    crossRegional: Record<string, string>
    }
    validation: {
    rules: Record<string, any>
    culturalChecks: boolean
    regionalCompliance: boolean
    }
}
}

// Regional Integration Status
export interface RegionalIntegrationStatus {
region: string
system: RegionalClassificationSystem
status: 'active' | 'pending' | 'failed'
coverage: {
    occupations: number
    sectors: number
    mappedToISCO: number
    mappedToISIC: number
    localSpecific: number
}
lastUpdate: {
    timestamp: Date
    source: string
    changes: number
    issues?: string[]
}
quality: {
    completeness: number
    accuracyScore: number
    mappingCoverage: number
    validationStatus: string
}
}

