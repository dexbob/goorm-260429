from __future__ import annotations

import base64
import asyncio
import json
import os
import tempfile
import time
from pathlib import Path
from typing import Any, AsyncGenerator

import nbformat
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from openai import OpenAI
from dotenv import load_dotenv

from python.build_notebook import build_nb
from python.pipeline import run_pipeline

# 프로젝트 루트 .env 로드 (로컬 uvicorn 실행 시 필수)
ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")

app = FastAPI(title="d5-p1 API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logger(request: Request, call_next):
    start = time.time()
    try:
        response = await call_next(request)
    except Exception as e:
        elapsed_ms = int((time.time() - start) * 1000)
        print(
            f"[api] {request.method} {request.url.path} -> 500 ({elapsed_ms}ms) error={e}",
            flush=True,
        )
        raise
    elapsed_ms = int((time.time() - start) * 1000)
    print(
        f"[api] {request.method} {request.url.path} -> {response.status_code} ({elapsed_ms}ms)",
        flush=True,
    )
    return response


def _create_llm() -> tuple[OpenAI, str, str] | None:
    """OpenRouter 우선, 없으면 OpenAI 직접."""
    or_key = (os.getenv("OPENROUTER_API_KEY") or "").strip()
    if or_key:
        ref = (os.getenv("OPENROUTER_HTTP_REFERER") or "https://vercel.app").strip()
        title = (os.getenv("OPENROUTER_APP_NAME") or "goorm-data-analysis-agent").strip()
        client = OpenAI(
            api_key=or_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": ref,
                "X-Title": title,
            },
        )
        model = (os.getenv("OPENROUTER_MODEL") or "openrouter/free").strip()
        return client, model, "openrouter"

    oa_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if oa_key:
        client = OpenAI(api_key=oa_key)
        model = (os.getenv("OPENAI_MODEL") or "gpt-4o-mini").strip()
        return client, model, "openai"
    return None


def _compact_analysis_for_llm(analysis: dict[str, Any]) -> dict[str, Any]:
    prof = analysis.get("profile", {})
    charts = analysis.get("charts", []) or []
    by_type: dict[str, int] = {}
    for c in charts:
        t = str(c.get("type", "unknown"))
        by_type[t] = by_type.get(t, 0) + 1
    desc = analysis.get("describeNumeric", {}) or {}
    return {
        "rows": prof.get("rows"),
        "columns": prof.get("columns"),
        "sampled": prof.get("sampled"),
        "numericColumnsCount": len(prof.get("numericColumns", []) or []),
        "categoricalColumnsCount": len(prof.get("categoricalColumns", []) or []),
        "numericColumns": (prof.get("numericColumns", []) or [])[:120],
        "categoricalColumns": (prof.get("categoricalColumns", []) or [])[:120],
        "targetColumn": prof.get("targetColumn"),
        "missingTop": sorted(
            [
                {"column": k, "pct": v}
                for k, v in (prof.get("missingPct", {}) or {}).items()
                if isinstance(v, (int, float)) and v > 0
            ],
            key=lambda x: -x["pct"],
        )[:80],
        "chartCountByType": by_type,
        "chartCountTotal": len(charts),
        "chartTitleSample": [
            {"type": c.get("type"), "title": c.get("title")} for c in charts[:24]
        ],
        "describeColumnCount": len(desc),
        "describeNumericSample": dict(list(desc.items())[:48]),
        "topPearsonPairs": (analysis.get("topPearsonPairs") or [])[:120],
        "metaNotes": analysis.get("meta", {}).get("notes", []),
    }


