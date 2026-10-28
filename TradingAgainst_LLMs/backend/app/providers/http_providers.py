from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.config import Settings
from app.providers import ModelProvider, ProviderError


class OpenAICompatProvider(ModelProvider):
    name = "openai"

    def __init__(self, settings: Settings, model: str | None = None):
        if not settings.openai_api_key:
            raise ProviderError("OPENAI_API_KEY is not set")
        self.settings = settings
        self.model = model or settings.openai_model
        self._sem: asyncio.Semaphore | None = None

    def bind_semaphore(self, sem: asyncio.Semaphore) -> None:
        self._sem = sem

    async def complete(self, messages, *, temperature: float, context: dict[str, Any]) -> str:
        del context
        sem = self._sem or asyncio.Semaphore(self.settings.max_concurrency)
        delay = 0.4
        last: Exception | None = None
        for _ in range(self.settings.max_retries):
            try:
                async with sem:
                    return await self._once(messages, temperature)
            except Exception as exc:  # network / status / parse
                last = exc
                await asyncio.sleep(delay)
                delay *= 2
        raise ProviderError(f"openai-compatible request failed: {last}")

    async def _once(self, messages, temperature: float) -> str:
        url = f"{self.settings.openai_base_url}/chat/completions"
        payload = {
            "model": self.model,
            "temperature": temperature,
            "max_tokens": self.settings.max_output_tokens,
            "messages": messages,
        }
        headers = {"Authorization": f"Bearer {self.settings.openai_api_key}"}
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            body = response.json()
        return str(body["choices"][0]["message"]["content"])


class OllamaProvider(ModelProvider):
    name = "ollama"

    def __init__(self, settings: Settings, model: str | None = None):
        self.settings = settings
        self.model = model or settings.ollama_model
        self._sem: asyncio.Semaphore | None = None

    def bind_semaphore(self, sem: asyncio.Semaphore) -> None:
        self._sem = sem

    async def complete(self, messages, *, temperature: float, context: dict[str, Any]) -> str:
        del context
        sem = self._sem or asyncio.Semaphore(self.settings.max_concurrency)
        delay = 0.4
        last: Exception | None = None
        for _ in range(self.settings.max_retries):
            try:
                async with sem:
                    return await self._once(messages, temperature)
            except Exception as exc:
                last = exc
                await asyncio.sleep(delay)
                delay *= 2
        raise ProviderError(f"ollama request failed: {last}")

    async def _once(self, messages, temperature: float) -> str:
        url = f"{self.settings.ollama_base_url}/api/chat"
        payload = {
            "model": self.model,
            "stream": False,
            "messages": messages,
            "options": {
                "temperature": temperature,
                "num_predict": self.settings.max_output_tokens,
            },
        }
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            body = response.json()
        return str(body["message"]["content"])
