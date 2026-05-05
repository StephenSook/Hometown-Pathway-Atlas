# Prompts License Notice

All prompt-engineering assets in this directory — system instructions,
few-shot examples, response-schema descriptions, prompt templates — are
licensed under the **Apache License 2.0**, the same license as the rest
of the Hometown Pathway Atlas repository. See [`/LICENSE`](../../LICENSE)
for the full license text.

This explicit notice exists because prompts are first-class versioned
assets in this project — not just configuration strings. The system
instruction loaded by `backend/services/gemini_service.py` enforces 5
hard rules (conditional phrasing, Olympic+Paralympic parity, no athlete
names, no geographic causation, no IOC/USOPC marks) that are themselves
the IP-significant work of the project's AI safety design. Apache 2.0
coverage is intentional: contributors and downstream forks can reuse
the prompt patterns under the same permissive terms as the code.

## Files in this directory

- `system_instruction.md` — Vertex AI Gemini system instruction passed
  to every model call from `GeminiService`. Loaded at module init by
  `_load_system_instruction()` with a defensive inline fallback so the
  service boots even if the file is missing.
- `LICENSE.md` — this file.
