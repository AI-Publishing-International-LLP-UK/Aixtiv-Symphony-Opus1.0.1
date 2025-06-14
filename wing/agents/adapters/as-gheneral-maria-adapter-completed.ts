/**
 * Extract communication style parameters
 */
private extractCommunicationParameters(message: string): {
  targetCulture: string;
  communicationType: string;
} {
  // Default values
  let targetCulture = 'generic';
  let communicationType = 'general';
  
  // Try to extract target culture
  const cultureMatches = message.match(/(?:for|with|to)\s+(?:a|an)?\s*([a-zA-Z]+)(?:\s+audience|culture|context)?/i);
  if (cultureMatches && cultureMatches[1]) {
    targetCulture = this.normalizeCulture(cultureMatches[1]);
  }
  
  // Determine communication type
  if (message.toLowerCase().includes('business')) {
    communicationType = 'business';
  } else if (message.toLowerCase().includes('email') || message.toLowerCase().includes('mail')) {
    communicationType = 'email';
  } else if (message.toLowerCase().includes('presentation') || message.toLowerCase().includes('speech')) {
    communicationType = 'presentation';
  } else if (message.toLowerCase().includes('meeting') || message.toLowerCase().includes('conference')) {
    communicationType = 'meeting';
  } else if (message.toLowerCase().includes('negotiation') || message.toLowerCase().includes('deal')) {
    communicationType = 'negotiation';
  } else if (message.toLowerCase().includes('social') || message.toLowerCase().includes('casual')) {
    communicationType = 'social';
  }
  
  return { targetCulture, communicationType };
}

/**
 * Get communication style notes
 */
private getCommunicationStyleNotes(culture: string, communicationType: string): string[] {
  // Base notes for the culture
  const baseNotes = this.getCommunicationBaseNotes(culture);
  
  // Add type-specific notes
  const typeNotes = this.getCommunicationTypeNotes(culture, communicationType);
  
  return [...baseNotes, ...typeNotes];
}

/**
 * Get base communication notes for a culture
 */
private getCommunicationBaseNotes(culture: string): string[] {
  const notes: Record<string, string[]> = {
    'us': [
      'Generally direct and explicit communication',
      'Emphasis on clarity and efficiency',
      'Informal tone is often acceptable',
      'Active participation expected in discussions'
    ],
    'jp': [
      'Indirect communication that emphasizes harmony',
      'Formal language with attention to hierarchy',
      'Implicit messaging with contextual understanding',
      'Avoidance of direct disagreement or conflict'
    ],
    'cn': [
      'Indirect communication focused on maintaining face',
      'Hierarchical language adjustments based on status',
      'Relationship context influences communication style',
      'Reading between the lines important for understanding'
    ],
    'de': [
      'Direct and explicit communication valued',
      'Formal address until informality is established',
      'Fact-based discussions with limited small talk',
      'Thorough explanations preferred to conciseness'
    ],
    'fr': [
      'Formal language with specific address forms',
      'Appreciation for discussion and debate',
      'Politeness and proper etiquette emphasized',
      'Communication considered an art form'
    ]
  };
  
  return notes[culture] || [
    'Consider appropriate formality level',
    'Be aware of direct vs. indirect preferences',
    'Adjust pace and tone to audience expectations',
    'Research specific communication protocols'
  ];
}

/**
 * Get communication type notes
 */
