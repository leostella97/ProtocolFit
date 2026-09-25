# Free / near-free LLM API tiers for an agentic coding harness — September 2026

Researched 2026-09-20/21. Every number below is tagged **[verified]** (read from an official provider page or live API during this research) or **[unverified]** (third-party source only). Stale third-party lists are called out where they contradict official docs.

---

## 1. Ranking table — most generous free quota first

| # | Provider | Free quota | Card? | Free models | Tools? | Verified |
|---|---|---|---|---|---|---|
| 1 | **OpenRouter** | 20 RPM; **50 RPD** (no credits) → **1,000 RPD** after **$10 lifetime** credit purchase | No (card only for the $10) | 18 `:free` models w/ tools | ✅ 18/20 | **[verified]** (constants in docs source) |
| 2 | **Mistral La Plateforme** | "Experiment" plan: ~**1 req/s, 500K TPM, ~1B tokens/month** | No (phone verify + data opt-in) | Small 4, Medium 3, Large 3, Nemo, Codestral, Pixtral | ✅ | **[unverified]** — official tier docs 404 |
| 3 | **Groq** | gpt-oss-120b/20b, qwen3.8-27b: **30 RPM / 1K RPD / 8K TPM / 200K TPD** | No | ~4 chat + 2 guard + 2 TTS + 2 ASR | ✅ | **[verified]** (with one caveat, §3.3) |
| 4 | **Google AI Studio** | Flash-Lite: **15 RPM / 500 RPD**; Gemini 3.x **Flash: 5 RPM / 20 RPD** | No | Gemini 3.8/3.7/3.6/3.5 Flash + Flash-Lite | ✅ | **[unverified officially]** / **[verified by measurement]** |
| 5 | **Z.ai (Zhipu)** | GLM-4.7-Flash / 4.5-Flash / 4.6V-Flash = **$0**, ~**1 concurrent request** | No | 3 Flash models | ✅ | **[verified]** (pricing page) |
| 6 | **Vercel AI Gateway** | **$5/month** credit, free-tier-eligible models only, lower rate limits | No (Vercel account) | subset of catalog | ✅ (tool-tagged models) | **[verified]** (amount) / model list **[unverified]** |
| 7 | **NVIDIA NIM** (build.nvidia.com) | **1,000 credits** on Developer Program signup, → 5,000 on request (one-time) | No | 100+ "Free Endpoint" models | ✅ (model-dependent) | **[unverified]** |
| 8 | **Cloudflare Workers AI** | **10,000 Neurons/day**, resets 00:00 UTC | No | ~55 models (7 restricted to paid) | ✅ (Function Calling beta) | **[verified]** |
| 9 | **Cohere** | Trial key: **1,000 calls/month, 20 RPM**, non-commercial | No | Command A, R+, R, R7B + Embed/Rerank | ✅ | **[unverified]** |
| 10 | **OVHcloud AI Endpoints** | ~14 free models, **12 RPM**, anonymous tier | No | Qwen, Mistral, Llama, DeepSeek, gpt-oss-120B | likely | **[unverified]** |
| 11 | **SambaNova Cloud** | Free Tier: **20 RPM / 20 RPD / 200K TPD** | No (to start) | DeepSeek-V3.1, Llama-3.3-70B, gpt-oss-120b, +2 preview | ✅ | **[verified]** (official) |
| 12 | **Scaleway Generative APIs** | ~**1M tokens total** (one-time), rate limited | Unknown | Qwen3 235B, Llama | likely | **[unverified]** |
| 13 | **OpenCode Zen** | 9 "limited-time free" models (DeepSeek V4 Flash Free, MiMo-V2.5 Free, Nemotron 3 Ultra Free, North Mini Code Free…) | No | 9 coding-oriented | likely | **[unverified]** |
| 14 | **Alibaba Model Studio (Bailian)** | New users: 100M+ free tokens on Qwen | No | Qwen family | likely | **[unverified]** |
| 15 | **Hugging Face Inference Providers** | Monthly free credit pool (small for free users; larger per-seat for Team/Enterprise) | No | rotates | varies | **[verified]** (mechanism only) |
| 16 | **Novita AI** | Signup credits (amount not published) | Unknown | 100+ open models | likely | **[unverified]** |
| 17 | **Cerebras** | ⚠️ **NO permanent free tier.** $5 credits, **expire 30 days**, requires **verified payment method** | **YES** | all public models *if* you add a card | ✅ | **[verified]** (official FAQ) |
| 18 | **Together AI** | ⚠️ **None.** "$5 minimum credit purchase" | **YES** | — | — | **[verified]** (official docs) |
| 19 | **Fireworks AI** | ⚠️ ~$1 signup credit, no free models | **YES** | — | — | **[unverified]** |
| 20 | **Hyperbolic** | ⚠️ Free trial credits no longer advertised (Sep 2026) | **YES** | — | — | **[unverified]** |
| 21 | **Nebius / Chutes.ai / AINative** | ⚠️ Free tiers suspended or ended | — | — | — | **[unverified]** |
| 22 | **GitHub Models** | ❌ **RETIRED 30 July 2026** — playground, catalog, inference API and BYOK all gone | — | — | — | **[verified]** (official docs) |
| 23 | **DeepSeek official** | ❌ **No free tier.** Cheapest paid: $0.15/M in, $0.60/M out (off-peak Flash) | — | — | ✅ | **[verified]** |

