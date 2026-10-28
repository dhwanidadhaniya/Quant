from __future__ import annotations

import inspect
import uuid
from typing import Any

import numpy as np

from app.agents import (
    LLMAgent,
    MarketMakerAgent,
    MomentumAgent,
    NoiseTrader,
    Observation,
    RandomAgent,
    BookView,
    agent_decision_seed,
)
from app.engine.asset import AssetEngine
from app.engine.news import NewsEngine
from app.engine.orderbook import Order, OrderBook, Trade
from app.engine.portfolio import Portfolio
from app.engine.signals import draw_signal
from app.engine.validator import validate_quote
from app.providers import ModelProvider
from app.research.performance import max_drawdown
from app.schemas import ExperimentConfig
from app.strategy.exploit import ExploitStrategy, PublicState, StrategyParams

STRATEGY_ID = "STRAT"
RULES = [RandomAgent, NoiseTrader, MomentumAgent, MarketMakerAgent]


def llm_agent_count(config: ExperimentConfig) -> int:
    if config.agent_mix == "rules":
        return 0
    if config.agent_mix == "mixed":
        return sum(1 for i in range(config.agents) if i % 2 == 0)
    return config.agents


def build_roster(config: ExperimentConfig, provider: ModelProvider, prompt_version: str) -> list:
    personas = config.personas or ["cautious-mm"]
    roster = []
    for index in range(config.agents):
        agent_id = f"A{index + 1:02d}"
        persona = personas[index % len(personas)]
        use_rule = config.agent_mix == "rules" or (config.agent_mix == "mixed" and index % 2 == 1)
        if use_rule:
            roster.append(RULES[index % len(RULES)](agent_id, persona))
        else:
            roster.append(
                LLMAgent(
                    agent_id=agent_id,
                    provider=provider,
                    model=config.model,
                    temperature=config.temperature,
                    persona=persona,
                    prompt_version=prompt_version,
                    oracle=config.oracle,
                    signal_noise=config.signal_noise,
                )
            )
    return roster


def _sign(trades: list[Trade]) -> int:
    net = 0.0
    for trade in trades:
        net += trade.quantity if trade.aggressor_side == "buy" else -trade.quantity
    if net > 1e-9:
        return 1
    if net < -1e-9:
        return -1
    return 0


def _apply(trades: list[Trade], portfolios: dict[str, Portfolio], fee: float) -> None:
    for trade in trades:
        portfolios[trade.buyer_id].apply("buy", trade.price, trade.quantity, fee)
        portfolios[trade.seller_id].apply("sell", trade.price, trade.quantity, fee)


def _submit_quote(book: OrderBook, agent_id: str, validated, round_idx: int) -> list[Trade]:
    trades: list[Trade] = []
    if validated.bid_size > 1e-9:
        seq = book.next_seq()
        trades.extend(
            book.add(
                Order(
                    order_id=f"{agent_id}-{round_idx}-b-{seq}",
                    agent_id=agent_id,
                    side="bid",
                    price=validated.bid,
                    size=validated.bid_size,
                    remaining=validated.bid_size,
                    seq=seq,
                    round_idx=round_idx,
                )
            )
        )
    if validated.ask_size > 1e-9:
        seq = book.next_seq()
        trades.extend(
            book.add(
                Order(
                    order_id=f"{agent_id}-{round_idx}-a-{seq}",
                    agent_id=agent_id,
                    side="ask",
                    price=validated.ask,
                    size=validated.ask_size,
                    remaining=validated.ask_size,
                    seq=seq,
                    round_idx=round_idx,
                )
            )
        )
    return trades


async def _produce(agent, obs: Observation):
    produce = agent.produce
    if inspect.iscoroutinefunction(produce):
        return await produce(obs)
    return produce(obs)