private getCommunicationTypeNotes(culture: string, communicationType: string): string[] {
  const typeNotes: Record<string, Record<string, string[]>> = {
    'us': {
      'business': [
        'Focus on data and results',
        'Clear action items and next steps',
        'Brief introductions before getting to business'
      ],
      'email': [
        'Clear subject lines that state purpose',
        'Concise content with bullet points for readability',
        'Direct requests with deadlines when applicable'
      ],
      'presentation': [
        'Begin with engaging hook or overview',
        'Include data and metrics to support points',
        'Interactive elements and audience participation'
      ],
      'meeting': [
        'Expected to start on time with clear agenda',
        'Active participation from all attendees',
        'Decisions often made during the meeting'
      ],
      'negotiation': [
        'Direct approach to stating requirements',
        'Focus on mutual benefits and win-win outcomes',
        'Clear decision-making authority expected'
      ]
    },
    'jp': {
      'business': [
        'Begin with proper introductions and small talk',
        'Respect hierarchical speaking order',
        'Decisions usually made behind the scenes'
      ],
      'email': [
        'Formal opening and closing expressions',
        'Polite language that shows respect',
        'Indirect approach to requests'
      ],
      'presentation': [
        'Thorough preparation and detailed materials',
        'Modest self-presentation and group recognition',
        'Questions often saved until the end'
      ],
      'meeting': [
        'Preceded by nemawashi (consensus-building)',
        'Junior members speak less than seniors',
        'Main purpose often to confirm decisions'
      ],
      'negotiation': [
        'Relationship building precedes business discussion',
        'Emphasis on long-term partnership',
        'Indirect communication of concerns or disagreement'
      ]
    }
  };
  
  if (typeNotes[culture] && typeNotes[culture][communicationType]) {
    return typeNotes[culture][communicationType];
  }
  
  // Default type notes
  const defaultTypeNotes: Record<string, string[]> = {
    'business': [
      'Research industry-specific protocols',
      'Understand appropriate formality level',
      'Learn expected meeting and greeting customs'
    ],
    'email': [
      'Use appropriate salutations and closings',
      'Consider formality level for the recipient',
      'Be aware of response time expectations'
    ],
    'presentation': [
      'Research audience expectations for structure',
      'Understand appropriate level of interaction',
      'Learn cultural preferences for data vs. stories'
    ],
    'meeting': [
      'Know punctuality expectations',
      'Understand speaking order protocols',
      'Be aware of decision-making processes'
    ],
    'negotiation': [
      'Learn relationship vs. transaction focus',
      'Understand directness vs. indirectness norms',
      'Research decision-making authority expectations'
    ],
    'social': [
      'Learn appropriate topics for small talk',
      'Understand personal space and touching norms',
      'Be aware of gift-giving customs if applicable'
    ]
  };
  
  return defaultTypeNotes[communicationType] || [
    'Adjust formality to the situation',
    'Research specific communication protocols',
    'Consider relationship context and expectations'
  ];
}

/**
 * Check if a culture is high-context
 */
private isHighContextCulture(culture: string): boolean {
  const highContextCultures = [
    'jp', 'cn', 'kr', 'tw', 'sa', 'ae', 'mx', 'br', 'es',
    'it', 'fr', 'gr', 'tr', 'ru', 'in', 'th', 'vn'
  ];
  
  return highContextCultures.includes(culture);
}

/**
 * Get formality level for a culture
 */
private getFormalityLevel(culture: string): string {
  const formalityLevels: Record<string, string> = {
    'us': 'Low to moderate formality in business; first names common',
    'jp': 'High formality with hierarchical language; titles and last names',
    'cn': 'High formality with respect for hierarchy and titles',
    'de': 'High formality with specific address forms until relationship established',
    'fr': 'Moderate to high formality with specific conventions',
    'uk': 'Moderate formality with polite indirectness',
    'br': 'Moderate formality with quick transition to first names',
    'in': 'High formality with respect for status and titles'
  };
  
  return formalityLevels[culture] || 'Varies by region and specific context';
}

/**
 * Get directness level for a culture
 */
private getDirectnessLevel(culture: string): string {
  const directnessLevels: Record<string, string> = {
    'us': 'High directness; explicit communication valued',
    'jp': 'Low directness; implicit communication with attention to harmony',
    'cn': 'Low to moderate directness; face considerations important',
    'de': 'Very high directness; explicit feedback and communication',
    'fr': 'Moderate directness; intellectual debate valued but with tact',
    'uk': 'Low directness; understatement and politeness valued',
    'nl': 'Very high directness; straightforward communication expected',
    'fi': 'High directness; concise and to-the-point communication'
  };
  
  return directnessLevels[culture] || 'Varies by region and individual preferences';
}

/**
 * Get relationship focus for a culture
 */
private getRelationshipFocus(culture: string): string {
  const relationshipFocus: Record<string, string> = {
    'us': 'Task-oriented; relationships secondary to objectives',
    'jp': 'Relationship-oriented; trust building precedes business',
    'cn': 'Strongly relationship-oriented; guanxi (connections) essential',
    'de': 'Task-oriented; clear separation between business and personal',
    'fr': 'Balanced; relationships important but with professional boundaries',
    'uk': 'Moderately task-oriented with relationship building through shared experiences',
    'br': 'Strongly relationship-oriented; personal connections vital',
    'in': 'Relationship-oriented; hospitality and personal connection valued'
  };
  
  return relationshipFocus[culture] || 'Varies by organization and individual preferences';
}

/**
 * Get communication examples
 */
