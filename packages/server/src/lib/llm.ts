import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { llmRequestLog, tweet, user } from '../db/schema'
import type { OpenAI } from 'openai'

const PROMPT = `
You are an expert system designed to detect spam and bot accounts on Twitter. Analyze the following Twitter user profile and recent tweets (including media) to determine if this account appears to be a spam/bot account or a legitimate human user.

USER PROFILE:
- Username: {{screenName}}
- Display Name: {{name}}
- Bio: {{description}}
- Profile Image URL: {{profileImageUrl}}
- Account created: {{accountCreatedAt}}
- Followers count: {{followersCount}}
- Following count: {{followingCount}}
- Blue verification status: {{blueVerified}}
- Has default profile: {{defaultProfile}}
- Has default profile image: {{defaultProfileImage}}
- Location: {{location}}
- Profile URL: {{url}}

RECENT TWEETS:
{{tweets}}

Analyze this information and determine if this is likely a spam/bot account by checking for these indicators:
1. Account creation date is very recent
2. Unusually high ratio of following to followers 
3. Default profile and/or profile image
4. Bio appears generic, spammy, or contains suspicious links
5. Username contains random strings or numbers
6. Tweet content shows repetitive patterns, excessive hashtags, or identical promotional content
7. Frequent posting in rapid succession
8. Tweets containing suspicious links or frequent calls to action
9. Account mainly retweets without original content
10. Repetitive use of the same media across multiple tweets
11. Media content that appears promotional or unrelated to text
12. Stock photos or generic images that look impersonal
13. QR codes or promotional graphics that may lead to suspicious sites

IMPORTANT: Return ONLY a JSON object with the following structure:
{
  "rating": X,  // A number from 1-5 where:
               // 1: Almost certainly human
               // 2: Likely human
               // 3: Uncertain
               // 4: Likely bot/spam
               // 5: Almost certainly bot/spam
  "explanation": "Brief explanation of key factors that led to this rating"
}
`

type LLMAnalyzeRequest = {
  user: Pick<
    InferSelectModel<typeof user>,
    | 'id'
    | 'screenName'
    | 'name'
    | 'description'
    | 'accountCreatedAt'
    | 'followersCount'
    | 'followingCount'
    | 'profileImageUrl'
    | 'blueVerified'
    | 'defaultProfile'
    | 'defaultProfileImage'
    | 'location'
    | 'url'
  >
  tweets: Pick<
    InferSelectModel<typeof tweet>,
    'text' | 'publishedAt' | 'media'
  >[]
}

export function getPrompt(data: LLMAnalyzeRequest) {
  return PROMPT.replace('{{screenName}}', data.user.screenName)
    .replace('{{name}}', data.user.name ?? '')
    .replace('{{description}}', data.user.description ?? '')
    .replace('{{profileImageUrl}}', data.user.profileImageUrl ?? '')
    .replace('{{accountCreatedAt}}', data.user.accountCreatedAt ?? '')
    .replace('{{followersCount}}', data.user.followersCount?.toString() ?? '0')
    .replace('{{followingCount}}', data.user.followingCount?.toString() ?? '0')
    .replace('{{blueVerified}}', data.user.blueVerified?.toString() ?? 'false')
    .replace(
      '{{defaultProfile}}',
      data.user.defaultProfile?.toString() ?? 'true',
    )
    .replace(
      '{{defaultProfileImage}}',
      data.user.defaultProfileImage?.toString() ?? 'true',
    )
    .replace('{{location}}', data.user.location ?? '')
    .replace('{{url}}', data.user.url ?? '')
    .replace(
      '{{tweets}}',
      data.tweets
        .map((it, index) => {
          let r = `- Tweet ${index} (${it.publishedAt}): ${it.text}`
          if (it.media && Array.isArray(it.media)) {
            r += '\n  '
            r += `Media: ${it.media
              .map((m) => `${m.type}: ${m.url}`)
              .join(', ')}`
          }
          return r
        })
        .join('\n'),
    )
}

export interface LLMAnalyzed {
  rating: number
  explanation: string
}

export function getClient(options: {
  baseUrl: string
  apiKey: string
  model: string
  jsonResponse?: boolean
}) {
  return async (prompt: string): Promise<OpenAI.ChatCompletion> => {
    const resp = await fetch(options.baseUrl + '/chat/completions', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: options.jsonResponse
          ? {
              type: 'json_object',
            }
          : undefined,
      }),
    })
    return (await resp.json()) as any
  }
}

function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number | undefined {
  const prices: Record<string, { prompt: number; completion: number }> = {
    // https://docs.x.ai/docs/models?cluster=us-east-1#model-constraints:~:text=%2410.00-,grok%2D2%2D1212,-%2D%20grok%2D2
    'grok-2-latest': { prompt: 2, completion: 10 },
    // https://api-docs.deepseek.com/quick_start/pricing#:~:text=MODEL(1)-,deepseek%2Dchat,-deepseek%2Dreasoner
    'deepseek-chat': { prompt: 0.27, completion: 1.1 },
    // https://openai.com/api/pricing/#:~:text=10.00%20/%201M%20tokens-,GPT%2D4o%20mini,-Affordable%20small%20model
    'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
  }
  const price = prices[model]
  if (!price) {
    console.warn(`[calculateCost] Unknown model: ${model}`)
    return
  }
  return (
    (price.prompt * promptTokens + price.completion * completionTokens) /
    1_000_000
  )
}

export async function analyzeUser(
  data: LLMAnalyzeRequest,
  options: {
    baseUrl: string
    apiKey: string
    model: string
  },
): Promise<{
  logData: InferInsertModel<typeof llmRequestLog>
  result?: LLMAnalyzed
}> {
  const prompt = getPrompt(data)
  const start = new Date()
  let response:
    | OpenAI.ChatCompletion
    | {
        error: OpenAI.ErrorObject
      }
  try {
    response = (await getClient({
      ...options,
      jsonResponse: true,
    })(prompt)) as
      | OpenAI.ChatCompletion
      | {
          error: OpenAI.ErrorObject
        }
  } catch (error) {
    return {
      logData: {
        userId: data.user.id,
        requestType: 'spam_detection',
        modelName: options.model,
        requestTimestamp: start.toISOString(),
        responseTimestamp: new Date().toISOString(),
        latencyMs: new Date().getTime() - start.getTime(),
        prompt,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
  if ('error' in response) {
    console.error('LLM error', JSON.stringify(response, null, 2))
    throw response
  }
  const logData: InferInsertModel<typeof llmRequestLog> = {
    userId: data.user.id,
    requestType: 'spam_detection',
    modelName: response.model,
    requestTimestamp: start.toISOString(),
    responseTimestamp: new Date().toISOString(),
    latencyMs: new Date().getTime() - start.getTime(),
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    totalTokens: response.usage?.total_tokens,
    estimatedCost: calculateCost(
      options.model,
      response.usage?.prompt_tokens ?? 0,
      response.usage?.completion_tokens ?? 0,
    ),
    prompt,
    completion: response.choices[0].message.content as string,
    status: 'success',
  }
  let result: LLMAnalyzed
  try {
    result = JSON.parse(response.choices[0].message.content as string)
  } catch (error) {
    console.warn(`[analyzeUser] Failed to parse JSON: ${error}`)
    return {
      logData,
    }
  }
  return {
    logData,
    result,
  }
}
