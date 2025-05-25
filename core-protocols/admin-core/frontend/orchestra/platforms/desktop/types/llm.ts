import { OrchestraService } from '../lib/OrchestraService'

/**
* Supported LLM providers
*/
export enum LLMProvider {
CLAUDE = 'CLAUDE',
OPENAI = 'OPENAI',
ANTHROPIC = 'ANTHROPIC',
PALM = 'PALM'
}

/**
* Base configuration interface for LLM services
*/
export interface LLMConfig {
provider: LLMProvider
apiKey: string
organizationId?: string
maxTokens?: number
temperature?: number
topP?: number
}

/**
* Provider-specific configurations
*/
export interface ClaudeConfig extends LLMConfig {
provider: LLMProvider.CLAUDE
model: 'claude-2' | 'claude-instant-1'
}

export interface OpenAIConfig extends LLMConfig {
provider: LLMProvider.OPENAI
model: 'gpt-4' | 'gpt-3.5-turbo'
}

/**
* LLM Request types
*/
export interface LLMRequest {
prompt: string
systemPrompt?: string
maxTokens?: number
temperature?: number
stopSequences?: string[]
stream?: boolean
}

/**
* LLM Response types
*/
export interface LLMResponse {
content: string
usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
}
modelName: string
provider: LLMProvider
}

/**
* LLM Service interface
*/
export interface LLMService {
config: LLMConfig
orchestra?: OrchestraService

/**
* Initialize the LLM service
*/
initialize(): Promise<void>

/**
* Generate completion from the LLM
*/
complete(request: LLMRequest): Promise<LLMResponse>

/**
* Generate streaming completion from the LLM
*/
streamComplete(request: LLMRequest): AsyncGenerator<LLMResponse>

/**
* Get embedding for a text
*/
embed(text: string): Promise<number[]>
}