private getCommunicationExamples(culture: string, communicationType: string): Record<string, string> {
  // Default examples
  const defaultExample = {
    'effective': 'Clear, respectful communication adapted to local norms',
    'ineffective': 'Direct translation of home cultural norms without adaptation'
  };
  
  const examples: Record<string, Record<string, Record<string, string>>> = {
    'us': {
      'email': {
        'effective': 'Hi [Name], I hope this email finds you well. Could you please send the report by Friday? Thanks, [Your Name]',
        'ineffective': 'To Whom It May Concern, It is imperative that the aforementioned report be submitted in due course. Regards.'
      },
      'meeting': {
        'effective': 'Let's get started. Our goal today is to decide on X. Any questions before we begin?',
        'ineffective': 'We will now commence the discussion according to the predetermined agenda items.'
      }
    },
    'jp': {
      'email': {
        'effective': 'Dear [Last Name]-san, Thank you for your continued support. If it is convenient for you, would you be able to share the report when your schedule allows? Respectfully, [Your Full Name]',
        'ineffective': 'Hi [First Name], I need that report by Friday. Thanks!'
      },
      'meeting': {
        'effective': 'Thank you all for taking the time to meet today. We are grateful for your input on this project. Perhaps we could begin with your thoughts, [Senior Person]-san?',
        'ineffective': 'OK everyone, let's dive right in. I think we should do X. What do you all think?'
      }
    }
  };
  
  if (examples[culture] && examples[culture][communicationType]) {
    return examples[culture][communicationType];
  }
  
  return defaultExample;
}

/**
 * Extract etiquette parameters
 */
private extractEtiquetteParameters(message: string): {
  targetCulture: string;
  context: string;
} {
  // Default values
  let targetCulture = 'generic';
  let context = 'business';
  
  // Try to extract target culture
  const cultureMatches = message.match(/(?:in|for|with)\s+(?:a|an)?\s*([a-zA-Z]+)(?:\s+context|culture|setting)?/i);
  if (cultureMatches && cultureMatches[1]) {
    targetCulture = this.normalizeCulture(cultureMatches[1]);
  }
  
  // Determine context
  if (
    message.toLowerCase().includes('business') || 
    message.toLowerCase().includes('professional') || 
    message.toLowerCase().includes('work')
  ) {
    context = 'business';
  } else if (
    message.toLowerCase().includes('dining') || 
    message.toLowerCase().includes('meal') || 
    message.toLowerCase().includes('restaurant') ||
    message.toLowerCase().includes('eating')
  ) {
    context = 'dining';
  } else if (
    message.toLowerCase().includes('gift') || 
    message.toLowerCase().includes('present')
  ) {
    context = 'gift-giving';
  } else if (
    message.toLowerCase().includes('social') || 
    message.toLowerCase().includes('informal') || 
    message.toLowerCase().includes('casual')
  ) {
    context = 'social';
  } else if (
    message.toLowerCase().includes('meeting') || 
    message.toLowerCase().includes('introduction') || 
    message.toLowerCase().includes('greeting')
  ) {
    context = 'introduction';
  }
  
  return { targetCulture, context };
}

/**
 * Get etiquette guidelines
 */
private getEtiquetteGuidelines(culture: string, context: string): string[] {
  // Get context-specific guidelines
  const contextGuidelines: Record<string, Record<string, string[]>> = {
    'us': {
      'business': [
        'Firm handshake with direct eye contact',
        'Business cards exchanged casually',
        'Punctuality expected for meetings',
        'First names often used even in professional settings'
      ],
      'dining': [
        'Fork held in right hand (or switched with knife)',
        'Tipping 15-20% customary in restaurants',
        'Acceptable to begin eating when most people are served',
        'Informal toasts common at business meals'
      ],
      'gift-giving': [
        'Gifts opened when received',
        'Thank you notes appreciated for significant gifts',
        'Office gifts typically modest and practical',
        'Group gifts common for colleagues' special occasions'
      ]
    },
    'jp': {
      'business': [
        'Bow appropriate to status and situation',
        'Business cards (meishi) exchanged with both hands',
        'Study card received before putting away',
        'Punctuality extremely important'
      ],
      'dining': [
        'Wait for host to begin eating',
        'Pour drinks for others, not yourself',
        'Say "itadakimasu" before eating',
        'Slurping noodles is acceptable and shows appreciation'
      ],
      'gift-giving': [
        'Gifts wrapped elegantly, often not opened when received',
        'Gift quality reflects relationship importance',
        'Seasonal gift-giving expected (ochugen, oseibo)',
        'Avoid gifts in sets of four or nine (unlucky numbers)'
      ]
    }
  };
  
  if (contextGuidelines[culture] && contextGuidelines[culture][context]) {
    return contextGuidelines[culture][context];
  }
  
  // Default etiquette guidelines by context
  const defaultGuidelines: Record<string, string[]> = {
    'business': [
      'Research appropriate greetings and introductions',
      'Understand business card exchange protocols',
      'Learn punctuality expectations',
      'Be aware of proper titles and forms of address'
    ],
    'dining': [
      'Research table manners and utensil use',
      'Learn when to begin eating',
      'Understand tipping customs',
      'Be aware of toasting protocols'
    ],
    'gift-giving': [
      'Learn appropriate occasions for gifts',
      'Research gift opening customs',
      'Understand appropriate gift types and values',
      'Be aware of any unlucky numbers or taboo gifts'
    ],
    'social': [
      'Learn greeting customs including physical contact',
      'Understand personal space expectations',
      'Research appropriate topics for conversation',
      'Be aware of hosting and guest expectations'
    ],
    'introduction': [
      'Learn proper forms of address and titles',
      'Understand physical greeting customs',
      'Research business card exchange if applicable',
      'Be aware of appropriate small talk topics'
    ]
  };
  
  return defaultGuidelines[context] || [
    'Research specific etiquette for the situation',
    'Observe and follow the lead of local counterparts',
    'When in doubt, err toward more formal behavior',
    'Apologize sincerely for any unintended faux pas'
  ];
}

