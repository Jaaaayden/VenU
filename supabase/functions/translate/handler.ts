// The translate endpoint as a plain (Request) => Response function: auth, validation, provider choice.
// index.ts serves it on Supabase (Deno); scripts/mock-supabase.mjs serves the same function in Node.
import { createAnthropicTranslator, type AnthropicLike } from './anthropic.ts';
import { baseLanguage, isSignLanguage, parseBatch, type TranslateResponse, type Translator } from './core.ts';
import { createDeepLTranslator } from './deepl.ts';

export interface ProviderEnv {
  /** "anthropic" or "deepl". */
  TRANSLATE_PROVIDER?: string;
  ANTHROPIC_API_KEY?: string;
  DEEPL_API_KEY?: string;
}

export type ProviderChoice = { ok: true; translator: Translator } | { ok: false; reason: string };

/**
 * Picks the translator from the secrets. `anthropicClient` builds the SDK client, because the SDK is
 * imported differently in Deno and Node.
 */
export function chooseProvider(env: ProviderEnv, anthropicClient: (apiKey: string) => AnthropicLike): ProviderChoice {
  const name = env.TRANSLATE_PROVIDER?.trim().toLowerCase();
  if (name === 'anthropic') {
    const key = env.ANTHROPIC_API_KEY?.trim();
    return key ? { ok: true, translator: createAnthropicTranslator(anthropicClient(key)) } : { ok: false, reason: 'TRANSLATE_PROVIDER is anthropic but ANTHROPIC_API_KEY is not set' };
  }
  if (name === 'deepl') {
    const key = env.DEEPL_API_KEY?.trim();
    return key ? { ok: true, translator: createDeepLTranslator(key) } : { ok: false, reason: 'TRANSLATE_PROVIDER is deepl but DEEPL_API_KEY is not set' };
  }
  return { ok: false, reason: name ? `Unknown TRANSLATE_PROVIDER "${name}" (use anthropic or deepl)` : 'TRANSLATE_PROVIDER is not set' };
}

export interface HandlerDeps {
  /** The user id for a valid signed-in (not anonymous) user's access token, else null. */
  verifyUser(token: string): Promise<string | null>;
  translator: Translator | null;
  log?: (line: string) => void;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

export function createHandler({ verifyUser, translator, log = console.error }: HandlerDeps) {
  return async function handle(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return json(405, { error: 'Use POST.' });

    const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('Authorization') ?? '')?.[1];
    let userId: string | null = null;
    try {
      userId = token ? await verifyUser(token) : null;
    } catch {
      userId = null;
    }
    if (!userId) return json(401, { error: 'Sign in to translate messages.' });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Send a JSON object: { target, texts }.' });
    }
    const parsed = parseBatch(body);
    if (!parsed.ok) return json(400, { error: parsed.error });
    const { batch } = parsed;

    if (!translator) return json(503, { error: 'Translation is not set up on this server.' });

    // Nothing to do: already in the target language, or a sign language with no written form.
    if (batch.source && baseLanguage(batch.source) === baseLanguage(batch.target)) {
      return json(200, { provider: translator.name, translations: batch.texts.map(text => ({ text, detectedSource: baseLanguage(batch.target) })) } satisfies TranslateResponse);
    }
    if (isSignLanguage(batch.target)) {
      return json(200, { provider: translator.name, translations: batch.texts.map(text => ({ text, detectedSource: batch.source ?? null, unsupported: true as const })) } satisfies TranslateResponse);
    }

    try {
      const translations = await translator.translate(batch);
      return json(200, { provider: translator.name, translations } satisfies TranslateResponse);
    } catch (e) {
      // The message text never goes in the log, only what failed.
      log(`translate (${translator.name}) failed: ${e instanceof Error ? e.message : String(e)}`);
      return json(502, { error: 'The translation service failed. Try again later.' });
    }
  };
}
