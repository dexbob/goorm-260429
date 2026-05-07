import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PipelineProgress, type StepId } from "@/components/common/PipelineProgress";
import { ApiConnectionBanner } from "@/components/common/ApiConnectionBanner";
import { ConnectionErrorAlert } from "@/components/common/ConnectionErrorAlert";
import { InlineAlert } from "@/components/common/InlineAlert";
import { OperationProgressBar } from "@/components/common/OperationProgressBar";
import { ChunkVisualization } from "@/components/chunk/ChunkVisualization";
import { EmbeddingVisualization } from "@/components/embedding/EmbeddingVisualization";
import { RetrievalPanel } from "@/components/retrieval/RetrievalPanel";
import { DocumentInput } from "@/components/upload/DocumentInput";
import { useAnswerMutation } from "@/hooks/useAnswer";
import { useChunkDocumentMutation } from "@/hooks/useChunking";
import { useEmbedMutation } from "@/hooks/useEmbedding";
import { useSearchMutation } from "@/hooks/useRetrieval";
import { useMutationProgress } from "@/hooks/useMutationProgress";
import { hasEmbeddingForAllChunks } from "@/services/vectorStore";
import { useRagStore } from "@/store/ragStore";
import { isConnectionErrorMessage } from "@/utils/connectionError";