/**
 * Get business greeting customs
 */
private getGreetings(culture: string): string[] {
  const greetings: Record<string, string[]> = {
    'us': [
      'Handshake with medium firmness',
      'Direct eye contact while greeting',
      'First name basis common in many settings',
      'Casual "Hi" or "Hello" with colleagues'
    ],
    'jp': [
      'Bow at appropriate angle for situation',
      'Business card exchange with both hands',
      'Last name with "-san" suffix',
      'Limited physical contact'
    ],
    'cn': [
      'Light handshake, sometimes with slight bow',
      'Business cards exchanged with both hands',
      'Use titles and last names',
      'Limited physical contact'
    ],
    'fr': [
      'Light cheek kisses (bises) in social settings',
      'Handshake in business settings',
      'Formal address with Monsieur/Madame until invited to use first names',
      'Eye contact during greeting'
    ],
    'sa': [
      'Men: Light handshake with right hand only',
      'Limited physical contact between genders',
      'Verbal greeting "As-salamu alaykum"',
      'Use titles and last names'
    ]
  };
  
  return greetings[culture] || [
    'Research appropriate physical contact',
    'Learn verbal greeting phrases',
    'Understand appropriate formality level',
    'Be aware of gender-specific considerations'
  ];
}

/**
 * Get business card protocol
 */
private getBusinessCardProtocol(culture: string): string {
  const protocols: Record<string, string> = {
    'us': 'Casual exchange, typically one-handed. Cards may be put away immediately.',
    'jp': 'Formal exchange with two hands and slight bow. Study card before carefully placing in card holder.',
    'cn': 'Present and receive with both hands. Gold lettering and high-quality cards appreciated.',
    'kr': 'Present and receive with both hands. Use right hand or both hands, never left hand only.',
    'de': 'Direct exchange without ceremony. Include academic titles on cards if applicable.',
    'fr': 'Exchange after initial introductions. Quality cards reflect professional image.',
    'ru': 'Include Russian translation on reverse side. Academic or professional credentials important.',
    'sa': 'Right hand only for presenting. Include Arabic translation. No female photos on cards.'
  };
  
  return protocols[culture] || 'Research local customs for card exchange. Generally, higher quality cards are appreciated in most cultures.';
}

/**
 * Get gift giving practices
 */
private getGiftGivingPractices(culture: string): string[] {
  const practices: Record<string, string[]> = {
    'us': [
      'Gifts typically opened when received',
      'Thank you notes for significant gifts',
      'Simple wrapping acceptable',
      'Moderate value business gifts'
    ],
    'jp': [
      'Elegant wrapping essential',
      'Not typically opened in front of giver',
      'Seasonal gift cycles (ochugen, oseibo)',
      'Reciprocity expected'
    ],
    'cn': [
      'Gifts refused initially before accepting',
      'Present and receive with both hands',
      'Avoid white wrapping (associated with funerals)',
      'Avoid clocks, knives, or gifts in sets of four'
    ],
    'ru': [
      'Flowers in odd numbers (except 13)',
      'Avoid yellow flowers (signify separation)',
      'Vodka or quality alcohol often appreciated',
      'Small gifts for hosts when visiting homes'
    ],
    'in': [
      'Gifts wrapped in bright colors',
      'Offer and receive with right hand or both hands',
      'Avoid leather for Hindu recipients',
      'Money gifts in odd numbers considered lucky'
    ]
  };
  
  return practices[culture] || [
    'Research appropriate gift types',
    'Learn wrapping customs',
    'Understand when gifts should be opened',
    'Be aware of any taboo gifts or colors'
  ];
}

