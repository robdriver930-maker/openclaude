import { MIN_RECOMMENDED_OLLAMA_CONTEXT_TOKENS } from '../../../utils/ollamaContext.js'
import { getOpenAIContextWindow } from '../../../utils/model/openaiContextWindows.js'

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | OpenAIContentPart[]
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
    extra_content?: Record<string, unknown>
  }>
  tool_call_id?: string
  name?: string
  reasoning_content?: string
}

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

type OllamaChatResponse = {
  model?: string
  message?: {
    role?: string
    content?: string
    tool_calls?: Array<{
      function?: {
        name?: string
        arguments?: unknown
      }
    }>
  }
  done?: boolean
  done_reason?: string
  prompt_eval_count?: number
  eval_count?: number
}

type OllamaChatMessage = Omit<OpenAIMessage, 'content' | 'tool_calls' | 'tool_call_id'> & {
  content?: string
  images?: string[]
  tool_name?: string
  tool_calls?: Array<{
    function: {
      name: string
      arguments: Record<string, unknown>
    }
  }>
}

function parsePositiveIntegerEnv(value: string | undefined): number | null {
  if (!value?.trim()) return null
  const parsed = Number(value.trim())
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function getOllamaNumCtx(model?: string): number {
  // Explicit request-level override wins (documented escape hatch).
  const explicit = parsePositiveIntegerEnv(process.env.OPENCLAUDE_OLLAMA_NUM_CTX)
  if (explicit !== null) return explicit
  // Per-model window from CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS: num_ctx must
  // match what the context map promises, or a 1M-window model gets silently
  // truncated to the global default at request time.
  const mapped = model ? getOpenAIContextWindow(model) : undefined
  if (typeof mapped === 'number' && Number.isFinite(mapped) && mapped > 0) {
    return mapped
  }
  return (
    parsePositiveIntegerEnv(process.env.OLLAMA_CONTEXT_LENGTH) ??
    MIN_RECOMMENDED_OLLAMA_CONTEXT_TOKENS
  )
}

export function buildOllamaChatUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl)
  parsed.pathname = parsed.pathname.replace(/\/+$/, '').replace(/\/v1$/i, '')
  parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/api/chat`
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString()
}

function extractOllamaImageData(url: string): string | null {
  return url.match(/^data:[^;,]+;base64,(.+)$/i)?.[1] ?? null
}

function normalizeOllamaNativeToolCalls(
  toolCalls: OpenAIMessage['tool_calls'],
): OllamaChatMessage['tool_calls'] {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return undefined
  const normalized = toolCalls
    .map(toolCall => {
      const name = toolCall.function?.name
      if (!name) return null
      let args: Record<string, unknown> = {}
      try {
        const parsed = JSON.parse(toolCall.function.arguments || '{}')
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>
        }
      } catch {
        args = {}
      }
      return { function: { name, arguments: args } }
    })
    .filter((toolCall): toolCall is NonNullable<typeof toolCall> => toolCall !== null)
  return normalized.length > 0 ? normalized : undefined
}

export function normalizeOllamaNativeMessages(messages: unknown): OllamaChatMessage[] {
  if (!Array.isArray(messages)) return []
  const toolNames = new Map<string, string>()
  return messages.map(message => {
    const openAIMessage = message as OpenAIMessage
    const content = openAIMessage.content
    const toolCalls = normalizeOllamaNativeToolCalls(openAIMessage.tool_calls)
    for (const toolCall of Array.isArray(openAIMessage.tool_calls)
      ? openAIMessage.tool_calls
      : []) {
      if (toolCall.id && toolCall.function?.name) {
        toolNames.set(toolCall.id, toolCall.function.name)
      }
    }
    const { tool_call_id: toolCallId, ...messageWithoutToolCallId } = openAIMessage
    const toolName = toolCallId ? toolNames.get(toolCallId) : undefined
    if (!Array.isArray(content)) {
      return {
        ...messageWithoutToolCallId,
        content,
        ...(openAIMessage.role === 'tool' && toolName ? { tool_name: toolName } : {}),
        ...(toolCalls ? { tool_calls: toolCalls } : { tool_calls: undefined }),
      }
    }
    const textParts: string[] = []
    const images: string[] = []
    for (const part of content) {
      if (part.type === 'text') {
        if (part.text) textParts.push(part.text)
        continue
      }
      const imageUrl = part.image_url.url
      const imageData = extractOllamaImageData(imageUrl)
      if (imageData) images.push(imageData)
      else textParts.push(`[Image: ${imageUrl}]`)
    }
    return {
      ...messageWithoutToolCallId,
      content: textParts.join('\n'),
      ...(openAIMessage.role === 'tool' && toolName ? { tool_name: toolName } : {}),
      ...(images.length > 0 ? { images } : {}),
      ...(toolCalls ? { tool_calls: toolCalls } : { tool_calls: undefined }),
    }
  })
}

function mapOllamaDoneReason(doneReason: unknown): string | null {
  if (doneReason === 'length' || doneReason === 'stop') return doneReason
  return typeof doneReason === 'string' && doneReason ? doneReason : null
}

function normalizeOllamaToolCalls(
  toolCalls: NonNullable<OllamaChatResponse['message']>['tool_calls'],
): Array<{
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}> | undefined {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return undefined
  const normalized = toolCalls
    .map(toolCall => {
      const name = toolCall.function?.name
      if (!name) return null
      const args = toolCall.function?.arguments
      return {
        id: `call_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
        type: 'function' as const,
        function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args ?? {}) },
      }
    })
    .filter((toolCall): toolCall is NonNullable<typeof toolCall> => toolCall !== null)
  return normalized.length > 0 ? normalized : undefined
}

