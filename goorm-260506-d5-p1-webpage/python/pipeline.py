"""
CSV → 프로파일링, EDA, 시각화용 JSON (프론트 Recharts용).
Mercedes 노트북 스타일: pandas, seaborn 색상 철학 반영 (분포·상관·타겟 분석).
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from typing import Any

import numpy as np
import pandas as pd

MAX_ROWS = 10_000
UNIQUE_CAT_THRESHOLD = 20

# Mercedes 노트북 스타일: seaborn 팔레트·깔끔한 배경
try:
    import matplotlib

    matplotlib.use("Agg")
    import seaborn as sns

    sns.set_theme(style="whitegrid", palette="deep")
except ImportError:
    sns = None


def _safe_json(obj: Any) -> Any:
    if isinstance(obj, (np.integer, np.floating)):
        if isinstance(obj, np.floating) and (np.isnan(obj) or np.isinf(obj)):
            return None
        return float(obj) if isinstance(obj, np.floating) else int(obj)
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _safe_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_safe_json(v) for v in obj]
    return obj


def classify_columns(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    """기술명세: unique < 20 → 범주형, 그 외(수치로 해석 가능하면) 수치형."""
    num_cols: list[str] = []
    cat_cols: list[str] = []
    for c in df.columns:
        s = df[c]
        nunique = int(s.nunique(dropna=True))
        if nunique <= 1:
            cat_cols.append(c)
            continue

        if pd.api.types.is_numeric_dtype(s):
            if nunique < UNIQUE_CAT_THRESHOLD:
                cat_cols.append(c)
            else:
                num_cols.append(c)
            continue

        conv = pd.to_numeric(s, errors="coerce")
        if conv.notna().sum() >= max(1, int(0.5 * len(s))):
            if nunique < UNIQUE_CAT_THRESHOLD:
                cat_cols.append(c)
            else:
                num_cols.append(c)
        else:
            cat_cols.append(c)
    return num_cols, cat_cols


def detect_target(df: pd.DataFrame, override: str | None) -> str | None:
    if override and override in df.columns:
        return override
    lower = {c.lower(): c for c in df.columns}
    for key in ("y", "target", "label"):
        if key in lower:
            return lower[key]
    return None


def detect_identifier_columns(df: pd.DataFrame, target: str | None) -> list[str]:
    """
    분석에서 제외할 ID 성격 컬럼 추정:
    - 이름 패턴(id, *_id, uuid, identifier 등)
    - 거의 유일값(행 수 대비 고유값 비율이 매우 높음)
    """
    out: list[str] = []
    n = max(1, len(df))
    name_pat = re.compile(r"(^id$|(^|_)id($|_)|uuid|identifier|index$)", re.IGNORECASE)
    for c in df.columns:
        if target and c == target:
            continue
        s = df[c]
        nunique = int(s.nunique(dropna=True))
        uniq_ratio = nunique / n
        by_name = bool(name_pat.search(str(c)))
        by_uniqueness = nunique >= 50 and uniq_ratio >= 0.98
        if by_name or by_uniqueness:
            out.append(c)
    return out


def build_histogram_series(series: pd.Series, bins: int = 30) -> list[dict[str, Any]]:
    series = pd.to_numeric(series, errors="coerce").dropna()
    if series.empty:
        return []
    counts, edges = np.histogram(series.to_numpy(), bins=bins)
    out: list[dict[str, Any]] = []
    for i in range(len(counts)):
        lo, hi = edges[i], edges[i + 1]
        label = f"{lo:.3g}–{hi:.3g}"
        out.append({"bin": label, "count": int(counts[i]), "x": (lo + hi) / 2})
    return out


def quartiles(series: pd.Series) -> dict[str, float | None]:
    s = pd.to_numeric(series, errors="coerce").dropna()
    if s.empty:
        return {"min": None, "q1": None, "median": None, "q3": None, "max": None}
    qs = s.quantile([0.0, 0.25, 0.5, 0.75, 1.0])
    return {
        "min": float(qs.iloc[0]),
        "q1": float(qs.iloc[1]),
        "median": float(qs.iloc[2]),
        "q3": float(qs.iloc[3]),
        "max": float(qs.iloc[4]),
    }


def correlation_heatmap_from_df(df: pd.DataFrame, use: list[str]) -> dict[str, Any]:
    if len(use) < 2:
        return {"labels": [], "matrix": []}
    sub = df[use].apply(pd.to_numeric, errors="coerce")
    corr = sub.corr(numeric_only=True)
    labels = [str(c) for c in corr.columns]
    matrix = corr.replace(np.nan, 0).values.tolist()
    return {"labels": labels, "matrix": matrix}


def select_heatmap_columns(
    num_cols: list[str], corr_mat: pd.DataFrame, target: str | None, max_cols: int = 52
) -> list[str]:
    if corr_mat.empty or len(corr_mat.columns) == 0:
        return num_cols[: min(max_cols, len(num_cols))]
    usable = [c for c in num_cols if c in corr_mat.columns and c in corr_mat.index]
    if len(usable) < 2:
        return list(usable)
    if len(usable) <= max_cols:
        return list(usable)
    sel: list[str] = []
    if target and target in usable:
        sel.append(target)
    if target and target in usable and target in corr_mat.columns:
        row = corr_mat[target].reindex(usable).dropna()
        if len(row) > 0:
            ranked = row.abs().sort_values(ascending=False).index.tolist()
            for c in ranked:
                if c == target:
                    continue
                if c not in sel:
                    sel.append(c)
                if len(sel) >= max_cols:
                    return sel[:max_cols]
        for c in usable:
            if len(sel) >= max_cols:
                break
            if c not in sel:
                sel.append(c)
        return sel[:max_cols]
    return usable[:max_cols]


def build_column_inventory(
    df: pd.DataFrame, num_cols: list[str], cat_cols: list[str]
) -> list[dict[str, Any]]:
    num_set = set(num_cols)
    out: list[dict[str, Any]] = []
    for c in df.columns:
        s = df[c]
        nunique = int(s.nunique(dropna=True))
        missing_pct = round(100.0 * float(s.isna().mean()), 2)
        role = "numeric" if c in num_set else "categorical"
        out.append(
            {
                "name": str(c),
                "dtype": str(s.dtype),
                "role": role,
                "nunique": nunique,
                "missingPct": missing_pct,
            }
        )
    return out


def slug_chart_id(prefix: str, name: str) -> str:
    base = re.sub(r"[^\w\-.]", "_", str(name))
    sid = f"{prefix}-{base}"
    return sid[:160]


def top_pearson_pairs(corr: pd.DataFrame, k: int = 220) -> list[dict[str, Any]]:
    cols = [str(c) for c in corr.columns]
    tuples: list[tuple[float, str, str]] = []
    n = len(cols)
    for i in range(n):
        for j in range(i + 1, n):
            v = corr.iloc[i, j]
            if pd.isna(v):
                continue
            tuples.append((float(v), cols[i], cols[j]))
    tuples.sort(key=lambda t: -abs(t[0]))
    return [{"x": a, "y": b, "r": round(r, 6)} for r, a, b in tuples[:k]]


def categorical_top(df: pd.DataFrame, col: str, top: int = 15) -> list[dict[str, Any]]:
    vc = df[col].astype(str).value_counts().head(top)
    return [{"name": str(i), "value": int(v)} for i, v in vc.items()]


def target_vs_numeric(df: pd.DataFrame, target: str, feat: str, limit: int = 2000):
    """Mercedes 스타일 산점도용 샘플 포인트."""
    sub = df[[target, feat]].apply(pd.to_numeric, errors="coerce").dropna()
    if len(sub) > limit:
        sub = sub.sample(limit, random_state=42)
    pts = [{"x": float(r[feat]), "y": float(r[target])} for _, r in sub.iterrows()]
    return pts


def target_vs_categorical(df: pd.DataFrame, target: str, feat: str):
    """범주별 y 평균 (bar)."""
    g = (
        df[[target, feat]]
        .assign(**{feat: df[feat].astype(str)})
        .groupby(feat, observed=True)[target]
        .mean()
        .dropna()
        .sort_values(ascending=False)
        .head(20)
    )
    return [{"name": str(i), "value": float(v)} for i, v in g.items()]


def binary_zero_one_counts(
    df: pd.DataFrame, cols: list[str], top: int | None = None
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for c in cols:
        s = pd.to_numeric(df[c], errors="coerce").dropna()
        if s.empty:
            continue
        zero = int((s == 0).sum())
        one = int((s == 1).sum())
        if zero + one == 0:
            continue
        rows.append({"name": str(c), "zeroCount": zero, "oneCount": one})
    rows.sort(key=lambda r: -(int(r["zeroCount"]) + int(r["oneCount"])))
    return rows[:top] if top is not None else rows


def target_box_by_categorical(
    df: pd.DataFrame, target: str, feat: str, top: int = 12
) -> list[dict[str, Any]]:
    sub = df[[target, feat]].copy()
    sub[target] = pd.to_numeric(sub[target], errors="coerce")
    sub[feat] = sub[feat].astype(str)
    sub = sub.dropna(subset=[target, feat])
    if sub.empty:
        return []

    top_levels = (
        sub[feat].value_counts(dropna=False).head(top).index.tolist()
    )
    out: list[dict[str, Any]] = []
    for lv in top_levels:
        s = sub.loc[sub[feat] == lv, target]
        q = quartiles(s)
        if q["median"] is None:
            continue
        out.append(
            {
                "feature": str(lv),
                "min": q["min"],
                "q1": q["q1"],
                "median": q["median"],
                "q3": q["q3"],
                "max": q["max"],
            }
        )
    return out


def categorical_target_signal_score(
    df: pd.DataFrame,
    target: str,
    feat: str,
    top_levels: int = 20,
    min_group_rows: int = 12,
) -> float | None:
    """
    범주형 컬럼이 타겟 분산을 얼마나 설명하는지(간이 eta^2 유사 점수) 계산.
    값이 클수록 타겟 차이를 잘 드러냄.
    """
    sub = df[[target, feat]].copy()
    sub[target] = pd.to_numeric(sub[target], errors="coerce")
    sub[feat] = sub[feat].astype(str)
    sub = sub.dropna(subset=[target, feat])
    if len(sub) < 30:
        return None

    top_cats = sub[feat].value_counts(dropna=False).head(top_levels)
    keep = [c for c, n in top_cats.items() if int(n) >= min_group_rows]
    if len(keep) < 2:
        return None

    sub = sub[sub[feat].isin(keep)]
    if len(sub) < 30:
        return None

    overall = float(sub[target].mean())
    total_var = float(sub[target].var())
    if np.isnan(total_var) or total_var <= 1e-12:
        return None

    g = sub.groupby(feat, observed=True)[target].agg(["mean", "count"])
    between = float((((g["mean"] - overall) ** 2) * g["count"]).sum() / g["count"].sum())
    score = between / total_var
    if np.isnan(score) or not np.isfinite(score):
        return None
    return float(score)


def target_jitter_trend_by_categorical(
    df: pd.DataFrame,
    target: str,
    feat: str,
    top_categories: int = 10,
    point_limit: int = 1400,
) -> dict[str, Any] | None:
    """
    stripplot 느낌:
    - 카테고리 축에 x jitter 산점
    - 카테고리별 y 평균을 선으로 연결
    """
    sub = df[[target, feat]].copy()
    sub[target] = pd.to_numeric(sub[target], errors="coerce")
    sub[feat] = sub[feat].astype(str)
    sub = sub.dropna(subset=[target, feat])
    if sub.empty:
        return None

    top_levels = sub[feat].value_counts(dropna=False).head(top_categories).index.tolist()
    if len(top_levels) < 2:
        return None

    sub = sub[sub[feat].isin(top_levels)].copy()
    if sub.empty:
        return None

    level_to_idx = {lv: i for i, lv in enumerate(top_levels)}
    if len(sub) > point_limit:
        sub = sub.sample(point_limit, random_state=42)

    rng = np.random.default_rng(42)
    jit = rng.uniform(-0.28, 0.28, size=len(sub))
    xs = [float(level_to_idx[str(c)]) + float(jit[i]) for i, c in enumerate(sub[feat].tolist())]
    ys = sub[target].to_numpy(dtype=float)
    points = [{"x": float(x), "y": float(y)} for x, y in zip(xs, ys)]

    mean_by_cat = (
        sub.groupby(feat, observed=True)[target]
        .mean()
        .dropna()
    )
    trend = [
        {"x": float(level_to_idx[str(cat)]), "y": float(val)}
        for cat, val in mean_by_cat.items()
        if str(cat) in level_to_idx
    ]
    trend.sort(key=lambda row: row["x"])
    if len(trend) < 2:
        return None

    return {
        "categories": [str(c) for c in top_levels],
        "points": points,
        "trend": trend,
    }


def quantile_target_bins(y: pd.Series, q: int = 5) -> pd.Series | None:
    """
    연속형 타겟을 분위수 구간으로 변환.
    - 중복 경계가 많을 때는 qcut의 duplicates='drop'으로 자동 축소.
    """
    s = pd.to_numeric(y, errors="coerce")
    if s.notna().sum() < 20:
        return None
    try:
        binned = pd.qcut(s, q=min(q, 10), duplicates="drop")
    except Exception:
        return None
    if binned is None:
        return None
    cat = binned.astype(str)
    if int(cat.nunique(dropna=True)) < 2:
        return None
    return cat


def _is_binary_zero_one(series: pd.Series) -> bool:
    s_num = pd.to_numeric(series, errors="coerce")
    valid = s_num.dropna()
    if valid.empty:
        return False
    uniq = set(valid.unique().tolist())
    return uniq.issubset({0.0, 1.0}) and len(uniq) >= 1


def find_low_signal_binary_columns(
    df: pd.DataFrame,
    cat_cols: list[str],
    target: str | None,
    corr_threshold: float = 0.02,
    min_non_na: int = 30,
) -> list[str]:
    """
    0/1 이진 열 중 타겟(수치형)과의 상관(|r|)이 매우 낮은 열을 EDA에서 제외.
    - 원본 데이터는 유지하고, 분석 뷰/시각화 입력만 정제한다.
    """
    if not target or target not in df.columns:
        return []
    t_num = pd.to_numeric(df[target], errors="coerce")
    if t_num.notna().sum() < min_non_na:
        return []

    dropped: list[str] = []
    for c in cat_cols:
        if c == target:
            continue
        s = df[c]
        if not _is_binary_zero_one(s):
            continue
        x = pd.to_numeric(s, errors="coerce")
        pair = pd.DataFrame({"x": x, "y": t_num}).dropna()
        if len(pair) < min_non_na:
            continue
        if pair["x"].nunique(dropna=True) < 2:
            # 사실상 상수열은 정보량이 낮으므로 제외
            dropped.append(c)
            continue
        r = float(pair["x"].corr(pair["y"]))
        if np.isnan(r) or abs(r) <= corr_threshold:
            dropped.append(c)
    return dropped


def pairplot_points(df: pd.DataFrame, cols: list[str], limit: int = 400):
    if len(cols) < 2:
        return []
    sub = df[cols].apply(pd.to_numeric, errors="coerce").dropna()
    if len(sub) > limit:
        sub = sub.sample(limit, random_state=42)
    pairs: list[dict[str, Any]] = []
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            a, b = cols[i], cols[j]
            series_a = sub[a].to_numpy()
            series_b = sub[b].to_numpy()
            pairs.append(
                {
                    "xCol": a,
                    "yCol": b,
                    "points": [
                        {"x": float(series_a[k]), "y": float(series_b[k])}
                        for k in range(len(sub))
                    ],
                }
            )
    return pairs[:6]


def sorted_target_index_line(y: pd.Series, max_points: int = 8000) -> list[dict[str, Any]]:
    """Mercedes 노트북: scatter(range(n), np.sort(y))."""
    s = pd.to_numeric(y, errors="coerce").dropna()
    if s.empty:
        return []
    arr = np.sort(s.to_numpy(dtype=float))
    if len(arr) > max_points:
        idx = np.linspace(0, len(arr) - 1, max_points, dtype=int)
        arr = arr[idx]
    return [{"index": float(i), "value": float(v)} for i, v in enumerate(arr)]


def scatter_with_trend_points(
    df: pd.DataFrame, xcol: str, ycol: str, limit: int = 2500
) -> tuple[list[dict[str, float]], list[dict[str, float]]] | None:
    """Mercedes notebook regplot 스타일: 산점 + 1차 회귀선."""
    sub = df[[xcol, ycol]].apply(pd.to_numeric, errors="coerce").dropna()
    if len(sub) < 3:
        return None
    if len(sub) > limit:
        sub = sub.sample(limit, random_state=42)
    xs = sub[xcol].to_numpy(dtype=float)
    ys = sub[ycol].to_numpy(dtype=float)
    coef = np.polyfit(xs, ys, 1)
    m, b = float(coef[0]), float(coef[1])
    x0, x1 = float(np.min(xs)), float(np.max(xs))
    points = [{"x": float(x), "y": float(y)} for x, y in zip(xs, ys)]
    line = [{"x": x0, "y": m * x0 + b}, {"x": x1, "y": m * x1 + b}]
    return points, line


def read_csv_smart(path: str) -> pd.DataFrame:
    """pandas 엔진이 첫 줄을 보고 구분 문자를 추론(콤마 외 세미콜론·탭·파이프 등). sep=None."""
    encodings = ("utf-8-sig", "utf-8")
    for enc in encodings:
        try:
            return pd.read_csv(path, sep=None, engine="python", encoding=enc)
        except UnicodeDecodeError:
            continue
    return pd.read_csv(path, sep=None, engine="python", encoding="latin-1")


def run_pipeline(csv_path: str, target_hint: str | None) -> dict[str, Any]:
    df = read_csv_smart(csv_path)
    original_rows = len(df)
    sampled = False
    if len(df) > MAX_ROWS:
        df = df.sample(MAX_ROWS, random_state=42).reset_index(drop=True)
        sampled = True

    num_cols_raw, cat_cols_raw = classify_columns(df)
    target = detect_target(df, target_hint)
    identifier_cols = detect_identifier_columns(df, target)
    identifier_set = set(identifier_cols)

    # ID 성격 컬럼은 EDA/시각화에서 제외 (원본/요약 정보는 유지)
    num_cols = [c for c in num_cols_raw if c not in identifier_set]
    cat_cols = [c for c in cat_cols_raw if c not in identifier_set]

    low_signal_binary_cols = find_low_signal_binary_columns(df, cat_cols, target)
    filtered_binary_set = set(low_signal_binary_cols)
    binary_cols_all = [
        c
        for c in df.columns
        if c not in identifier_set and (not target or c != target) and _is_binary_zero_one(df[c])
    ]

    # EDA/시각화용 범주열 목록에서 저신호 이진열 제거
    cat_cols_eda = [c for c in cat_cols if c not in filtered_binary_set]

    df_eda = df.copy()
    eda_cat_cols = list(cat_cols_eda)
    target_bin_col: str | None = None

    # 범주형 피처가 많은 데이터에서 연속형 타겟 해석을 보강하기 위해 분위수 구간화 보조 변수 추가.
    if target and target in df_eda.columns:
        t_num = pd.to_numeric(df_eda[target], errors="coerce")
        if t_num.notna().sum() >= 20:
            binned = quantile_target_bins(t_num, q=5)
            if binned is not None:
                target_bin_col = f"{target}__bin_q"
                df_eda[target_bin_col] = binned
                if target_bin_col not in eda_cat_cols:
                    eda_cat_cols.append(target_bin_col)

    missing_pct = {
        str(c): round(100.0 * df[c].isna().mean(), 2) for c in df.columns
    }
    dtypes = {str(c): str(df[c].dtype) for c in df.columns}

    numeric_describe: dict[str, Any] = {}
    for c in num_cols:
        s = pd.to_numeric(df[c], errors="coerce")
        numeric_describe[c] = _safe_json(s.describe().to_dict())

    categorical_freq: dict[str, list[dict[str, Any]]] = {}
    for c in eda_cat_cols:
        categorical_freq[c] = categorical_top(df_eda, c, top=28)

    column_inventory = build_column_inventory(df, num_cols_raw, cat_cols_raw)

    corr_mat = pd.DataFrame()
    numeric_df = pd.DataFrame()
    if num_cols:
        numeric_df = df[num_cols].apply(pd.to_numeric, errors="coerce")
    if len(num_cols) >= 2:
        corr_mat = numeric_df.corr(numeric_only=True)

    meta_notes: list[str] = [
        (
            "고유값이 19개 이하면 수치여도 저유사로 보고 '범주형' 목록으로 분류할 수 있습니다. "
            "(고유값 20 미만 규칙)"
        ),
        (
            "상관 히트맵에는 열이 많으면 타겟과 높은 |표본 상관| 열 우선 포함(최대 52열)합니다."
            if len(num_cols) > 52
            else ""
        ),
        (
            f"연속형 타겟 `{target}`을 분위수 구간 `{target_bin_col}`로 보조 생성해 범주형 EDA에 포함했습니다."
            if target_bin_col
            else ""
        ),
        (
            "0/1 이진 컬럼 중 타겟과 |상관|이 매우 낮은 컬럼을 EDA/시각화에서 제외했습니다: "
            f"{len(low_signal_binary_cols)}개"
            if low_signal_binary_cols
            else ""
        ),
        (
            f"ID 성격 컬럼은 분석에서 제외했습니다: {len(identifier_cols)}개"
            if identifier_cols
            else ""
        ),
    ]
    meta_notes = [m for m in meta_notes if m]

    heat_labels = select_heatmap_columns(num_cols, corr_mat, target, max_cols=52)
    heat_labels = [c for c in heat_labels if c in df.columns]
    heat = correlation_heatmap_from_df(df, heat_labels)

    corr_sub = pd.DataFrame()
    correlation_preview_compact: dict[str, Any]
    top_pairs_out: list[dict[str, Any]]
    if len(heat_labels) >= 2 and not corr_mat.empty:
        corr_sub = corr_mat.reindex(index=heat_labels, columns=heat_labels)
        corr_sub = corr_sub.replace(np.nan, 0)
        correlation_preview_compact = corr_sub.round(6).replace(np.nan, 0).to_dict()
        correlation_preview_compact = _safe_json(correlation_preview_compact)
        top_pairs_out = top_pearson_pairs(corr_sub.astype(float))
    else:
        correlation_preview_compact = {}
        top_pairs_out = []

    charts: list[dict[str, Any]] = []

    # REF: 정렬 타겟 곡선 (분포는 전 수치열 히스토그램 블록에 포함됨)
    if target and target in df.columns:
        t_ser = df[target]
        t_num = pd.to_numeric(t_ser, errors="coerce")
        if t_num.notna().sum() >= 2:
            sorted_line = sorted_target_index_line(t_ser)
            if sorted_line:
                charts.append(
                    {
                        "id": "nb-sorted-target",
                        "title": f"sorted {target} vs index (REF notebook)",
                        "type": "linechart",
                        "data": sorted_line,
                    }
                )

    # 모든 수치형 히스토그램
    for col in num_cols:
        hist_data = build_histogram_series(df[col])
        if hist_data:
            charts.append(
                {
                    "id": slug_chart_id("hist", col),
                    "title": f"Histogram: {col}",
                    "type": "histogram",
                    "data": hist_data,
                }
            )

    # 수치형 박스플롯 — 배치
    BOX_BATCH = 42
    for bi in range(0, len(num_cols), BOX_BATCH):
        batch = num_cols[bi : bi + BOX_BATCH]
        box_data = [{"feature": c, **quartiles(df[c])} for c in batch]
        box_data_ok = [
            b
            for b in box_data
            if b.get("median") is not None or b.get("q1") is not None
        ]
        if box_data_ok:
            charts.append(
                {
                    "id": f"box-batch-{bi//BOX_BATCH}",
                    "title": f"Boxplot (수치형 {bi+1}–{bi+len(batch)} / {len(num_cols)})",
                    "type": "boxplot",
                    "data": box_data_ok,
                }
            )

    # 각 범주형 빈도 막대
    for col in eda_cat_cols:
        charts.append(
            {
                "id": slug_chart_id("bar_freq", col),
                "title": f"Bar chart: {col}",
                "type": "bar",
                "data": categorical_top(df_eda, col, top=28),
            }
        )

    # REF: 0/1 변수 zero/one 구성비 누적 막대
    binary_count_rows = binary_zero_one_counts(df, binary_cols_all, top=None)
    if binary_count_rows:
        charts.append(
            {
                "id": "binary-zero-one-stacked",
                "title": "Binary columns: zero/one counts (REF notebook)",
                "type": "stackedBar",
                "data": binary_count_rows,
            }
        )

    # 상관 히트맵
    if heat["labels"]:
        charts.append(
            {
                "id": "corr-heat",
                "title": f"Correlation heatmap (표시 열 수 {len(heat_labels)})",
                "type": "heatmap",
                "data": heat,
            }
        )

    # 타겟 회귀 추세 산점도(|상관| 큰 순, 상한)
    feats_ranked: list[str] = []
    TOP_SCATTER_TREND = 32
    if target and target in num_cols:
        feats_others = [c for c in num_cols if c != target]
        if feats_others and target in corr_mat.index:
            coo = corr_mat[target].dropna().reindex(feats_others).dropna()
            feats_ranked = coo.abs().sort_values(ascending=False).index.tolist()
        else:
            feats_ranked = feats_others
        for feat in feats_ranked[:TOP_SCATTER_TREND]:
            tr = scatter_with_trend_points(df, feat, target)
            if not tr:
                continue
            pts, line = tr
            charts.append(
                {
                    "id": slug_chart_id("reg", feat),
                    "title": f"{feat} vs {target} (regplot 추세)",
                    "type": "scatterTrend",
                    "data": {"points": pts, "line": line},
                }
            )

    # 타겟 × 범주 평균 — 모든 범주형 열에 대해
    if target and target in df.columns:
        t_num = pd.to_numeric(df[target], errors="coerce")
        if not t_num.isna().all():
            for col in cat_cols:
                if col == target:
                    continue
                charts.append(
                    {
                        "id": slug_chart_id("target_mean_bar", col),
                        "title": f"Mean({target}) by {col}",
                        "type": "bar",
                        "data": target_vs_categorical(
                            df.assign(**{target: t_num}), target, col
                        ),
                    }
                )

            # REF: 범주형별 타겟 분포(박스 통계) — 표본 수 많은 상위 범주형 열 중심
            cat_signal_scored: list[tuple[float, str]] = []
            for col in [c for c in cat_cols if c != target and c in df.columns]:
                sc = categorical_target_signal_score(df, target, col, top_levels=20, min_group_rows=12)
                if sc is not None:
                    cat_signal_scored.append((sc, col))
            cat_signal_scored.sort(key=lambda t: -t[0])
            cat_ranked = [c for _, c in cat_signal_scored]
            if not cat_ranked:
                cat_ranked = sorted(
                    [c for c in cat_cols if c != target and c in df.columns],
                    key=lambda c: int(df[c].astype(str).nunique(dropna=True)),
                )

            for col in cat_ranked[:6]:
                box_rows = target_box_by_categorical(df, target, col, top=12)
                if not box_rows:
                    continue
                charts.append(
                    {
                        "id": slug_chart_id("target_box_by_cat", col),
                        "title": f"Target({target}) box by {col} (top categories)",
                        "type": "boxplot",
                        "data": box_rows,
                    }
                )

            # REF stripplot 느낌: 카테고리별 점 분포 + 평균 추세선
            for col in cat_ranked[:4]:
                jit = target_jitter_trend_by_categorical(df, target, col, top_categories=10, point_limit=1400)
                if not jit:
                    continue
                charts.append(
                    {
                        "id": slug_chart_id("target_strip_like", col),
                        "title": f"Target({target}) jitter by {col} (strip-like)",
                        "type": "catJitterTrend",
                        "data": jit,
                    }
                )

    # Pairplot: 열 많을 때는 타겟과 상관 큰 변수 쪽으로 근사
    pair_cols_sel: list[str] = []
    if len(num_cols) >= 2:
        if len(num_cols) <= 6:
            pair_cols_sel = num_cols[:6]
        elif target and target in num_cols and target in corr_mat.index:
            clist = [c for c in num_cols if c != target]
            co = corr_mat[target].dropna().reindex(clist)
            ranked = co.abs().sort_values(ascending=False).dropna().index.tolist()
            pair_cols_sel = ranked[:6] if ranked else num_cols[:6]
        else:
            pair_cols_sel = num_cols[:6]
        if len(pair_cols_sel) >= 2:
            pairs_pp = pairplot_points(df, pair_cols_sel[:6])
            if pairs_pp:
                charts.append(
                    {
                        "id": "pair-multi",
                        "title": "Pairplot (표시 수치 열 선택)",
                        "type": "pairplot",
                        "data": pairs_pp,
                    }
                )

    # 타겟 없을 때: 첫 두 수치형 산점도 샘플
    if not target and len(num_cols) >= 2:
        a, b = num_cols[0], num_cols[1]
        sub_sc = df[[a, b]].apply(pd.to_numeric, errors="coerce").dropna()
        if len(sub_sc) > 2000:
            sub_sc = sub_sc.sample(2000, random_state=42)
        charts.append(
            {
                "id": "scatter-two",
                "title": f"Scatter: {a} vs {b}",
                "type": "scatter",
                "data": [
                    {"x": float(r[a]), "y": float(r[b])} for _, r in sub_sc.iterrows()
                ],
            }
        )

    result = {
        "profile": {
            "rows": int(len(df)),
            "columns": int(df.shape[1]),
            "originalRows": int(original_rows),
            "sampled": sampled,
            "missingPct": missing_pct,
            "dtypes": dtypes,
            "numericColumns": num_cols,
            "categoricalColumns": cat_cols,
            "targetColumn": target,
        },
        "columnInventory": _safe_json(column_inventory),
        "describeNumeric": numeric_describe,
        "categoricalFrequency": categorical_freq,
        "correlationPreview": correlation_preview_compact,
        "topPearsonPairs": _safe_json(top_pairs_out),
        "charts": charts,
        "meta": {
            "pipeline": "python/pipeline.py",
            "style": "pandas + seaborn (Mercedes exploration pattern)",
            "heatmapColumns": len(heat_labels),
            "chartCount": len(charts),
            "removedLowSignalBinary": low_signal_binary_cols,
            "removedIdentifierColumns": identifier_cols,
            "notes": meta_notes,
            "targetSignalCategoricals": cat_ranked[:8] if target else [],
        },
    }
    return result


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("csv_path")
    p.add_argument("output_json")
    p.add_argument("--target", default=None)
    args = p.parse_args()
    try:
        out = run_pipeline(args.csv_path, args.target)
        with open(args.output_json, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