/**
 * Get dining etiquette
 */
private getDiningEtiquette(culture: string): string[] {
  const etiquette: Record<string, string[]> = {
    'us': [
      'Wait for host to begin eating',
      'Napkin in lap when seated',
      'Fork in right hand (or switched with knife)',
      'Tipping 15-20% standard in restaurants'
    ],
    'jp': [
      'Say "itadakimasu" before eating',
      'Do not stick chopsticks upright in rice',
      'Slurping noodles shows appreciation',
      'Pour drinks for others, not yourself'
    ],
    'cn': [
      'Host orders and often serves food',
      'Try all dishes offered',
      'Leave some food on plate when finished',
      'Communal dishes with serving utensils'
    ],
    'in': [
      'Wash hands before eating',
      'Traditional eating with right hand only',
      'Sharing food is common practice',
      'Leave some food on plate when finished'
    ],
    'sa': [
      'Eat with right hand only',
      'Accept coffee/tea three times',
      'Praise food but avoid excessive compliments',
      'Wait for eldest or host to begin'
    ]
  };
  
  return etiquette[culture] || [
    'Research appropriate utensil use',
    'Learn when to begin eating',
    'Understand serving and sharing customs',
    'Be aware of finishing and leaving table etiquette'
  ];
}

/**
 * Get taboo conversation topics
 */
private getTabooTopics(culture: string): string[] {
  const topics: Record<string, string[]> = {
    'us': [
      'Personal income and finances',
      'Polarizing politics',
      'Religious beliefs',
      'Age and weight'
    ],
    'jp': [
      'Direct criticism or conflict',
      'Personal questions about family or marital status',
      'World War II references',
      'Very personal compliments'
    ],
    'cn': [
      'Taiwan political status',
      'Criticism of government',
      'Personal financial questions',
      'Discussing failures or shortcomings'
    ],
    'in': [
      'Pakistan relations',
      'Caste system criticism',
      'Beef consumption with Hindu colleagues',
      'Religious tensions'
    ],
    'sa': [
      'Criticism of Islam or royal family',
      'Israel relations',
      'Alcohol or pork consumption',
      'Dating or relationships with opposite gender'
    ]
  };
  
  return topics[culture] || [
    'Political tensions and conflicts',
    'Religious criticisms',
    'Very personal financial questions',
    'Local controversial historical events'
  ];
}

/**
 * Get non-verbal communication notes
 */
private getNonVerbalCommunication(culture: string): Record<string, string> {
  const nonVerbal: Record<string, Record<string, string>> = {
    'us': {
      'eye_contact': 'Direct eye contact shows engagement and honesty',
      'personal_space': 'Arm's length (about 2-3 feet) in conversation',
      'gestures': 'Animated gestures common and acceptable',
      'touch': 'Limited to handshakes in business; more casual among friends'
    },
    'jp': {
      'eye_contact': 'Limited direct eye contact, especially with superiors',
      'personal_space': 'Larger personal space than Western cultures',
      'gestures': 'Subdued hand movements; pointing with entire hand',
      'touch': 'Minimal physical contact beyond formal greetings'
    },
    'sa': {
      'eye_contact': 'Limited between genders; direct between same gender',
      'personal_space': 'Close for same gender; larger between genders',
      'gestures': 'Left hand avoided for gestures or giving items',
      'touch': 'Same gender may touch; avoided between genders'
    },
    'br': {
      'eye_contact': 'Strong eye contact expected during conversation',
      'personal_space': 'Closer conversational distance than North America',
      'gestures': 'Animated and expressive gestures common',
      'touch': 'Frequent touch during conversation; hugs and cheek kisses common'
    }
  };
  
  if (nonVerbal[culture]) {
    return nonVerbal[culture];
  }
  
  return {
    'eye_contact': 'Research appropriate eye contact norms',
    'personal_space': 'Observe local personal space expectations',
    'gestures': 'Be aware of potentially offensive gestures',
    'touch': 'Follow local customs for physical contact'
  };
}
}

/**
 * Export all agent adapters
 * This completes the AIXTIV SYMPHONY Agent AI Adapters module
 * These adapters are part of the R1, R2, and R3 squadron structure (33 agents total)
 */
export {
  AgentAIAdapter,
  BaseAgentAdapter,
  DrMemoriaAdapter,
  DrLucyAdapter,
  DrMatchAdapter,
  DrMariaAdapter
};