async def run_session(
    *,
    config: ExperimentConfig,
    provider: ModelProvider,
    session_seed: int,
    split: str,
    params: StrategyParams | None,
    prompt_version: str | None = None,
    include_strategy: bool = True,
    session_id: str | None = None,
    keep_prompts: bool = True,
) -> dict[str, Any]:
    prompt_version = prompt_version or config.prompt_version
    rng = np.random.default_rng(session_seed)
    asset = AssetEngine(rng, config)
    news_engine = NewsEngine(config)
    roster = build_roster(config, provider, prompt_version)
    portfolios = {agent.agent_id: Portfolio(config.initial_cash) for agent in roster}
    strategy = ExploitStrategy(params) if include_strategy and params is not None else None
    if strategy is not None:
        portfolios[STRATEGY_ID] = Portfolio(config.initial_cash)
    signal_memory = {agent.agent_id: {} for agent in roster}
    initial_true_value = float(asset.true_value)
    tape: list[dict] = []
    prev_mid = None
    opening_mid = None
    rounds = []
    parse_failures = 0
    n_trades = 0
    n_news = 0
    curve: list[float] = []
    session_key = session_id or f"ses_{uuid.uuid4().hex[:12]}"

    for round_idx in range(config.rounds):
        book = OrderBook()
        news = news_engine.draw(rng)
        if news.event != "NO_NEWS":
            n_news += 1
        true_value = asset.step(news.magnitude, rng)
        if config.oracle:
            for agent in roster:
                if isinstance(agent, LLMAgent):
                    agent.set_oracle_value(true_value)

        quotes = []
        round_trades: list[Trade] = []
        for agent in roster:
            signal, signal_error = draw_signal(true_value, rng, config, signal_memory[agent.agent_id])
            snap = book.snapshot()
            mark = snap["midpoint"] if snap["midpoint"] is not None else prev_mid
            portfolio = portfolios[agent.agent_id]
            last_trade = tape[-1]["price"] if tape else None
            obs = Observation(
                round_idx=round_idx,
                private_signal=signal,
                book=BookView.from_snapshot(snap),
                recent_trades=tape[-8:],
                inventory=portfolio.inventory,
                cash=portfolio.cash,
                pnl_vs_mid=None if mark is None else portfolio.pnl(mark),
                news_event=news.event,
                news_magnitude=news.magnitude,
                prev_midpoint=prev_mid,
                opening_midpoint=opening_mid,
                price_min=config.price_min,
                price_max=config.price_max,
                max_order_size=config.max_order_size,
                decision_seed=agent_decision_seed(session_seed, round_idx, agent.agent_id),
            )
            output = await _produce(agent, obs)
            inv_before = portfolio.inventory
            cash_before = portfolio.cash
            pnl_before = obs.pnl_vs_mid
            parsed = output.parsed
            error = output.error
            validated = None
            accepted = False
            bid = ask = size = None
            if parsed is not None and error is None:
                validated = validate_quote(parsed["bid"], parsed["ask"], parsed["size"], portfolios[agent.agent_id], config)
                if validated.ok:
                    accepted = True
                    bid, ask = validated.bid, validated.ask
                    size = parsed["size"]
                    fills = _submit_quote(book, agent.agent_id, validated, round_idx)
                    _apply(fills, portfolios, config.transaction_cost)
                    round_trades.extend(fills)
                    tape.extend(trade.as_dict() for trade in fills)
                else:
                    error = validated.reason
                    bid, ask, size = parsed["bid"], parsed["ask"], parsed["size"]
            else:
                parse_failures += 1
            quotes.append(
                {
                    "agent_id": agent.agent_id,
                    "model": output.model,
                    "temperature": output.temperature,
                    "persona": output.persona,
                    "prompt_version": output.prompt_version,
                    "private_signal": signal,
                    "signal_error": signal_error,
                    "raw_response": output.raw_response,
                    "parsed": output.parsed,
                    "prompt": output.prompt_messages,
                    "bid": bid,
                    "ask": ask,
                    "size": size,
                    "accepted": accepted,
                    "inventory": inv_before,
                    "cash": cash_before,
                    "pnl_vs_mid": pnl_before,
                    "error": error,
                    "prev_midpoint": prev_mid,
                    "last_trade": last_trade,
                    "opening_midpoint": opening_mid,
                    "news_event": news.event,
                    "news_magnitude": news.magnitude,
                }
            )

        pre_strategy_sign = _sign(round_trades)
        decision_payload = None
        if strategy is not None:
            snap = book.snapshot()
            public = PublicState(
                round_idx=round_idx,
                midpoint=snap["midpoint"],
                best_bid=snap["best_bid"],
                best_ask=snap["best_ask"],
                bid_size=float(snap["best_bid_size"]),
                ask_size=float(snap["best_ask_size"]),
                spread=snap["spread"],
                news_event=news.event,
                news_magnitude=news.magnitude,
                inventory=portfolios[STRATEGY_ID].inventory,
                position_limit=config.position_limit,
                max_order_size=config.max_order_size,
                transaction_cost=config.transaction_cost,
                recent_trade_signs=list(strategy.recent_trade_signs),
            )
            decision = strategy.decide(public, round_idx)
            if "true_value" in decision.input_state or "private_signal" in decision.input_state:
                raise RuntimeError("exploit strategy observed hidden or private information")
            strat_fills: list[Trade] = []
            if decision.order is not None:
                decision.order.seq = book.next_seq()
                decision.order.order_id = f"{decision.order.order_id}-{decision.order.seq}"
                strat_fills = book.add(decision.order)
                _apply(strat_fills, portfolios, config.transaction_cost)
                round_trades.extend(strat_fills)
                tape.extend(trade.as_dict() for trade in strat_fills)
            decision_payload = decision.as_dict()
            decision_payload["fills"] = [
                {
                    "side": "buy" if trade.buyer_id == STRATEGY_ID else "sell",
                    "price": trade.price,
                    "quantity": trade.quantity,
                }
                for trade in strat_fills
                if trade.buyer_id == STRATEGY_ID or trade.seller_id == STRATEGY_ID
            ]
            end_snap = book.snapshot()
            strategy.finalize_round(end_snap["midpoint"], news.magnitude, pre_strategy_sign)
        else:
            end_snap = book.snapshot()

        if opening_mid is None and end_snap["midpoint"] is not None:
            opening_mid = end_snap["midpoint"]
        prev_mid = end_snap["midpoint"] if end_snap["midpoint"] is not None else prev_mid
        n_trades += len(round_trades)
        portfolios_snap = {
            agent_id: portfolio.snapshot(end_snap["midpoint"], true_value) for agent_id, portfolio in portfolios.items()
        }
        if strategy is not None:
            curve.append(portfolios[STRATEGY_ID].pnl(true_value))
        rounds.append(
            {
                "round": round_idx,
                "true_value": true_value,
                "vol_shock": asset.last_vol_shock,
                "news_event": news.event,
                "news_magnitude": news.magnitude,
                "book": end_snap,
                "trades": [trade.as_dict() for trade in round_trades],
                "quotes": quotes,
                "portfolios": portfolios_snap,
                "strategy": decision_payload,
            }
        )

    terminal = float(asset.true_value)
    if strategy is not None:
        for rnd in rounds:
            decision = rnd["strategy"]
            if decision is None:
                continue
            realized = 0.0
            for fill in decision.get("fills") or []:
                qty = float(fill["quantity"])
                if fill["side"] == "buy":
                    realized += qty * (terminal - float(fill["price"])) - config.transaction_cost * qty
                else:
                    realized += qty * (float(fill["price"]) - terminal) - config.transaction_cost * qty
            decision["realized_pnl"] = realized
        strategy_pnl = portfolios[STRATEGY_ID].pnl(terminal)
    else:
        strategy_pnl = 0.0

    if not keep_prompts:
        for rnd in rounds:
            for quote in rnd["quotes"]:
                if not quote.get("error"):
                    quote["prompt"] = None

    agent_terminal = {
        agent.agent_id: portfolios[agent.agent_id].pnl(terminal) for agent in roster
    }
    final_mid = rounds[-1]["book"]["midpoint"] if rounds else None
    return {
        "id": session_key,
        "split": split,
        "seed": int(session_seed),
        "prompt_version": prompt_version,
        "include_strategy": strategy is not None,
        "oracle": config.oracle,
        "hidden_variables": [float(v) for v in asset.hidden],
        "initial_true_value": initial_true_value,
        "terminal_true_value": terminal,
        "final_mid": final_mid,
        "strategy_terminal_pnl": strategy_pnl,
        "strategy_terminal_pnl_vs_mid": None
        if strategy is None or final_mid is None
        else portfolios[STRATEGY_ID].pnl(final_mid),
        "strategy_max_drawdown": max_drawdown(curve) if strategy is not None else 0.0,
        "strategy_curve": curve,
        "agent_terminal": agent_terminal,
        "parse_failures": parse_failures,
        "n_trades": n_trades,
        "n_news": n_news,
        "rounds": rounds,
    }
