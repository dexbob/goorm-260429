"""
분석 결과를 Mercedes 탐색 노트북 스타일의 .ipynb로 내보냅니다.
"""
from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path

import nbformat
from nbformat.v4 import new_code_cell, new_markdown_cell, new_notebook


def build_nb(csv_basename: str, analysis: dict) -> nbformat.NotebookNode:
    profile = analysis.get("profile", {})
    rows = profile.get("rows", 0)
    cols = profile.get("columns", 0)
    analysis_b64 = base64.standard_b64encode(
        json.dumps(analysis, ensure_ascii=False).encode("utf-8")
    ).decode("ascii")

    md_intro = f"""# 자동 데이터 분석 리포트

**파일:** `{csv_basename}`  

이 노트북은 **데이터 분석 자동화 AI 에이전트**가 생성했습니다 (Mercedes-Benz EDA 노트북 스타일 참조).

**요약:** {rows:,} rows × {cols:,} columns  
"""

    cells = [
        new_markdown_cell(md_intro),
        new_markdown_cell("## 1. 라이브러리, 분석 결과(JSON), 데이터 로드"),
        new_code_cell(
            f"""import base64
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

%matplotlib inline
pd.options.display.max_columns = 999
color = sns.color_palette()
sns.set_theme(style="whitegrid", palette="deep")

_analysis_b64 = "{analysis_b64}"
analysis = json.loads(base64.standard_b64decode(_analysis_b64).decode("utf-8"))
PROFILE = analysis["profile"]

DATA_PATH = "YOUR_CSV_PATH_HERE.csv"
df = pd.read_csv(DATA_PATH, encoding="utf-8")
print("shape:", df.shape)
df.head()"""
        ),
        new_markdown_cell("## 2. 데이터 개요"),
        new_code_cell(
            """print("rows", PROFILE.get("rows"), "cols", PROFILE.get("columns"))
print("numeric:", PROFILE.get("numericColumns"))
print("categorical:", PROFILE.get("categoricalColumns"))
print("target:", PROFILE.get("targetColumn"))"""
        ),
        new_markdown_cell("## 3. 결측치 비율 (상위 20)"),
        new_code_cell(
            """missing = PROFILE.get("missingPct", {})
pd.Series(missing).sort_values(ascending=False).head(20)"""
        ),
        new_markdown_cell("## 4. 수치형 기술통계"),
        new_code_cell(
            """desc = analysis.get("describeNumeric", {})
for col, d in list(desc.items())[:12]:
    print("---", col)
    print(pd.Series(d))"""
        ),
        new_markdown_cell("## 5. 시각화 (Mercedes 노트북 패턴)"),
        new_code_cell(
            """num_cols = PROFILE.get("numericColumns") or []
cat_cols = PROFILE.get("categoricalColumns") or []
target = PROFILE.get("targetColumn")

if num_cols:
    c0 = num_cols[0]
    plt.figure(figsize=(10, 5))
    sns.histplot(pd.to_numeric(df[c0], errors="coerce").dropna(), bins=40, kde=True)
    plt.title(f"Distribution of {{c0}}")
    plt.xlabel(c0)
    plt.show()"""
        ),
        new_code_cell(
            """if len(num_cols) >= 2:
    nc = num_cols[: min(15, len(num_cols))]
    sub = df[nc].apply(pd.to_numeric, errors="coerce")
    corr = sub.corr()
    plt.figure(figsize=(10, 8))
    sns.heatmap(corr, cmap="vlag", center=0)
    plt.title("Correlation heatmap")
    plt.show()"""
        ),
        new_code_cell(
            """if target and target in df.columns and num_cols:
    feat = [c for c in num_cols if c != target][:1]
    if feat:
        f = feat[0]
        plt.figure(figsize=(10, 5))
        sns.regplot(x=f, y=target, data=df, scatter_kws={{'alpha': 0.4, 's': 20}})
        plt.title(f"{{target}} vs {{f}}")
        plt.show()"""
        ),
        new_markdown_cell("## 6. 차트 메타데이터 (대시보드 연동)"),
        new_code_cell("""import pprint
pprint.pp(analysis.get("charts", [])[:3])  # 일부만 출력
print("total charts:", len(analysis.get("charts", [])))"""),
    ]

    nb = new_notebook(
        cells=cells,
        metadata={
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3",
            }
        },
    )
    return nb


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("analysis_json", type=Path)
    ap.add_argument("out_ipynb", type=Path)
    ap.add_argument("--csv-name", default="data.csv")
    args = ap.parse_args()
    analysis = json.loads(args.analysis_json.read_text(encoding="utf-8"))
    nb = build_nb(args.csv_name, analysis)
    args.out_ipynb.write_text(nbformat.writes(nb), encoding="utf-8")


if __name__ == "__main__":
    main()
