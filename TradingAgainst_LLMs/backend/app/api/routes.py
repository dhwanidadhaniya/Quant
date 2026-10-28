from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app import ENGINE_VERSION, __version__
from app.config import get_settings
from app.schemas import ExperimentConfig, FalsifyRequest
from app.sim.experiment import ExperimentError, run_experiment_blocking, run_falsification_blocking

router = APIRouter(prefix="/api")


def _fail(exc: ExperimentError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=str(exc))


@router.get("/health")
def health():
    return {"status": "ok", "version": __version__, "engine_version": ENGINE_VERSION}


@router.get("/system")
def system():
    settings = get_settings()
    return {
        "version": __version__,
        "engine_version": ENGINE_VERSION,
        "provider": settings.provider,
        "api_key_configured": bool(settings.openai_api_key),
        "openai_base_url": settings.openai_base_url,
        "openai_model": settings.openai_model,
        "ollama_base_url": settings.ollama_base_url,
        "ollama_model": settings.ollama_model,
        "max_concurrency": settings.max_concurrency,
        "max_output_tokens": settings.max_output_tokens,
        "max_retries": settings.max_retries,
        "database": str(settings.database_path),
        "available_providers": ["mock", "openai", "ollama"],
        "available_models": [
            "mock-anchor-v1",
            "mock-rational-v1",
            "mock-herd-v1",
            "mock-broken",
        ],
        "agent_types": ["llm", "random", "noise", "momentum", "market_maker"],
        "prompt_versions": ["v1", "v1-debias"],
        "default_experiment": ExperimentConfig().model_dump(),
        "disclaimer": (
            "Mock models are deterministic behavioral simulators, not production LLMs. "
            "Live providers are used only when selected and confirmed."
        ),
    }


@router.get("/experiments")
def list_experiments(request: Request):
    return {"experiments": request.app.state.db.list_experiments()}


@router.post("/experiments")
def create_experiment(config: ExperimentConfig, request: Request):
    try:
        return run_experiment_blocking(config, get_settings(), request.app.state.db)
    except ExperimentError as exc:
        raise _fail(exc) from exc


@router.get("/experiments/{experiment_id}")
def get_experiment(experiment_id: str, request: Request):
    result = request.app.state.db.get_result(experiment_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    return result


@router.get("/experiments/{experiment_id}/quotes")
def experiment_quotes(
    experiment_id: str,
    request: Request,
    limit: int = 80,
    offset: int = 0,
    failures_only: bool = False,
):
    if request.app.state.db.get_result(experiment_id) is None:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    return request.app.state.db.list_quotes(experiment_id, limit, offset, failures_only)


@router.post("/experiments/{experiment_id}/falsify")
def falsify(experiment_id: str, body: FalsifyRequest, request: Request):
    try:
        return run_falsification_blocking(experiment_id, body, get_settings(), request.app.state.db)
    except ExperimentError as exc:
        raise _fail(exc) from exc


@router.get("/experiments/{experiment_id}/falsification")
def get_falsification(experiment_id: str, request: Request):
    if request.app.state.db.get_result(experiment_id) is None:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    payload = request.app.state.db.get_falsification(experiment_id)
    return payload or {"experiment_id": experiment_id, "cells": [], "retuned": False}


@router.post("/experiments/{experiment_id}/export")
def export_experiment(experiment_id: str, request: Request):
    if request.app.state.db.get_result(experiment_id) is None:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    return {"files": request.app.state.db.export_parquet(experiment_id)}


@router.get("/sessions/{session_id}")
def get_session(session_id: str, request: Request):
    payload = request.app.state.db.get_session(session_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return payload