export default function Home() {
  const {
    documentText,
    chunks,
    chunkMeta,
    embeddings,
    embedModel,
    query,
    results,
    distribution,
    queryVectorPreview,
    answerText,
    answerModel,
    answerChunks,
    lastError,
    setDocumentText,
    setQuery,
    setChunks,
    setEmbeddings,
    setResults,
    setAnswer,
    setPipelineStep,
    setError,
    resetPipeline,
  } = useRagStore();

  const chunkMut = useChunkDocumentMutation();
  const embedMut = useEmbedMutation();
  const searchMut = useSearchMutation();
  const answerMut = useAnswerMutation();
  const runSearch = searchMut.mutate;
  const runAnswer = answerMut.mutate;
  const [activeStep, setActiveStep] = useState<StepId>("step1");
  const searchInFlightRef = useRef(false);
  const pendingTopScrollRef = useRef(false);

  const scrollPageTop = () => {
    const root = document.getElementById("root");
    const scrollingElement = document.scrollingElement as HTMLElement | null;
    const targets = new Set<HTMLElement>();
    if (scrollingElement) targets.add(scrollingElement);
    if (document.documentElement) targets.add(document.documentElement);
    if (document.body) targets.add(document.body);

    let parent = root?.parentElement ?? null;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const isScrollable = /(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflow}`);
      if (isScrollable && parent.scrollHeight > parent.clientHeight) {
        targets.add(parent);
        break;
      }
      parent = parent.parentElement;
    }

    targets.forEach((el) => el.scrollTo({ top: 0, behavior: "auto" }));
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const moveToStepTop = (step: StepId) => {
    pendingTopScrollRef.current = true;
    setActiveStep(step);
  };

  useLayoutEffect(() => {
    if (!pendingTopScrollRef.current) return;
    pendingTopScrollRef.current = false;
    scrollPageTop();
  }, [activeStep]);

  const handleChunk = () => {
    setError(null);
    setPipelineStep("chunking");
    chunkMut.mutate(documentText, {
      onSuccess: (data) => {
        setChunks(data.chunks, data.meta);
        setPipelineStep("ready");
        setActiveStep("step2");
      },
      onError: (e) => {
        setError(e instanceof Error ? e.message : "청킹에 실패했습니다.");
        setPipelineStep("idle");
      },
    });
  };

  const handleEmbed = () => {
    setError(null);
    setPipelineStep("embedding");
    embedMut.mutate(chunks, {
      onSuccess: (data) => {
        setEmbeddings(data.embeddings, data.model);
        setPipelineStep("ready");
        moveToStepTop("step3");
      },
      onError: (e) => {
        setError(e instanceof Error ? e.message : "임베딩에 실패했습니다.");
        setPipelineStep("ready");
      },
    });
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([], [], null);
      setAnswer(null);
    }
  }, [query, setResults, setAnswer]);

  const handleSearch = () => {
    if (searchInFlightRef.current || searchMut.isPending || answerMut.isPending) return;

    const q = query.trim();
    if (!q) {
      setResults([], [], null);
      setAnswer(null);
      return;
    }
    if (chunks.length === 0 || embeddings.length === 0 || !hasEmbeddingForAllChunks(chunks, embeddings)) {
      setError("먼저 문서 처리와 임베딩을 완료하세요.");
      return;
    }
    setPipelineStep("searching");
    setError(null);
    setAnswer(null);
    searchInFlightRef.current = true;
    runSearch(
      { query: q, chunks, embeddings },
      {
        onSuccess: (data) => {
          setResults(data.results, data.distribution, data.queryVectorPreview);
          setPipelineStep("ready");
          setActiveStep("step4");
          if (data.results.length > 0) {
            runAnswer(
              { query: q, results: data.results },
              {
                onSuccess: (ans) => {
                  setAnswer({ text: ans.answer, model: ans.model, chunks: ans.usedChunks });
                },
                onError: (e) => {
                  setError(e instanceof Error ? e.message : "LLM 합성 답변 생성에 실패했습니다.");
                  setAnswer(null);
                },
              },
            );
          } else {
            setAnswer(null);
          }
        },
        onError: (e) => {
          setError(e instanceof Error ? e.message : "검색에 실패했습니다.");
          setPipelineStep("ready");
          searchInFlightRef.current = false;
        },
        onSettled: () => {
          searchInFlightRef.current = false;
        },
      },
    );
  };

  const chunkOverlap = chunkMeta?.chunkOverlap ?? 50;
  const topChunkId = results[0]?.chunkId ?? null;
  const busyChunk = chunkMut.isPending;
  const busyEmbed = embedMut.isPending;
  const busySearch = searchMut.isPending;
  const pChunk = useMutationProgress(busyChunk, chunkMut.isError);
  const pEmbed = useMutationProgress(busyEmbed, embedMut.isError);
  const pSearch = useMutationProgress(busySearch, searchMut.isError);
  const pAnswer = useMutationProgress(answerMut.isPending, answerMut.isError);

  const busyLabel = answerMut.isPending
    ? "답변 생성 (LLM)"
    : busySearch
      ? "유사도 검색"
      : busyEmbed
        ? "임베딩 벡터 생성"
        : busyChunk
          ? "문서 청킹"
          : null;

  const progressValue = answerMut.isPending
    ? pAnswer
    : busySearch
      ? pSearch
      : busyEmbed
        ? pEmbed
        : busyChunk
          ? pChunk
          : 0;

  const hasDocument = documentText.trim().length > 0;
  const hasChunks = chunks.length > 0;
  const hasEmbeddings = embeddings.length > 0;
  const hasSearch = results.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-[hsl(222_28%_9%)]">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary/90">MVP · Learning Lab</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">RAG Pipeline Visualizer</h1>
          </div>
          <PipelineProgress
            hasDocument={hasDocument}
            hasChunks={hasChunks}
            hasEmbeddings={hasEmbeddings}
            hasSearch={hasSearch}
            activeStep={activeStep}
            onStepChange={setActiveStep}
          />
        </div>
      </header>

      <ApiConnectionBanner />
      <OperationProgressBar label={busyLabel} value={progressValue} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section className="space-y-4">
          {activeStep === "step1" ? (
            <DocumentInput
              value={documentText}
              onChange={(v) => {
                setDocumentText(v);
                resetPipeline();
                setActiveStep("step1");
              }}
              onSubmit={handleChunk}
              busy={busyChunk}
            />
          ) : null}

          {activeStep === "step2" ? (
            <ChunkVisualization
              chunks={chunks}
              chunkOverlap={chunkOverlap}
              onEmbed={handleEmbed}
              embedDisabled={chunks.length === 0 || busyChunk}
              embedBusy={busyEmbed}
            />
          ) : null}

          {activeStep === "step3" ? (
            <EmbeddingVisualization
              chunks={chunks}
              embeddings={embeddings}
              model={embedModel}
              onNextStep={() => moveToStepTop("step4")}
            />
          ) : null}

          {activeStep === "step4" ? (
            <RetrievalPanel
              query={query}
              onQueryChange={setQuery}
              onSearch={handleSearch}
              searchDisabled={!query.trim() || chunks.length === 0 || embeddings.length === 0 || busySearch}
              results={results}
              distribution={distribution}
              topChunkId={topChunkId}
              queryVectorPreview={queryVectorPreview}
              searchBusy={busySearch}
              answerBusy={answerMut.isPending}
              answerText={answerText}
              answerModel={answerModel}
              answerChunks={answerChunks}
              emptyHint={
                !query.trim()
                  ? "질문을 입력해 보세요."
                  : chunks.length === 0 || embeddings.length === 0
                    ? "먼저 문서 처리와 임베딩을 완료하세요."
                    : null
              }
            />
          ) : null}
          {lastError ? (
            isConnectionErrorMessage(lastError) ? (
              <ConnectionErrorAlert message={lastError} />
            ) : (
              <InlineAlert message={lastError} />
            )
          ) : null}
        </section>
      </main>
    </div>
  );
}