@app.get("/api/health")
def health() -> dict[str, Any]:
    llm_info = _create_llm()
    return {
        "ok": True,
        "runtime": "fastapi-on-vercel",
        "llm": {
            "configured": llm_info is not None,
            "provider": (llm_info[2] if llm_info else None),
            "model": (llm_info[1] if llm_info else None),
        },
    }


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...), target: str | None = Form(default=None)):
    if not file.filename:
        return JSONResponse({"error": "CSV 파일이 필요합니다."}, status_code=400)

    raw = await file.read()
    if not raw:
        return JSONResponse({"error": "CSV 파일이 비어 있습니다."}, status_code=400)
    if len(raw) > 10 * 1024 * 1024:
        return JSONResponse({"error": "파일은 최대 10MB까지 업로드할 수 있습니다."}, status_code=413)

    # pipeline.py가 경로를 받으므로 임시 파일로 저장
    with tempfile.TemporaryDirectory(prefix="csv-ana-") as td:
        safe_name = (file.filename or "data.csv").replace("/", "_").replace("\\", "_")
        csv_path = os.path.join(td, safe_name)
        with open(csv_path, "wb") as f:
            f.write(raw)

        try:
            analysis = run_pipeline(csv_path, target or None)
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)

        nb = build_nb(safe_name, analysis)
        nb_text = nbformat.writes(nb)
        nb_b64 = base64.b64encode(nb_text.encode("utf-8")).decode("ascii")

        return {
            "analysis": analysis,
            "notebookFileName": "analysis_report.ipynb",
            "notebookBase64": nb_b64,
            "uploadedName": safe_name,
        }


@app.post("/api/insights/stream")
async def insights_stream(payload: dict[str, Any]):
    analysis = payload.get("analysis")
    if not isinstance(analysis, dict):
        return JSONResponse({"error": "Missing analysis"}, status_code=400)

    compact = _compact_analysis_for_llm(analysis)
    llm = _create_llm()
    if llm:
        client, model, provider = llm
    else:
        client, model, provider = None, "", ""
    sys = (
        "당신은 데이터 과학자입니다. 사용자 데이터 분석 요약 JSON만 보고 한국어로 "
        "실무 인사이트를 작성합니다. 추측은 명시하고, 수치는 요약에서만 인용합니다."
    )
    user = (
        "다음 데이터 분석 결과를 바탕으로:\n\n"
        "1. 데이터 특징\n"
        "2. 중요한 변수\n"
        "3. 이상 패턴\n"
        "4. 비즈니스 인사이트\n\n"
        "를 마크다운 형식으로 구조적으로 설명하라.\n\n"
        f"분석 요약:\n{json.dumps(compact, ensure_ascii=False)}"
    )

    async def sse() -> AsyncGenerator[bytes, None]:
        if not llm:
            yield f"data: {json.dumps({'error': '인사이트 분석에 실패했습니다.'}, ensure_ascii=False)}\n\n".encode(
                "utf-8"
            )
            return

        is_openrouter_free = provider == "openrouter" and model.lower() in {
            "openrouter/free",
            "free",
        }
        candidate_models = (
            [
                "openrouter/free",
                "google/gemma-2-9b-it:free",
                "mistralai/mistral-7b-instruct:free",
            ]
            if is_openrouter_free
            else [model]
        )
        max_attempts = min(3, len(candidate_models))
        last_error: Exception | None = None

        for attempt in range(1, max_attempts + 1):
            selected_model = candidate_models[attempt - 1]
            try:
                stream = client.chat.completions.create(
                    model=selected_model,
                    stream=True,
                    messages=[
                        {"role": "system", "content": sys},
                        {"role": "user", "content": user},
                    ],
                )
                emitted = False
                for part in stream:
                    text = part.choices[0].delta.content if part.choices else ""
                    if text:
                        emitted = True
                        yield f"data: {json.dumps({'text': text}, ensure_ascii=False)}\n\n".encode("utf-8")
                if not emitted:
                    raise RuntimeError("LLM 응답이 비어 있습니다.")
                yield b"data: [DONE]\n\n"
                return
            except Exception as e:
                last_error = e
                print(
                    f"[insights] LLM attempt {attempt}/{max_attempts} failed model={selected_model}: {e}",
                    flush=True,
                )
                if attempt < max_attempts:
                    backoff_sec = attempt * 1.5
                    await asyncio.sleep(backoff_sec)

        print(f"[insights] final failure: {last_error}", flush=True)
        yield f"data: {json.dumps({'error': '인사이트 분석에 실패했습니다.'}, ensure_ascii=False)}\n\n".encode(
            "utf-8"
        )

    return StreamingResponse(
        sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
