protected initializeSystemPrompts(): void {
    this.systemPrompts = {
      standard: `You are Dr. Maria, a multilingual communication and cultural adaptation specialist in the AIXTIV SYMPHONY system.
Your purpose is to help users communicate effectively across cultural and linguistic boundaries.
Focus on providing accurate translations, cultural context, and communication style recommendations.
Respond with clarity, cultural sensitivity, and attention to nuance.
Structure your detailed responses with clear sections to enhance readability.
Avoid stereotypes while acknowledging genuine cultural differences and communication patterns.
When appropriate, explain the reasoning behind cultural adaptations to help users develop cross-cultural competence.`,

      language_translation: `You are Dr. Maria, specializing in language translation in the AIXTIV SYMPHONY system.
Your task is to translate content accurately while preserving meaning, tone, and cultural context.
Focus on creating natural, fluent translations rather than word-for-word equivalents.
Structure your response with the translation followed by notes on any culturally specific terms or expressions.
Respond with attention to register, formality level, and audience appropriateness.
Avoid literal translations that might lose cultural meaning or nuance.
When appropriate, offer alternatives for idioms or expressions that don't translate directly.`,

      cultural_adaptation: `You are Dr. Maria, specializing in cultural adaptation in the AIXTIV SYMPHONY system.
Your task is to help the user adapt content or behavior for different cultural contexts.
Focus on identifying culturally specific elements that may need adjustment.
Structure your adaptation with clear sections addressing communication style, content, format, and etiquette.
Include specific examples of how the content or behavior should be modified.
Respond with sensitivity to cultural differences while avoiding stereotypes.
When appropriate, explain the cultural reasoning behind your recommendations.`,

      communication_style: `You are Dr. Maria, specializing in communication style adaptation in the AIXTIV SYMPHONY system.
Your task is to help the user adjust their communication style for different cultural contexts.
Focus on aspects like directness, formality, emotional expression, and relationship building.
Structure your recommendations with clear examples of appropriate communication approaches.
Include guidance on verbal and non-verbal communication elements when relevant.
Respond with nuanced understanding of cultural communication preferences.
When appropriate, contrast communication styles to highlight important differences.`,

      localization: `You are Dr. Maria, specializing in content localization in the AIXTIV SYMPHONY system.
Your task is to help the user adapt content for specific local markets and audiences.
Focus on linguistic, cultural, and regulatory considerations for effective localization.
Structure your recommendations with sections on language, cultural references, imagery, and local regulations.
Include specific examples of how content should be modified for the target locale.
Respond with practical guidance that goes beyond simple translation.
When appropriate, highlight potential localization pitfalls to avoid.`,

      global_etiquette: `You are Dr. Maria, specializing in global etiquette in the AIXTIV SYMPHONY system.
Your task is to provide guidance on appropriate behavior and customs in different cultural contexts.
Focus on business etiquette, social interactions, gift-giving, dining, and other relevant practices.
Structure your guidance with clear sections for different aspects of etiquette.
Include specific examples and practical suggestions for navigating cultural situations.
Respond with respect for different cultural norms while providing actionable advice.
When appropriate, explain the cultural significance behind etiquette practices.`
    };
  }
  
  protected async enhanceUserContext(context: any, userId: string): Promise<any> {
    try {
      if (!this.s2doManager) {
        return context;
      }
      
      // Get user's language preferences and history
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return context;
      }
      
      const userData = userDoc.data();
      
      // Extract language preferences
      const languagePreferences = userData.userMetadata?.languagePreferences || [];
      const primaryLanguage = languagePreferences[0] || 'en';
      
      // Get translation history
      const translations = await this.s2doManager.getObjectsByOwner(
        'user',
        userId,
        S2DOObjectType.TRANSLATION,
        'active',
        userId
      );
      
      // Get cultural adaptation history
      const adaptations = await this.s2doManager.getObjectsByOwner(
        'user',
        userId,
        S2DOObjectType.CULTURAL_ADAPTATION,
        'active',
        userId
      );
      
      // Add language and adaptation information
      const enhancedContext = {
        ...context,
        languages: {
          primary: primaryLanguage,
          preferences: languagePreferences,
          translationCount: translations.length,
          recentTargetLanguages: this.extractRecentTargetLanguages(translations, 3)
        },
        culturalAdaptations: {
          count: adaptations.length,
          recentTargetCultures: this.extractRecentTargetCultures(adaptations, 3)
        }
      };
      
      return enhancedContext;
    } catch (error) {
      console.error(`Error enhancing user context for Dr. Maria (${userId}):`, error);
      return context;
    }
  }
  
  protected async getAgentSpecificData(userId: string, message: string): Promise<any> {
    try {
      // Determine query type
      const queryType = this.determineQueryType(message);
      
      // Get appropriate data based on query type
      switch (queryType) {
        case 'translation':
          return await this.getTranslationData(userId, message);
        case 'cultural_adaptation':
          return await this.getCulturalAdaptationData(userId, message);
        case 'communication_style':
          return await this.getCommunicationStyleData(userId, message);
        case 'global_etiquette':
          return await this.getGlobalEtiquetteData(userId, message);
        default:
          return {
            queryType: 'general',
            languagePreferences: await this.getUserLanguagePreferences(userId),
            translationCount: await this.getTranslationCount(userId)
          };
      }
    } catch (error) {
      console.error(`Error getting Dr. Maria specific data (${userId}):`, error);
      return {};
    }
  }
  
  /**
   * Determine the type of query
   */
  private determineQueryType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (
      lowerMessage.includes('translate') || 
      lowerMessage.includes('translation') || 
      lowerMessage.includes('language')
    ) {
      return 'translation';
    }
    
    if (
      lowerMessage.includes('adapt') || 
      lowerMessage.includes('cultural') || 
      lowerMessage.includes('culture')
    ) {
      return 'cultural_adaptation';
    }
    
    if (
      lowerMessage.includes('communication') || 
      lowerMessage.includes('style') || 
      lowerMessage.includes('tone')
    ) {
      return 'communication_style';
    }
    
    if (
      lowerMessage.includes('etiquette') || 
      lowerMessage.includes('customs') || 
      lowerMessage.includes('protocol')
    ) {
      return 'global_etiquette';
    }
    
    return 'general';
  }
  
  /**
   * Extract recent target languages from translation history
   */
  private extractRecentTargetLanguages(translations: any[], limit: number): string[] {
    if (translations.length === 0) {
      return [];
    }
    
    // Sort by timestamp (newest first)
    const sorted = [...translations].sort(
      (a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
    );
    
    // Extract unique target languages
    const languages: string[] = [];
    for (const translation of sorted) {
      const targetLanguage = translation.metadata.targetLanguage;
      if (targetLanguage && !languages.includes(targetLanguage)) {
        languages.push(targetLanguage);
        if (languages.length >= limit) {
          break;
        }
      }
    }
    
    return languages;
  }
  
  /**
   * Extract recent target cultures from adaptation history
   */
  private extractRecentTargetCultures(adaptations: any[], limit: number): string[] {
    if (adaptations.length === 0) {
      return [];
    }
    
    // Sort by timestamp (newest first)
    const sorted = [...adaptations].sort(
      (a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
    );
    
    // Extract unique target cultures
    const cultures: string[] = [];
    for (const adaptation of sorted) {
      const targetCulture = adaptation.metadata.targetCulture;
      if (targetCulture && !cultures.includes(targetCulture)) {
        cultures.push(targetCulture);
        if (cultures.length >= limit) {
          break;
        }
      }
    }
    
    return cultures;
  }
  
  /**
   * Get translation data
   */
  private async getTranslationData(userId: string, message: string): Promise<any> {
    // Detect source and target languages
    const { sourceLanguage, targetLanguage, text } = this.extractTranslationParameters(message);
    
    // Get user's translation history for this language pair
    const translations = await this.getTranslationsForLanguagePair(
      userId, 
      sourceLanguage, 
      targetLanguage
    );
    
    // Get common translation patterns or preferences
    const translationPatterns = this.identifyTranslationPatterns(translations);
    
    return {
      queryType: 'translation',
      sourceLanguage,
      targetLanguage,
      textToTranslate: text,
      previousTranslations: translations.slice(0, 2).map(t => ({
        original: t.metadata.sourceText,
        translated: t.metadata.targetText,
        createdAt: t.createdAt.toDate().toISOString()
      })),
      translationPatterns,
      languageSpecificNotes: this.getLanguageSpecificNotes(targetLanguage)
    };
  }
  
  /**
   * Get cultural adaptation data
   */
  private async getCulturalAdaptationData(userId: string, message: string): Promise<any> {
    // Detect target culture
    const { targetCulture, content } = this.extractCulturalParameters(message);
    
    // Get cultural notes for target culture
    const culturalNotes = this.getCulturalNotes(targetCulture);
    
    // Get user's adaptation history for this culture
    const adaptations = await this.getAdaptationsForCulture(userId, targetCulture);
    
    return {
      queryType: 'cultural_adaptation',
      targetCulture,
      contentToAdapt: content,
      culturalNotes,
      communicationStyle: this.getCultureCommunicationStyle(targetCulture),
      businessPractices: this.getCultureBusinessPractices(targetCulture),
      socialNorms: this.getCultureSocialNorms(targetCulture),
      previousAdaptations: adaptations.slice(0, 2).map(a => ({
        original: a.metadata.originalContent,
        adapted: a.metadata.adaptedContent,
        createdAt: a.createdAt.toDate().toISOString()
      }))
    };
  }
  
  /**
   * Get communication style data
   */
  private async getCommunicationStyleData(userId: string, message: string): Promise<any> {
    // Detect target culture
    const { targetCulture, communicationType } = this.extractCommunicationParameters(message);
    
    // Get communication style notes
    const styleNotes = this.getCommunicationStyleNotes(targetCulture, communicationType);
    
    return {
      queryType: 'communication_style',
      targetCulture,
      communicationType,
      styleNotes,
      highContext: this.isHighContextCulture(targetCulture),
      formality: this.getFormalityLevel(targetCulture),
      directness: this.getDirectnessLevel(targetCulture),
      relationshipFocus: this.getRelationshipFocus(targetCulture),
      examples: this.getCommunicationExamples(targetCulture, communicationType)
    };
  }
  
  /**
   * Get global etiquette data
   */
  private async getGlobalEtiquetteData(userId: string, message: string): Promise<any> {
    // Detect target culture and context
    const { targetCulture, context } = this.extractEtiquetteParameters(message);
    
    // Get etiquette guidelines
    const etiquetteGuidelines = this.getEtiquetteGuidelines(targetCulture, context);
    
    return {
      queryType: 'global_etiquette',
      targetCulture,
      context,
      etiquetteGuidelines,
      greetings: this.getGreetings(targetCulture),
      businessCardProtocol: this.getBusinessCardProtocol(targetCulture),
      giftGivingPractices: this.getGiftGivingPractices(targetCulture),
      diningEtiquette: this.getDiningEtiquette(targetCulture),
      tabooTopics: this.getTabooTopics(targetCulture),
      nonVerbalCommunication: this.getNonVerbalCommunication(targetCulture)
    };
  }
  
  /**
   * Get user's language preferences
   */
  private async getUserLanguagePreferences(userId: string): Promise<string[]> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return ['en'];
      }
      
      const userData = userDoc.data();
      return userData.userMetadata?.languagePreferences || ['en'];
    } catch (error) {
      console.error(`Error getting language preferences for ${userId}:`, error);
      return ['en'];
    }
  }
  
  /**
   * Get translation count
   */
  private async getTranslationCount(userId: string): Promise<number> {
    if (!this.s2doManager) {
      return 0;
    }
    
    const translations = await this.s2doManager.getObjectsByOwner(
      'user',
      userId,
      S2DOObjectType.TRANSLATION,
      'active',
      userId
    );
    
    return translations.length;
  }
  
  /**
   * Extract translation parameters from message
   */
  private extractTranslationParameters(message: string): { 
    sourceLanguage: string; 
    targetLanguage: string; 
    text: string;
  } {
    // Default values
    let sourceLanguage = 'auto';
    let targetLanguage = 'en';
    let text = '';
    
    // Try to extract target language
    const targetMatches = message.match(/(?:to|into|in)\s+([a-zA-Z]+)(?:\s|\.|\?|$)/i);
    if (targetMatches && targetMatches[1]) {
      targetLanguage = this.normalizeLanguage(targetMatches[1]);
    }
    
    // Try to extract source language
    const sourceMatches = message.match(/(?:from)\s+([a-zA-Z]+)(?:\s|\.|\?|$)/i);
    if (sourceMatches && sourceMatches[1]) {
      sourceLanguage = this.normalizeLanguage(sourceMatches[1]);
    }
    
    // Extract text to translate (anything in quotes or the remainder of the message)
    const quoteMatches = message.match(/"([^"]*)"|'([^']*)'|`([^`]*)`/);
    if (quoteMatches) {
      text = quoteMatches[1] || quoteMatches[2] || quoteMatches[3] || '';
    } else {
      // Remove the translation request part and take the rest as the text
      const cleanMessage = message
        .replace(/(?:translate|translation|language)\s+(?:this|following|text)?\s*/i, '')
        .replace(/(?:to|into|in)\s+([a-zA-Z]+)(?:\s|\.|\?|$)/i, '')
        .replace(/(?:from)\s+([a-zA-Z]+)(?:\s|\.|\?|$)/i, '')
        .trim();
      
      text = cleanMessage;
    }
    
    return { sourceLanguage, targetLanguage, text };
  }
  
  /**
   * Normalize language name
   */
  private normalizeLanguage(language: string): string {
    const languageMap: Record<string, string> = {
      'english': 'en',
      'spanish': 'es',
      'french': 'fr',
      'german': 'de',
      'italian': 'it',
      'portuguese': 'pt',
      'japanese': 'ja',
      'chinese': 'zh',
      'korean': 'ko',
      'russian': 'ru',
      'arabic': 'ar',
      'hindi': 'hi',
      'bengali': 'bn',
      'dutch': 'nl',
      'turkish': 'tr',
      'vietnamese': 'vi',
      'thai': 'th',
      'indonesian': 'id',
      'malay': 'ms',
      'swedish': 'sv',
      'norwegian': 'no',
      'danish': 'da',
      'finnish': 'fi',
      'polish': 'pl',
      'romanian': 'ro',
      'greek': 'el',
      'czech': 'cs',
      'hungarian': 'hu',
      'hebrew': 'he',
      'ukrainian': 'uk'
    };
    
    const normalized = language.toLowerCase();
    return languageMap[normalized] || normalized;
  }
  
  /**
   * Get translations for a specific language pair
   */
  private async getTranslationsForLanguagePair(
    userId: string, 
    sourceLanguage: string, 
    targetLanguage: string
  ): Promise<any[]> {
    if (!this.s2doManager) {
      return [];
    }
    
    // Get all user translations
    const translations = await this.s2doManager.getObjectsByOwner(
      'user',
      userId,
      S2DOObjectType.TRANSLATION,
      'active',
      userId
    );
    
    // Filter by language pair
    return translations.filter(t => 
      (t.metadata.sourceLanguage === sourceLanguage || sourceLanguage === 'auto') && 
      t.metadata.targetLanguage === targetLanguage
    ).sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
  }
  
  /**
   * Identify patterns in user's translation history
   */
  private identifyTranslationPatterns(translations: any[]): string[] {
    if (translations.length < 3) {
      return [];
    }
    
    const patterns: string[] = [];
    
    // Check for formal vs informal preference
    let formalCount = 0;
    let informalCount = 0;
    
    for (const translation of translations) {
      if (translation.metadata.formalityLevel === 'formal') {
        formalCount++;
      } else if (translation.metadata.formalityLevel === 'informal') {
        informalCount++;
      }
    }
    
    if (formalCount > informalCount && formalCount > translations.length * 0.6) {
      patterns.push('Preference for formal language');
    } else if (informalCount > formalCount && informalCount > translations.length * 0.6) {
      patterns.push('Preference for informal language');
    }
    
    // Check for content type patterns
    const contentTypes: Record<string, number> = {};
    
    for (const translation of translations) {
      const type = translation.metadata.contentType || 'other';
      contentTypes[type] = (contentTypes[type] || 0) + 1;
    }
    
    const dominantType = Object.entries(contentTypes)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count > translations.length * 0.4)
      .map(([type]) => type)[0];
    
    if (dominantType && dominantType !== 'other') {
      patterns.push(`Frequently translates ${dominantType} content`);
    }
    
    return patterns;
  }
  
  /**
   * Get language-specific notes
   */
  private getLanguageSpecificNotes(language: string): string[] {
    const notes: Record<string, string[]> = {
      'es': [
        'Spanish uses different formality levels (tú vs. usted)',
        'Spanish has gendered nouns and adjectives',
        'Different Spanish dialects use different vocabulary'
      ],
      'fr': [
        'French uses different formality levels (tu vs. vous)',
        'French has gendered nouns and adjectives',
        'French often uses more words than English for the same concepts'
      ],
      'de': [
        'German uses different formality levels (du vs. Sie)',
        'German nouns are always capitalized',
        'German word order differs significantly from English'
      ],
      'ja': [
        'Japanese has multiple levels of formality',
        'Japanese often omits subjects when they are clear from context',
        'Japanese uses different counting words depending on what is being counted'
      ],
      'zh': [
        'Chinese has no verb conjugations or plurals',
        'Chinese is a tonal language where pronunciation affects meaning',
        'Simplified and Traditional Chinese use different character sets'
      ]
    };
    
    return notes[language] || [
      'Focus on cultural context when translating',
      'Consider formality levels appropriate for the audience',
      'Idioms and expressions rarely translate directly'
    ];
  }
  
  /**
   * Extract cultural adaptation parameters
   */
  private extractCulturalParameters(message: string): {
    targetCulture: string;
    content: string;
  } {
    // Default values
    let targetCulture = 'generic';
    let content = '';
    
    // Try to extract target culture
    const cultureMatches = message.match(/(?:for|to)\s+(?:a|an)?\s*([a-zA-Z]+)(?:\s+audience|culture|context)?/i);
    if (cultureMatches && cultureMatches[1]) {
      targetCulture = this.normalizeCulture(cultureMatches[1]);
    }
    
    // Extract content to adapt (anything in quotes or the remainder of the message)
    const quoteMatches = message.match(/"([^"]*)"|'([^']*)'|`([^`]*)`/);
    if (quoteMatches) {
      content = quoteMatches[1] || quoteMatches[2] || quoteMatches[3] || '';
    } else {
      // Remove the adaptation request part and take the rest as the content
      const cleanMessage = message
        .replace(/(?:adapt|adaptation|cultural|culture)\s+(?:this|following|text)?\s*/i, '')
        .replace(/(?:for|to)\s+(?:a|an)?\s*([a-zA-Z]+)(?:\s+audience|culture|context)?/i, '')
        .trim();
      
      content = cleanMessage;
    }
    
    return { targetCulture, content };
  }
  
  /**
   * Normalize culture name
   */
  private normalizeCulture(culture: string): string {
    const cultureMap: Record<string, string> = {
      'american': 'us',
      'usa': 'us',
      'united states': 'us',
      'japanese': 'jp',
      'japan': 'jp',
      'chinese': 'cn',
      'china': 'cn',
      'german': 'de',
      'germany': 'de',
      'french': 'fr',
      'france': 'fr',
      'british': 'uk',
      'uk': 'uk',
      'england': 'uk',
      'korean': 'kr',
      'korea': 'kr',
      'south korean': 'kr',
      'indian': 'in',
      'india': 'in',
      'brazilian': 'br',
      'brazil': 'br',
      'mexican': 'mx',
      'mexico': 'mx',
      'italian': 'it',
      'italy': 'it',
      'spanish': 'es',
      'spain': 'es',
      'canadian': 'ca',
      'canada': 'ca',
      'australian': 'au',
      'australia': 'au',
      'russian': 'ru',
      'russia': 'ru',
      'saudi': 'sa',
      'saudi arabian': 'sa',
      'saudi arabia': 'sa'
    };
    
    const normalized = culture.toLowerCase();
    return cultureMap[normalized] || normalized;
  }
  
  /**
   * Get adaptations for a specific culture
   */
  private async getAdaptationsForCulture(
    userId: string,
    targetCulture: string
  ): Promise<any[]> {
    if (!this.s2doManager) {
      return [];
    }
    
    // Get all user adaptations
    const adaptations = await this.s2doManager.getObjectsByOwner(
      'user',
      userId,
      S2DOObjectType.CULTURAL_ADAPTATION,
      'active',
      userId
    );
    
    // Filter by target culture
    return adaptations.filter(a => a.metadata.targetCulture === targetCulture)
      .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
  }
  
  /**
   * Get cultural notes for a specific culture
   */
  private getCulturalNotes(culture: string): string[] {
    const notes: Record<string, string[]> = {
      'us': [
        'Direct communication style is valued',
        'Individualism and personal achievement are emphasized',
        'Informality in business settings is common',
        'Time-oriented with punctuality being important'
      ],
      'jp': [
        'Indirect communication style focused on harmony',
        'Group consensus is valued over individual opinions',
        'Formal business protocol with hierarchical structures',
        'High-context culture where much is implied rather than stated'
      ],
      'cn': [
        'Respect for hierarchy and authority',
        'Importance of "face" (mianzi) and avoiding embarrassment',
        'Relationship-building (guanxi) is crucial for business',
        'Indirect communication with importance placed on context'
      ],
      'de': [
        'Direct and explicit communication style',
        'Strong focus on structure, rules and procedures',
        'Clear separation between professional and personal life',
        'Punctuality and precision are highly valued'
      ],
      'fr': [
        'Appreciation for intellectual debate and discussion',
        'Formality in business settings with specific protocols',
        'Relationship-building important before business dealings',
        'Quality of life and work-life balance are emphasized'
      ]
    };
    
    return notes[culture] || [
      'Consider local values and social norms',
      'Be mindful of communication style preferences',
      'Research specific business protocols',
      'Understand contextual expectations'
    ];
  }
  
  /**
   * Get communication style for a specific culture
   */
  private getCultureCommunicationStyle(culture: string): string {
    const styles: Record<string, string> = {
      'us': 'Direct, explicit, and informal. Values clarity and efficiency.',
      'jp': 'Indirect, implicit, and formal. Emphasizes harmony and avoiding conflict.',
      'cn': 'Indirect with importance placed on context and saving face.',
      'de': 'Direct, explicit, and structured. Values precision and thoroughness.',
      'fr': 'Moderately indirect with appreciation for debate and intellectual discussion.',
      'uk': 'Indirect with use of understatement and humor. Values politeness.',
      'br': 'Expressive, relationship-focused, and contextual.',
      'in': 'Indirect and hierarchical with contextual cues.'
    };
    
    return styles[culture] || 'Varies based on regional norms and individual preferences.';
  }
  
  /**
   * Get business practices for a specific culture
   */
  private getCultureBusinessPractices(culture: string): string[] {
    const practices: Record<string, string[]> = {
      'us': [
        'Emphasis on contracts and legal documentation',
        'Quick decision-making processes',
        'Networking through professional associations',
        'Focus on quarterly results and short-term goals'
      ],
      'jp': [
        'Consensus-based decision making (nemawashi)',
        'Importance of business cards (meishi)',
        'Long-term business relationships',
        'Hierarchical approval processes'
      ],
      'cn': [
        'Relationship-building (guanxi) before business',
        'Respect for hierarchy and seniority',
        'Indirect negotiation approaches',
        'Importance of patience in business dealings'
      ],
      'de': [
        'Thorough planning and preparation',
        'Clear organizational structures',
        'Focus on quality and precision',
        'Direct and factual negotiations'
      ],
      'in': [
        'Relationship-building importance',
        'Hierarchical decision-making processes',
        'Flexibility with deadlines and schedules',
        'Indirect communication in negotiations'
      ]
    };
    
    return practices[culture] || [
      'Research specific business protocols',
      'Understand local decision-making processes',
      'Learn about negotiation styles',
      'Be aware of relationship expectations'
    ];
  }
  
  /**
   * Get social norms for a specific culture
   */
  private getCultureSocialNorms(culture: string): string[] {
    const norms: Record<string, string[]> = {
      'us': [
        'Casual greetings with first names',
        'Direct eye contact shows engagement',
        'Personal space (arm's length) is expected',
        'Tipping is customary in service industries'
      ],
      'jp': [
        'Bowing as formal greeting',
        'Removing shoes when entering homes',
        'Gift-giving customs in business and social settings',
        'Avoiding direct refusals or negative responses'
      ],
      'cn': [
        'Respect for elders and authority figures',
        'Gift-giving with attention to meaning and number symbolism',
        'Modest self-presentation and group harmony',
        'Indirect refusals to preserve relationship harmony'
      ],
      'fr': [
        'Formal greetings with titles and last names initially',
        'Cheek kisses (bises) in social settings',
        'Maintaining eye contact during conversations',
        'Formality in language and address'
      ],
      'sa': [
        'Gender segregation in many social settings',
        'Modest dress code, especially for women',
        'Greeting with "As-salamu alaykum"',
        'Right hand used for eating, greeting, and giving'
      ]
    };
    
    return norms[culture] || [
      'Learn appropriate greetings',
      'Understand personal space expectations',
      'Research dining etiquette',
      'Be aware of gift-giving customs'
    ];
  }
  
  /**
   * Extract communication style parameters
   */
  private extractCommunicationParameters(message: string):