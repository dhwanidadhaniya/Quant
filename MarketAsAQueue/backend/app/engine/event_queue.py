"""Priority event queue for the discrete-event market simulator.

Financial theory
----------------
A limit-order market is an asynchronous point process. Events (arrivals,
cancellations, executions) occur at irregular times. A priority queue
ordered by timestamp is the natural computational counterpart of that
process: the next market event is always the one with the smallest time.

Queueing theory
---------------
This is the event-scheduling method used for G/G/k and more general
queueing networks — not a clock that ticks in fixed Δt, but a calendar
of pending events. That preserves exact FIFO chronology at each price.
"""

from __future__ import annotations

import heapq
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass(order=True)
class ScheduledEvent:
    timestamp: float
    seq: int = field(compare=True)
    kind: str = field(compare=False)
    payload: dict[str, Any] = field(default_factory=dict, compare=False)


class EventQueue:
    def __init__(self) -> None:
        self._heap: list[ScheduledEvent] = []
        self._seq = 0

    def schedule(self, timestamp: float, kind: str, **payload: Any) -> ScheduledEvent:
        self._seq += 1
        ev = ScheduledEvent(timestamp=timestamp, seq=self._seq, kind=kind, payload=payload)
        heapq.heappush(self._heap, ev)
        return ev

    def pop(self) -> Optional[ScheduledEvent]:
        if not self._heap:
            return None
        return heapq.heappop(self._heap)

    def peek_time(self) -> Optional[float]:
        if not self._heap:
            return None
        return self._heap[0].timestamp

    def __len__(self) -> int:
        return len(self._heap)

    def clear(self) -> None:
        self._heap.clear()
        self._seq = 0
