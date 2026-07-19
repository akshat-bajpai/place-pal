/**
 * Central classifier for AI-layer failures so every surface (job search, ATS,
 * email) reports the SAME clear, human-readable reason instead of leaking a raw
 * Gemini stack trace or a vague "something went wrong".
 *
 * classifyAiError(err) -> { category, message, retryable }
 *
 * Categories:
 *   daily_quota   - free-tier per-day request cap (20/day/model) exhausted
 *   rate_limit    - too many requests in a short window (per-minute burst)
 *   ai_overloaded - model temporarily overloaded/unavailable (503)
 *   config        - server misconfig: missing/invalid API key, no permission
 *   network       - could not reach the AI service (DNS/connreset/timeout)
 *   bad_response  - AI replied but the JSON was unparseable/truncated
 *   input         - not an AI failure: bad user input (e.g. unreadable resume)
 *   unknown       - anything else
 *
 * `retryable` marks errors worth retrying automatically (transient) vs. those
 * where retrying only wastes quota or will fail again.
 */
const classifyAiError = (err) => {
    const msg = (err && err.message) || '';
    const status = err && err.status;

    // Explicit, pre-marked user-facing errors (thrown deliberately upstream)
    // pass their own message through unchanged.
    if (err && err.userFacing) {
        return { category: err.category || 'input', message: msg, retryable: false };
    }

    // Per-DAY quota. Check BEFORE the generic quota/429 branch — this message
    // also contains the word "quota". Keyed on the per-day quotaId only.
    if (/PerDay/i.test(msg)) {
        return {
            category: 'daily_quota',
            message: "You've reached today's free AI limit (Gemini free tier allows 20 requests per day). It resets once a day, around 12:30 PM IST — please try again after that.",
            retryable: false,
        };
    }

    // Per-minute / short-window rate limit.
    if (status === 429 || /\b429\b|rate.?limit|RESOURCE_EXHAUSTED|too many requests|quota/i.test(msg)) {
        return {
            category: 'rate_limit',
            message: 'The AI is handling too many requests right now. Please wait about a minute and try again.',
            retryable: true,
        };
    }

    // Model overloaded / temporarily unavailable.
    if (status === 503 || /\b503\b|overloaded|unavailable|high demand/i.test(msg)) {
        return {
            category: 'ai_overloaded',
            message: 'The AI service is temporarily overloaded. Please try again in a few moments.',
            retryable: true,
        };
    }

    // Server-side config: missing/invalid key or blocked project.
    if (/GEMINI_API_KEY|API key|API_KEY_INVALID|invalid.*key|\b401\b|\b403\b|permission denied|not authorized/i.test(msg)) {
        return {
            category: 'config',
            message: 'AI analysis is not configured correctly on the server. Please contact support.',
            retryable: false,
        };
    }

    // Network / reachability.
    if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|network|fetch failed|socket hang up|getaddrinfo/i.test(msg)) {
        return {
            category: 'network',
            message: 'Could not reach the AI service. Please check your connection and try again.',
            retryable: true,
        };
    }

    // Model responded but the JSON was malformed/truncated.
    if ((err instanceof SyntaxError) || /JSON|Unexpected token|Unterminated|Unexpected end of/i.test(msg)) {
        return {
            category: 'bad_response',
            message: 'The AI returned an unexpected response. Please try again.',
            retryable: true,
        };
    }

    return {
        category: 'unknown',
        message: 'Something went wrong during AI analysis. Please try again.',
        retryable: false,
    };
};

/** Convenience: attach the classification onto an error before rethrowing. */
const annotateAiError = (err) => {
    const { category, message, retryable } = classifyAiError(err);
    err.aiCategory = category;
    err.userMessage = message;
    err.retryable = retryable;
    return err;
};

module.exports = { classifyAiError, annotateAiError };