**Bottom line on "unlimited": nothing is unlimited.** The two recurring "unlimited" claims I found are both conditioned: Z.ai's *September promo* (GLM-5.3-Flash unlimited 23:00–09:00 daily, **paid plans only**, ends 7 Oct 2026) and Mistral's free plan, which is bounded by a 1 req/s throttle rather than a token cap. A 1 req/s serial ceiling is the real catch — an agent loop making 12 serial round-trips per task gets ~12 tasks/hour at best.

---

## 2. Which free models actually support tool calling (the critical filter)

| Provider | Free models WITH tools | Free models WITHOUT tools |
|---|---|---|
| OpenRouter | 18 of 20 `:free` models (full list §4) | `z-ai/glm-5.2:free`, `nvidia/nemotron-3.5-content-safety:free` |
| Google AI Studio | All Gemini 3.x Flash / Flash-Lite (function calling is a first-class feature) | — |
| Groq | gpt-oss-120b, gpt-oss-20b, gpt-oss-safeguard-20b, qwen/qwen3.8-27b | prompt-guard, orpheus TTS, whisper |
| Z.ai free | GLM-4.7-Flash, GLM-4.5-Flash, GLM-4.6V-Flash (dedicated Function Calling docs) | — |
| Cloudflare | llama-3.1-8b/3.3-70b/4-scout, qwen2.5-coder-32b, qwen3-30b-a3b, gpt-oss-20b/120b, gemma-3-12b, glm-4.7-flash, granite-4.0-h-micro | (function calling is a Workers AI feature, not per-model) |
| SambaNova | DeepSeek-V3.1/V3.2, Llama-3.3-70B, gpt-oss-120b, gemma-4-31B-it | — |
| NVIDIA NIM | Nemotron 3 Ultra/Super, DeepSeek V4 Pro, Kimi K3 etc. (tool calling advertised on model cards) | — |
| Mistral | Codestral, Mistral Small 4 / Medium 3 / Large 3 (function calling supported) | — |
| Cohere | Command A, Command R+, Command R | — |

