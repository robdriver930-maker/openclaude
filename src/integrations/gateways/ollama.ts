import { defineGateway } from '../define.js'

export default defineGateway({
  id: 'ollama',
  label: 'Ollama',
  category: 'local',
  defaultBaseUrl: 'http://localhost:11434/v1',
  defaultModel: 'llama3.1:8b',
  supportsModelRouting: true,
  setup: {
    requiresAuth: false,
    authMode: 'none',
  },
  startup: {
    autoDetectable: true,
    probeReadiness: 'ollama-generation',
  },
  transportConfig: {
    kind: 'local',
    openaiShim: {
      supportsAuthHeaders: true,
      maxTokensField: 'max_tokens',
    },
  },
  preset: {
    id: 'ollama',
    description: 'Local or remote Ollama endpoint',
    modelEnvVars: ['OPENAI_MODEL'],
    vendorId: 'openai',
  },
  catalog: {
    source: 'hybrid',
    discovery: { kind: 'ollama' },
    discoveryCacheTtl: '1d',
    discoveryRefreshMode: 'background-if-stale',
    allowManualRefresh: true,
    models: [
      {
        id: 'deepseek-v4-1-flash-cloud',
        apiName: 'deepseek-v4.1-flash:cloud',
        label: 'DeepSeek V4.1 Flash (Cloud)',
        modelDescriptorId: 'deepseek-v4-1-flash',
        contextWindow: 1_048_576,
        maxOutputTokens: 65_536,
      },
      {
        id: 'gemma4-31b-cloud',
        apiName: 'gemma4:31b-cloud',
        label: 'Gemma 4 31B (Cloud)',
        modelDescriptorId: 'gemma4-31b',
        contextWindow: 1_048_576,
        maxOutputTokens: 65_536,
      },
    ],
  },
  usage: { supported: false },
})
