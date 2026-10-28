from __future__ import annotations

import json
from abc import ABC, abstractmethod
from typing import Any


class ProviderError(RuntimeError):
    pass


class ModelProvider(ABC):
    name: str

    @abstractmethod
    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float,
        context: dict[str, Any],
    ) -> str:
        raise NotImplementedError


def dump_messages(messages: list[dict[str, str]]) -> str:
    return json.dumps(messages, ensure_ascii=True)
