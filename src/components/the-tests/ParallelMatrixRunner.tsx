import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Terminal, 
  Cpu, 
  Check
} from 'lucide-react';
import { FEATURED_TEST_SUITES } from './testSuiteData';

interface WorkerState {
  id: string;
  workerNum: number;
  title: string;
  specFile: string;
  status: 'idle' | 'running' | 'passed';
  currentStepIndex: number;
  elapsedMs: number;
}

export const ParallelMatrixRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [allPassed, setAllPassed] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);

  const [workers, setWorkers] = useState<WorkerState[]>(
    FEATURED_TEST_SUITES.map((suite, idx) => ({
      id: suite.id,
      workerNum: idx + 1,
      title: suite.title,
      specFile: suite.specFile.split('/').pop() || suite.specFile,
      status: 'idle',
      currentStepIndex: -1,
      elapsedMs: 0,
    }))
  );

  // Parallel simulation ticker
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      const startTime = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        setTotalElapsed(elapsed);

        setWorkers((prev) => {
          const updated = prev.map((w) => {
            const suite = FEATURED_TEST_SUITES.find((s) => s.id === w.id);
            if (!suite) return w;

            const totalSteps = suite.steps.length;
            const stepDuration = (suite.durationMs * 2.2) / totalSteps;
            const computedStepIndex = Math.min(
              totalSteps - 1,
              Math.floor(elapsed / stepDuration)
            );

            const isDone = elapsed >= suite.durationMs * 2.4;

            return {
              ...w,
              currentStepIndex: isDone ? totalSteps - 1 : computedStepIndex,
              status: isDone ? 'passed' : 'running',
              elapsedMs: isDone ? suite.durationMs : Math.round(elapsed / 2.2),
            };
          });

          if (updated.every((w) => w.status === 'passed')) {
            setIsRunning(false);
            setAllPassed(true);
          }

          return updated;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStartParallelRun = () => {
    setAllPassed(false);
    setTotalElapsed(0);
    setWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        status: 'running',
        currentStepIndex: 0,
        elapsedMs: 0,
      }))
    );
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setAllPassed(false);
    setTotalElapsed(0);
    setWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        status: 'idle',
        currentStepIndex: -1,
        elapsedMs: 0,
      }))
    );
  };

  return (
    <div
      id="parallel-matrix-runner"
      className="w-full bg-[#0F141E] border border-slate-800 rounded-2xl p-5 sm:p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Parallel Suite Execution
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Run all test suites concurrently across 4 isolated workers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          {isRunning ? (
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-blue-300 text-xs font-mono">
              <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
              <span>Running ({Math.round(totalElapsed / 2.2)}ms)...</span>
            </div>
          ) : allPassed ? (
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>12/12 Passed (512ms)</span>
              </span>
              <button
                onClick={handleStartParallelRun}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Run Again</span>
              </button>
            </div>
          ) : (
            <button
              id="run-all-tests-btn"
              data-testid="trigger-matrix-run-btn"
              onClick={handleStartParallelRun}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Run All Suites (4x Parallel)</span>
            </button>
          )}

          {(isRunning || allPassed) && (
            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-mono transition-colors border border-slate-800"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4-Quadrant Worker Grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {workers.map((w) => {
          const suite = FEATURED_TEST_SUITES.find((s) => s.id === w.id);
          const currentStep = suite && w.currentStepIndex >= 0 ? suite.steps[w.currentStepIndex] : null;

          return (
            <div
              key={w.id}
              className="bg-[#080B10] border border-slate-800/90 rounded-xl p-3.5 font-mono text-xs flex flex-col justify-between"
            >
              {/* Worker Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px]">
                <div className="flex items-center space-x-2 truncate">
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                    W{w.workerNum}
                  </span>
                  <span className="text-white font-semibold truncate">
                    {w.specFile}
                  </span>
                </div>

                <div className="text-[10px] shrink-0 ml-2">
                  {w.status === 'running' && (
                    <span className="text-blue-400 font-semibold">{w.elapsedMs}ms</span>
                  )}
                  {w.status === 'passed' && (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" />
                      <span>{w.elapsedMs}ms</span>
                    </span>
                  )}
                  {w.status === 'idle' && (
                    <span className="text-slate-600">IDLE</span>
                  )}
                </div>
              </div>

              {/* Feed Content */}
              <div className="py-2.5 h-16 flex flex-col justify-center text-[11px] select-none">
                {w.status === 'idle' && (
                  <div className="text-slate-600 text-center text-[11px]">
                    Worker idle
                  </div>
                )}

                {w.status === 'running' && currentStep && (
                  <div className="text-[11px] space-y-1">
                    <div className="text-blue-300 font-medium truncate flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span>{currentStep.name}</span>
                    </div>
                    <div className="text-slate-500 text-[10px] truncate">
                      › {currentStep.action}
                    </div>
                  </div>
                )}

                {w.status === 'passed' && (
                  <div className="text-emerald-400 text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Completed (100% assertions green)</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