**Providers whose free tier is NOT viable as an agent driver:** SambaNova (20 requests/**day**), Cohere (1,000 calls/month + non-commercial clause), Cerebras (30-day expiry), Together/Fireworks/Hyperbolic (no real free tier), GitHub Models (dead).

---

## 3. Per-provider detail

### 3.1 Google AI Studio (Gemini) — best model quality per request, worst requests/day
- **(a) Limits:** Google **removed the free-tier RPM/RPD tables from its docs**. [The rate-limits page](https://ai.google.dev/gemini-api/docs/rate-limits) now says only "can be viewed in Google AI Studio" and "specified rate limits are not guaranteed". A [2026-09-02 measurement run](https://dev.to/romeroyang/geminis-free-tier-measured-20-requests-a-day-and-google-no-longer-publishes-the-number-4gf2) read the real limits out of the `google.rpc.QuotaFailure` payload in the 429 body: `gemini-3.7/3.6/3.5-flash` = **5 RPM / 20 RPD**; `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite` = **15 RPM / 500 RPD**; `gemini-embedding-2` = 100 RPM / 1,000 RPD.
- **(b) Card:** Not required for the free tier.
- **(c) Free models:** Per [the pricing page](https://ai.google.dev/gemini-api/docs/pricing), the Free Tier column reads "Free of charge" for Gemini 3.8 Flash, 3.7 Flash, 3.6 Flash, 3.5 Flash and the Flash-Lite models. **Batch / Flex / Google Search grounding are "Not available" on the free tier.**
- **(d) Tools:** Yes — full function calling, and free-tier requests are billed at $0 for input and output.
- **(e) Base URL:** `https://generativelanguage.googleapis.com/v1beta` (native) and `.../v1beta/openai/` (OpenAI-compatible).
- **(f) Gotchas:** ① Quota is **per project, not per key** — minting extra keys buys nothing. ② RPD resets at **midnight Pacific**. ③ **Gemini 2.5 Pro / Flash / Flash-Lite return 404 to newly created keys** ("no longer available to new users") even though the pricing page still lists them as free — so the free Google Search grounding attached to those two models is unreachable for new signups. ④ Free-tier prompts **are used to improve Google products**. ⑤ Free tier unavailable in EU/UK/Switzerland. ⑥ Latency on free 3.7 Flash was measured at 27–354 s under concurrency. ⑦ **20 RPD ≈ one to two complete agent tasks per day.**

### 3.2 Cerebras — the free tier is gone (biggest stale-info trap)
- **(a)** Official [rate-limits page](https://inference-docs.cerebras.ai/support/rate-limits) still shows a "Free Trial" column (gpt-oss-120b & qwen-3.8-27b: 5 RPM, 30K uncached TPM, 90K total TPM, 1M TPH, 1M TPD), **but the FAQ says**: *"Is there a permanently free tier? **No.** The Free Trial is time- and credit-bounded: $5 in credits that expire 30 days after they're granted… Cerebras doesn't currently offer a no-cost tier that renews automatically or a per-model always-free allowance."*
- **(b) Card: YES** — *"New accounts receive $5 in free credits **after adding a verified payment method**… If you skip adding a payment method at sign-up, Playground and API access remain inactive."*
- **(c)/(d)** All public models, tool calling supported, `https://api.cerebras.ai/v1` (OpenAI-compatible).
- **(f)** Multiple 2026 listicles (pricepertoken.com, awesome-free-llm-apis) still advertise a no-card 1M-tokens/day Cerebras free tier. **That is stale.** pricepertoken also claims an 8,192-token free-tier context cap — not stated in Cerebras' own docs; treat as unverified.

### 3.3 Groq — the best genuinely-free tier with real tool calling
- **(a)** From [console.groq.com/docs/rate-limits](https://console.groq.com/docs/rate-limits) (Free Plan tab): `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `openai/gpt-oss-safeguard-20b`, `qwen/qwen3.8-27b` → **30 RPM / 1,000 RPD / 8K TPM / 200K TPD**; `llama-prompt-guard-2-22m|86m` → 30 / 14.4K / 15K / 500K; `canopylabs/orpheus-*` TTS → 10 / 100; `whisper-large-v3[-turbo]` → 20 RPM / 2K RPD / 7.2K ASH / 28.8K ASD.
- **(b)** No credit card for the free tier; a card is only needed to reach the Developer tier.
- **(d)** Yes — Groq documents local tool calling, built-in tools, remote MCP, and **first-class coding-agent integrations for Cline, Roo Code, Kilo Code, OpenCode and Factory Droid** ([Coding with Groq](https://console.groq.com/docs/coding-with-groq)).
- **(e)** `https://api.groq.com/openai/v1`, OpenAI-compatible.
- **(f) Caveat I could not fully resolve:** the page renders two tabs ("Free Plan Limits" / "Developer Plan Limits") but the markdown export contains only **one** table of 10 models, and the surrounding prose says the table shows *"the base limits for the Developer plan."* The figures I quote match Groq's long-standing free tier, but I could not isolate the second table programmatically. **Verify your own numbers at `console.groq.com/settings/limits` after signing up.** Other gotchas: limits apply at the **organization** level; cached tokens don't count against limits; `retry-after` is only set on 429.

### 3.4 NVIDIA NIM / build.nvidia.com
- **(a)** build.nvidia.com advertises **"Free serverless APIs for development"** and labels many models "Free Endpoint" (Nemotron 3.5 Lightning, Nemotron 3 Ultra 550B, DeepSeek V4 Pro, Kimi K3). Reported credit grant: **1,000 credits on NVIDIA Developer Program signup, expandable to 5,000 on request, no credit card** ([CryptoBriefing via KuCoin, Jul 2026](https://www.kucoin.com/news/flash/nvidia-offers-free-ai-inference-credits-to-developers)).
- **(f)** I could **not** confirm the credit numbers on NVIDIA's own docs — `build.nvidia.com/faq` returned no usable content and the NIM offer page did not state them. Treat as **[unverified]**. These are one-time prototyping credits, not a renewing quota, so they are unsuitable as a harness's primary driver.

### 3.5 Mistral La Plateforme — most generous claim, weakest verification
- **(a)/(c)** Reported "Experiment"/free mode: **~1 req/s, 500K TPM, ~1B tokens/month**, covering Mistral Small 4, Mistral Medium 3, Mistral Large 3, Mistral Nemo, Codestral and Pixtral Large. Source: [awesome-free-llm-apis](https://github.com/ismailkonvah/awesome-free-llm-apis).
- **(b)** No credit card, but **phone verification and data-usage opt-in are required**.
- **(d)** Yes — Mistral's models support function calling.
- **(e)** `https://api.mistral.ai/v1`, OpenAI-compatible.
- **(f) ⚠️ Flag:** I could not verify this against Mistral's own docs. `docs.mistral.ai/deployment/laplateforme/tier/` and `/overview/` both return their site's "Page not found" template (Mistral has restructured its docs around "Studio / Vibe / Compute" branding), and `mistral.ai/pricing` now presents Vibe chat/mobile tiers, not API tiers. **If the ~1B tokens/month figure is real, Mistral is arguably the single most generous free tier in this report — but confirm it in the Mistral console before depending on it.** Note the 1 req/s serial throttle.

### 3.6 GitHub Models — DEAD
[Official GitHub Docs](https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models): *"GitHub Models has been retired. As of **July 30, 2026**, GitHub Models has been fully retired. The playground, model catalog, inference API, and bring your own key (BYOK) are no longer available to any customer."* GitHub points users to Azure AI Foundry or Copilot. Any list still showing `https://models.inference.ai.azure.com` is stale.

### 3.7 Cloudflare Workers AI
- **(a)** **10,000 Neurons/day** free on both Workers Free and Workers Paid; $0.011/1,000 Neurons above that on Paid. All limits reset **00:00 UTC**.
- **(b)** No credit card for the 10K/day allocation.
- **(c) Free-eligible models** (per [pricing page](https://developers.cloudflare.com/workers-ai/platform/pricing/), dated 17 Sep 2026): llama-3.2-1b/3b, llama-3.1-8b-fp8-fast, llama-3.3-70b-instruct-fp8-fast, llama-4-scout-17b, qwen3-30b-a3b-fp8, qwen2.5-coder-32b, qwq-32b, gpt-oss-20b, gpt-oss-120b, gemma-3-12b-it, gemma-4-26b-a4b-it, granite-4.0-h-micro, glm-4.7-flash, mistral-small-3.1-24b, llama-3.2-11b-vision. **Require a paid billing method:** `@cf/moonshotai/kimi-k2.6`, `kimi-k2.7-code`, `@cf/zai-org/glm-5.2`, `glm-5.3`, `glm-5.3-flash`, `@cf/deepseek-ai/deepseek-v4-flash-0731`, `deepseek-v4-pro-0813`.
- **(d)** Yes — Workers AI has **Function calling** (beta) with Traditional and Embedded modes.
- **(e)** `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/` plus an OpenAI-compatible endpoint under `.../ai/v1/`.
- **(f) The quota is tiny.** 10,000 neurons/day buys roughly: glm-4.7-flash ≈ 1.8M input tokens *or* 275K output tokens; gpt-oss-120b ≈ 314K input / 147K output; llama-3.2-1b ≈ 4M input. Also note the [2026-07-28 changelog](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/) moving selected models behind Workers Paid.

### 3.8 Vercel AI Gateway
- **(a)** Free tier: **$5/month included credit**; free tier includes **a subset of models, not the full catalog**; "Free tier requests are also rate limited per model, with lower limits than the paid tier."
- **(b)** No card to start; purchasing credits moves you to the paid tier and **the monthly free credit no longer applies**.
- **(d)** Yes for tool-tagged models (the public model list at `https://ai-gateway.vercel.sh/v1/models` exposes `supported_parameters` including `tools` / `tool_choice`).
- **(e)** `https://ai-gateway.vercel.sh/v1`, OpenAI-compatible. Zero markup on provider list price; **BYOK is paid-tier only** (and free-tier requests can fall back to system credentials, billed against your credits).
- **(f) Flag:** I could not retrieve the **numeric** free-tier per-model rate limits or the definitive free-tier-eligible model list — both live behind a dashboard-filtered view. $5/month is real but small for agentic coding (roughly 3–7M tokens of a cheap model, or far less on a frontier model).

### 3.9 Z.ai / Zhipu (GLM)
- **(a)/(c) Permanent free API models** ([docs.z.ai pricing](https://docs.z.ai/guides/overview/pricing)): **GLM-4.7-Flash, GLM-4.5-Flash, GLM-4.6V-Flash** are listed as `Free / Free / Free / Free` across input, cached input, storage and output. GLM-4.7-Flash has a 200K context. Reported throttle: **~1 concurrent request**. GLM-4.7-Flash is a genuinely capable coding model.
- **(d)** Yes — Z.AI has dedicated **Function Calling**, Tool Streaming Output and Stream Tool Call docs.
- **(e)** `https://api.z.ai/api/paas/v4/` (global) / `https://open.bigmodel.cn/api/paas/v4` (China). OpenAI-compatible; also an Anthropic-format route `https://api.z.ai/api/anthropic`.
- **(f) The cheap paid upgrade — GLM Coding Plan** (this is the interesting "very cheap" option, *not* free): Lite **$18/mo** (2,000 five-hour credits / 10,000 weekly), Pro **$80/mo** (12,000 / 60,000), Max **$168/mo** (28,000 / 140,000); annual-effective $12.60 / $56 / $117.60. Credits are **weighted tokens**: for GLM-5.3 the multipliers are in 6.9 / cached-in 1.7 / out 24, divided by 10,000. **50% off-peak discount**, peak = Mon–Fri 06:00–10:00 UTC. Coding Plan endpoints: `https://api.z.ai/api/anthropic`, `https://api.z.ai/api/coding/paas/v4`, `https://api.z.ai/api/v1`. **Gotchas:** the plan is **strictly limited to supported coding tools** (Claude Code, Cline, Roo, Kilo, OpenCode, OpenClaw, Crush, Goose…) and must not be used as a general-purpose API key; the five-hour allowance resets dynamically 5 hours after consumption, not on a fixed clock. Promo (3 Sep – 7 Oct 2026, 23:00–09:00 daily): paid users get unlimited GLM-5.3-Flash via ZCode plus doubled quota on other agents. Coding-Plan numbers come from a third-party guide that states it was checked against official pages on 26 Aug 2026 — treat prices as **[unverified against official checkout]**.

### 3.10 DeepSeek official — no free grant
- **(a)** **No free tier.** [Official pricing](https://api-docs.deepseek.com/quick_start/pricing) lists only paid rates. The billing section does mention a **"granted balance"** that is consumed before topped-up balance — i.e. DeepSeek may occasionally grant promotional credit — but nothing standing or advertised.
- **(b)** Card/prepaid top-up required.
- **(c)/(d)** `deepseek-flash` (DeepSeek-V4.1-Flash): **$0.15/M in, $0.60/M out off-peak**; $0.30 / $1.20 peak; cache-hit input $0.003–$0.006/M. `deepseek-v4-pro`: $0.66/$1.98 off-peak, $1.32/$3.96 peak. Peak = 01:00–04:00 and 06:00–10:00 UTC Mon–Fri. 1M context, 384K max output. **Tool Calls ✓, Responses API ✓, Anthropic API ✓** on both.
- **(e)** `https://api.deepseek.com` (OpenAI format), `https://api.deepseek.com/anthropic` (Anthropic format).
- **(f)** Not free, but off-peak Flash at $0.15/M in is one of the cheapest ways to drive a real agent loop, and the Anthropic-format endpoint drops straight into Claude-Code-style harnesses.

### 3.11 Together / Fireworks / Hyperbolic / Novita / SambaNova / Scaleway / OVH
- **Together AI — none.** [Official](https://docs.together.ai/docs/billing-credits): *"Together AI does not currently offer free trials. Access to the Together platform requires a minimum $5 credit purchase. Together AI is fully prepaid."*
- **Fireworks AI** — no free models; ~$1 signup credit **[unverified]**.
- **Hyperbolic** — free trial credits **no longer advertised** (Sep 2026); payment method required for GPU compute **[unverified]**.
- **Novita AI** — signup credits for testing 100+ models, OpenAI-compatible; **amount not published** **[unverified]**.
- **SambaNova Cloud** — [official](https://docs.sambanova.ai/docs/en/models/rate-limits): **Free Tier** (no payment method linked) = **20 RPM / 20 RPD / 200K TPD** on DeepSeek-V3.1, Meta-Llama-3.3-70B-Instruct, gpt-oss-120b, plus preview models DeepSeek-V3.2 and gemma-4-31B-it. Developer Tier = 60–240 RPM, 12K–48K RPD, 20M TPD cap. Function calling supported; OpenAI-compatible. **20 requests/day is not agent-viable.** One third-party list claims SambaNova tightened this further in Sep 2026 (payment method required before first request) — that contradicts the official page; verify in-account.
- **Scaleway Generative APIs** — reported **$0, ~1M tokens total**, EU/GDPR, Qwen3 235B **[unverified]**; the provider's key-help URL reportedly 404s.
- **OVHcloud AI Endpoints** — reported **14 free models**, EU-hosted, **12 RPM**, anonymous tier needs no registration, OpenAI-compatible, includes Qwen/Mistral/Llama/DeepSeek/gpt-oss-120B **[unverified]**. Interesting purely for the EU/GDPR angle.

### 3.12 OpenRouter — verified in full
- **(a) Exact limits, read from the constants embedded in [the official limits doc](https://openrouter.ai/docs/api-reference/limits) source:**
  - `FREE_MODEL_RATE_LIMIT_RPM = 20`
  - `FREE_MODEL_NO_CREDITS_RPD = 50`
  - `FREE_MODEL_HAS_CREDITS_RPD = 1000`
  - `FREE_MODEL_CREDITS_THRESHOLD = 10` → **the 1,000 RPD tier unlocks on $10 of *lifetime* credit purchases** (the doc checks "whether the user has paid for credits before" via the `is_free_tier` flag, so it is a lifetime threshold, not a balance requirement).
  - **Your understanding is confirmed and refined.**
- **(b)** No card to sign up; a one-time $10 purchase raises the daily cap 20×.
- **(c)/(d)** 20 free models; 18 support tools (full list in §4).
- **(e)** `https://openrouter.ai/api/v1`, OpenAI-compatible.
- **(f) Gotchas:** ① A **negative** credit balance blocks free models too (402 Payment Required) — you need balance ≥ $0. ② Free-model quota is a **separate daily counter**, inspectable via `GET /api/v1/key` → `free_model_daily_requests {used, limit, remaining}`, which resets on a **UTC day**. ③ Free models are excluded from the in-flight spending budget. ④ `:free` variants carry their **own upstream provider** limits and can 429 independently of the OpenRouter cap. ⑤ Free-model inventory churns — the count is 20 right now (was ~23 in a Sep 20 listicle). **If you want 1,000 RPD, budget $10 once.**

---

## 4. OpenRouter free models supporting tool calling (live API, 2026-09-21)

`GET https://openrouter.ai/api/v1/models` → 455 models total, **20** with ids ending in `:free`, **18** with `"tools"` in `supported_parameters`:

| Model id | Context |
|---|---|
| `thinkingmachines/inkling:free` | 1,048,576 |
| `thinkingmachines/inkling-small:free` | 1,048,576 |
| `nvidia/nemotron-3.5-lightning:free` | 1,000,000 |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | 1,000,000 |
| `dots-studio/dots-3-note-preview:free` | 512,000 |
| `nex-agi/nex-n2.5-mini:free` | 262,144 |
| `nex-agi/nex-n2.5-pro:free` | 262,144 |
| `inclusionai/ling-3.0-flash-sante:free` | 262,144 |
| `inclusionai/ling-3.0-flash-fin:free` | 262,144 |
| `qwen/qwen3.8-27b:free` | 262,144 |
| `poolside/laguna-s-2.1:free` | 262,144 |
| `poolside/laguna-xs-2.1:free` | 262,144 |
| `nvidia/nemotron-3-super-120b-a12b:free` | 262,144 |
| `google/gemma-4-31b-it:free` | 262,144 |
| `google/gemma-4-26b-a4b-it:free` | 262,144 |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | 256,000 |
| `cohere/north-mini-code:free` | 256,000 |
| `liquid/lfm-2.5-2.6b:free` | 65,536 |
| **`z-ai/glm-5.2:free`** | 32,768 — ❌ **no tools** |
| **`nvidia/nemotron-3.5-content-safety:free`** | 128,000 — ❌ **no tools** (safety classifier) |

Notable: `cohere/north-mini-code:free` and both `poolside/laguna-*:free` are coding-oriented; `nvidia/nemotron-3.5-lightning:free`, `nvidia/nemotron-3-ultra-550b-a55b:free` and `thinkingmachines/inkling:free` give you 1M context for free — unusually good for a tool-calling agent that accumulates file context.

---

## 5. Best picks for an agentic coding harness

**1. OpenRouter free tier + a one-time $10 lifetime credit — the single highest-leverage move.**
$10 once buys 20× the daily quota (**1,000 req/day** at 20 RPM instead of 50/day), and the same key gives you **18 different tool-calling free models** through one OpenAI-compatible endpoint — including 1M-context Nemotron 3.5 Lightning / Nemotron 3 Ultra / Inkling and a purpose-built coding model (`cohere/north-mini-code:free`). For a harness that needs to *fall back* between models when one 429s, having 18 tool-capable free models behind one base URL is worth more than any single provider's quota. Requirement: card on file for the $10 (the only money you'd spend), and keep your balance ≥ $0.

**2. Groq free tier — the best genuinely free, no-card, tool-calling driver.**
**30 RPM / 1,000 RPD / 200K TPD** on `gpt-oss-120b`, `gpt-oss-20b` and `qwen/qwen3.8-27b`, with no credit card, full tool calling, and by far the lowest latency of anything here (LPU inference). Groq also ships **documented, first-class configs for Cline, Roo Code, Kilo Code, OpenCode and Factory Droid** — i.e. it is already used the way you intend to use it. This is the pick if you want to stay at exactly $0.

**3. Google AI Studio Gemini 3.x Flash / Flash-Lite — the quality escalation lane, not the driver.**
Free of charge, tool calling, frontier-class coding quality, and Flash-Lite gets **15 RPM / 500 RPD** — a real daily budget. But **Gemini 3.x Flash is only 5 RPM / 20 RPD**, which is ~1–2 agent tasks/day. Use it as the *escalation* model for hard problems, with Flash-Lite (500 RPD) or Groq as the everyday driver. Remember quota is per **project**, RPD resets at **midnight Pacific**, and free-tier prompts train Google's products.

**Cheap (not free) upgrade worth knowing: Z.ai's free GLM-4.7-Flash models** (200K context, tool calling, no card) are worth wiring in as a 4th fallback, and if the ~1-concurrent-request throttle bites, the **GLM Coding Plan Lite at $18/mo** is the cheapest subscription explicitly engineered for agentic coding — with a 1M-context alias, Anthropic-format endpoint (`https://api.z.ai/api/anthropic`, drop-in for Claude-Code-shaped harnesses), and 50% off-peak credit pricing.

**Explicitly do not build on:** Cerebras (free tier abolished, now card-gated $5/30 days), Together AI (no free tier), GitHub Models (retired 30 Jul 2026), SambaNova free (20 requests/day), Cohere free (1,000 calls/month + non-commercial), NVIDIA NIM (one-time prototyping credits only).

---

## 6. Sources

Official: [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) · [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) · [Cerebras rate limits + FAQ](https://inference-docs.cerebras.ai/support/rate-limits) · [Groq rate limits](https://console.groq.com/docs/rate-limits) · [Groq billing FAQ](https://console.groq.com/docs/billing-faqs) · [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) · [Cloudflare changelog 2026-07-28](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/) · [Vercel AI Gateway pricing](https://vercel.com/docs/ai-gateway/pricing) · [Vercel AI Gateway rate limits](https://vercel.com/docs/ai-gateway/rate-limits) · [Z.AI pricing](https://docs.z.ai/guides/overview/pricing) · [Z.AI Coding Plan](https://docs.z.ai/devpack/overview) · [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing) · [SambaNova rate limits](https://docs.sambanova.ai/docs/en/models/rate-limits) · [Together AI credits](https://docs.together.ai/docs/billing-credits) · [OpenRouter limits](https://openrouter.ai/docs/api-reference/limits) · [GitHub Models retirement notice](https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models)

Live API: `https://openrouter.ai/api/v1/models` (queried 2026-09-21)

Third-party / measurement: [Gemini free tier measured, 2026-09-02](https://dev.to/romeroyang/geminis-free-tier-measured-20-requests-a-day-and-google-no-longer-publishes-the-number-4gf2) · [NVIDIA free inference credits, Jul 2026](https://www.kucoin.com/news/flash/nvidia-offers-free-ai-inference-credits-to-developers) · [awesome-free-llm-apis](https://github.com/ismailkonvah/awesome-free-llm-apis) · [awesome-free-models](https://github.com/12britz/awesome-free-models) · [GLM 5.3 Coding Plan guide](https://glm5.app/blog/glm-5-3-coding-plan) · [pricepertoken Cerebras (STALE)](https://pricepertoken.com/endpoints/cerebras/free)

### Known verification gaps
1. **Mistral's ~1B tokens/month** — official tier docs 404; source is a third-party list. Highest-value unverified claim in this report.
2. **Gemini free-tier RPM/RPD** — Google stopped publishing them; figures are from a single 2026-09-02 measurement via 429 quota payloads.
3. **Groq free vs. Developer table** — page prose conflicts with the single exported table; looked up your own limits after signup.
4. **NVIDIA NIM credit counts** — not stated on NVIDIA's own docs.
5. **Vercel free-tier rate limits and eligible-model list** — only reachable through the authenticated dashboard.
6. **Z.AI Coding Plan prices** — third-party guide claiming an Aug 2026 re-check against official pages.
7. **Scaleway / OVH / Novita / Fireworks / OpenCode Zen / Alibaba Bailian** — third-party only, not verified against official pages.
