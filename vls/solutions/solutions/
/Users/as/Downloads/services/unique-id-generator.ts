  generateTimestampedId(): string {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    return `${timestamp}_${randomSuffix}`;
  }

  /**
   * Generates a unique identifier based on profile data, DR match data, and confidence scores
   * This creates a deterministic but secure ID based on the combined data
   * 
   * @param params Object containing profileData, drMatchData, and confidenceScores
   * @returns A unique identifier string
   */
  generate(params: GenerateParams): string {
    const { profileData, drMatchData, confidenceScores } = params;

    // Extract key identifying information
    const profileIdentifiers = [
      profileData.userId,
      profileData.name,
      profileData.industry,
    ];

    const drMatchIdentifiers = [
      drMatchData.userId,
      drMatchData.fullName,
      drMatchData.careerLevel,
    ];

    // Create a composite string from all data points
    const compositeString = [
      ...profileIdentifiers,
      ...drMatchIdentifiers,
      confidenceScores.overallConfidence.toFixed(2),
      confidenceScores.domainConfidence.toFixed(2),
      confidenceScores.profileAuthenticity.toFixed(2),
      Date.now().toString()
    ].join('-');

    // Create a deterministic but secure hash
    const hash = crypto
      .createHash('sha256')
      .update(compositeString)
      .digest('hex')
      .substring(0, 16);

    // Format the final ID
    return `authn_${hash}_${Date.now().toString(36)}`;
  }
}