function buildOpenAIUsageFromOllama(data: OllamaChatResponse) {
  const promptTokens = data.prompt_eval_count ?? 0
  const completionTokens = data.eval_count ?? 0
  return { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens }
}

function convertOllamaChatResponseToOpenAI(
  data: OllamaChatResponse,
  fallbackModel: string,
  makeMessageId: () => string,
): Record<string, unknown> {
  const toolCalls = normalizeOllamaToolCalls(data.message?.tool_calls)
  return {
    id: makeMessageId(), object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: data.model ?? fallbackModel,
    choices: [{ index: 0, message: { role: 'assistant', content: data.message?.content ?? '', ...(toolCalls ? { tool_calls: toolCalls } : {}) }, finish_reason: toolCalls ? 'tool_calls' : mapOllamaDoneReason(data.done_reason) }],
    usage: buildOpenAIUsageFromOllama(data),
  }
}

function responseWithPreservedUrl(body: BodyInit | null, init: ResponseInit, url: string): Response {
  const response = new Response(body, init)
  try { Object.defineProperty(response, 'url', { value: url, configurable: true }) } catch { /* routing has a transport fallback */ }
  return response
}

const defaultMakeMessageId = (): string =>
  `msg_${crypto.randomUUID().replace(/-/g, '')}`

export async function convertOllamaNonStreamingResponse(response: Response, fallbackModel: string, makeMessageId: () => string = defaultMakeMessageId): Promise<Response> {
  const data = await response.json() as OllamaChatResponse
  return responseWithPreservedUrl(JSON.stringify(convertOllamaChatResponseToOpenAI(data, fallbackModel, makeMessageId)), { status: response.status, statusText: response.statusText, headers: { 'content-type': 'application/json' } }, response.url)
}

function openAIStreamChunk(id: string, model: string, delta: Record<string, unknown>, finishReason: string | null = null): string {
  return `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, delta, finish_reason: finishReason }] })}\n\n`
}

