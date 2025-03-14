/**
 * Sentiment Analysis Service
 * 
 * This service provides sentiment analysis, content classification, and entity analysis
 * using the Google Cloud Natural Language API.
 */

const language = require('@google-cloud/language');

// Create a client with the appropriate credentials
const client = new language.LanguageServiceClient();

/**
 * Analyzes the sentiment of the provided text
 * 
 * @param {string} text - The text to analyze sentiment for
 * @returns {Promise<object>} - The sentiment analysis result
 */
async function analyzeSentiment(text) {
  try {
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    // Detects the sentiment of the text
    const [result] = await client.analyzeSentiment({ document });
    const sentiment = result.documentSentiment;

    return {
      score: sentiment.score,
      magnitude: sentiment.magnitude,
      sentences: result.sentences.map(sentence => ({
        text: sentence.text.content,
        score: sentence.sentiment.score,
        magnitude: sentence.sentiment.magnitude
      }))
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    throw error;
  }
}

/**
 * Classifies the content of the provided text
 * 
 * @param {string} text - The text to classify
 * @returns {Promise<object>} - The content classification result
 */
async function classifyContent(text) {
  try {
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    // Classifies the content of the text
    const [classification] = await client.classifyText({ document });

    return {
      categories: classification.categories.map(category => ({
        name: category.name,
        confidence: category.confidence
      }))
    };
  } catch (error) {
    console.error('Error classifying content:', error);
    throw error;
  }
}

/**
 * Analyzes entities in the provided text
 * 
 * @param {string} text - The text to analyze entities for
 * @returns {Promise<object>} - The entity analysis result
 */
async function analyzeEntities(text) {
  try {
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    // Detects entities in the text
    const [result] = await client.analyzeEntities({ document });
    const entities = result.entities;

    return {
      entities: entities.map(entity => ({
        name: entity.name,
        type: entity.type,
        salience: entity.salience,
        metadata: entity.metadata,
        mentions: entity.mentions.map(mention => ({
          text: mention.text.content,
          type: mention.type,
          beginOffset: mention.text.beginOffset
        }))
      }))
    };
  }
  catch (error) {
    console.error('Error analyzing entities:', error);
    throw error;
  }
}

/**
 * Analyzes sentiment, classifies content, and extracts entities from the provided text
 * 
 * @param {string} text - The text to analyze
 * @returns {Promise<object>} - Comprehensive analysis result
 */
async function analyzeText(text) {
  try {
    const [sentimentResult, classificationResult, entityResult] = await Promise.all([
      analyzeSentiment(text),
      classifyContent(text),
      analyzeEntities(text)
    ]);

    return {
      sentiment: sentimentResult,
      classification: classificationResult,
      entities: entityResult
    };
  } catch (error) {
    console.error('Error performing comprehensive text analysis:', error);
    throw error;
  }
}

/**
 * Analyzes the emotional tone of the text
 * 
 * @param {string} text - The text to analyze emotion for
 * @returns {Promise<object>} - Emotional analysis based on sentiment
 */
async function analyzeEmotion(text) {
  try {
    const sentiment = await analyzeSentiment(text);
    
    // Map sentiment scores to emotional states
    let emotions = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0
    };
    
    // Calculate emotion scores based on sentiment score and magnitude
    const score = sentiment.score;
    const magnitude = sentiment.magnitude;
    
    if (score >= 0.7) {
      emotions.joy = Math.min(score * magnitude * 1.5, 1);
    } else if (score <= -0.6) {
      emotions.sadness = Math.min(Math.abs(score) * magnitude, 1);
      
      if (magnitude > 0.8) {
        emotions.anger = Math.min(Math.abs(score) * magnitude * 0.7, 1);
      }
    } else if (score < 0 && magnitude > 1.0) {
      emotions.fear = Math.min(Math.abs(score) * magnitude * 0.5, 1);
    }
    
    if (magnitude > 1.5 && Math.abs(score) < 0.5) {
      emotions.surprise = Math.min(magnitude * 0.4, 1);
    }
    
    return {
      dominant: Object.entries(emotions).reduce((a, b) => a[1] > b[1] ? a : b)[0],
      emotions
    };
  } catch (error) {
    console.error('Error analyzing emotion:', error);
    throw error;
  }
}

/**
 * Performs syntax analysis on the text
 * 
 * @param {string} text - The text to analyze syntax for
 * @returns {Promise<object>} - Syntax analysis result
 */
async function analyzeSyntax(text) {
  try {
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    // Detects the syntax of the text
    const [syntax] = await client.analyzeSyntax({ document });
    
    return {
      sentences: syntax.sentences.map(sentence => sentence.text.content),
      tokens: syntax.tokens.map(token => ({
        text: token.text.content,
        partOfSpeech: token.partOfSpeech.tag,
        dependencyEdge: {
          label: token.dependencyEdge.label,
          headTokenIndex: token.dependencyEdge.headTokenIndex
        }
      }))
    };
  } catch (error) {
    console.error('Error analyzing syntax:', error);
    throw error;
  }
}

// Export the service functions
module.exports = {
  analyzeSentiment,
  classifyContent,
  analyzeEntities,
  analyzeText,
  analyzeEmotion,
  analyzeSyntax
};