export function convertOllamaStreamingResponse(response: Response, fallbackModel: string, makeMessageId: () => string = defaultMakeMessageId): Response {
  const body = response.body
  if (!body) return response
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const reader = body.getReader()
  const streamId = makeMessageId()
  let buffer = ''
  let hasEmittedRole = false
  let hasEmittedToolCall = false
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (buffer.trim()) enqueue(buffer.trim(), controller)
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''
        let emitted = false
        for (const line of lines) if (line.trim()) { enqueue(line.trim(), controller); emitted = true }
        if (emitted) return
      }
    },
    cancel(reason) { return reader.cancel(reason) },
  })
  function enqueue(line: string, controller: ReadableStreamDefaultController<Uint8Array>): void {
    let data: OllamaChatResponse
    try { data = JSON.parse(line) as OllamaChatResponse } catch { return }
    const model = data.model ?? fallbackModel
    const chunks: string[] = []
    const delta: Record<string, unknown> = {}
    if (!hasEmittedRole) { delta.role = 'assistant'; hasEmittedRole = true }
    if (data.message?.content) delta.content = data.message.content
    const toolCalls = normalizeOllamaToolCalls(data.message?.tool_calls)
    if (toolCalls) {
      hasEmittedToolCall = true
      delta.tool_calls = toolCalls.map((toolCall, index) => ({ index, id: toolCall.id, type: toolCall.type, function: toolCall.function }))
    }
    if (Object.keys(delta).length > 0) chunks.push(openAIStreamChunk(streamId, model, delta))
    if (data.done) {
      chunks.push(openAIStreamChunk(streamId, model, {}, hasEmittedToolCall ? 'tool_calls' : mapOllamaDoneReason(data.done_reason)))
      chunks.push(`data: ${JSON.stringify({ id: streamId, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model, choices: [], usage: buildOpenAIUsageFromOllama(data) })}\n\n`)
    }
    for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
  }
  return responseWithPreservedUrl(stream, { status: response.status, statusText: response.statusText, headers: { 'content-type': 'text/event-stream' } }, response.url)
}
/**
 * Native /api/chat `think` value.
 * Compact must send false (otherwise the summariser burns the budget in
 * message.thinking and autocompact returns no text). Daily MAX sends "max"
 * so Qwen 3.8 actually thinks at the highest level, not just think:true.
 */
export function ollamaThinkValue(plan: {
  thinkingType?: string
  reasoningEffort?: string
}): boolean | 'low' | 'medium' | 'high' | 'max' {
  if (plan.thinkingType === 'disabled') {
    return false
  }
  const effort = plan.reasoningEffort
  if (effort === 'xhigh' || effort === 'max' || effort === 'ultracode') {
    return 'max'
  }
  if (effort === 'high' || effort === 'medium' || effort === 'low') {
    return effort
  }
  return plan.thinkingType === 'enabled' || Boolean(effort)
}

const TOOL_BOUNDARY_PLACEHOLDER = '[Tool results received]'

/**
 * After tools, Qwen 3.8 + think:"max" often fills the whole budget in
 * message.thinking and returns empty content / no tool_calls. The query
 * loop then treats the turn as done (UI pause). Force think off on those
 * continuations so the model actually calls the next tool or answers.
 */
export function isOllamaPostToolTurn(messages: unknown): boolean {
  if (!Array.isArray(messages) || messages.length === 0) {
    return false
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as {
      role?: string
      content?: unknown
      tool_calls?: unknown[]
    }
    const role = msg?.role
    if (role === 'system') continue
    if (role === 'tool') return true
    if (role === 'assistant') {
      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        return true
      }
      const content =
        typeof msg.content === 'string' ? msg.content.trim() : ''
      if (content === TOOL_BOUNDARY_PLACEHOLDER || content === '') {
        continue
      }
      return false
    }
  }
  return false
}

export function ollamaThinkForRequest(
  plan: {
    thinkingType?: string
    reasoningEffort?: string
  },
  messages: unknown,
): boolean | 'low' | 'medium' | 'high' | 'max' {
  if (isOllamaPostToolTurn(messages)) {
    return false
  }
  return ollamaThinkValue(plan)
}

function isQwen38LocalModel(model: string | undefined): boolean {
  return /qwen3\.8/i.test(model ?? '')
}

/**
 * Qwen3.8 official sampling (Alibaba / Unsloth, Aug 2026).
 * Thinking and instruct modes are different. After tools we force think off,
 * so those turns MUST use instruct sampling — thinking temp+penalties with
 * think:false makes the 27B ramble and skip the next tool call.
 */
export function applyQwen38OllamaSampling(
  options: Record<string, unknown>,
  think: boolean | 'low' | 'medium' | 'high' | 'max',
  model: string | undefined,
): void {
  if (!isQwen38LocalModel(model)) return
  const thinkingOn = think !== false
  if (thinkingOn) {
    options.temperature = 1.0
    options.top_p = 0.95
    options.top_k = 20
    options.min_p = 0
    options.presence_penalty = 0
    options.repeat_penalty = 1.0
    return
  }
  options.temperature = 0.7
  options.top_p = 0.8
  options.top_k = 20
  options.min_p = 0
  options.presence_penalty = 1.5
  options.repeat_penalty = 1.0
}
