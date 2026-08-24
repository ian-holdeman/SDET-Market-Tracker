import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Code2, 
  FileCode, 
  Check, 
  Copy, 
  ChevronDown, 
  ChevronUp,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FeaturedTestSuite } from './testSuiteData';

interface TestCardProps {
  suite: FeaturedTestSuite;
}

export const TestCard: React.FC<TestCardProps> = ({ suite }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const terminalLogsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal log during execution
  useEffect(() => {
    if (terminalLogsRef.current) {
      terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight;
    }
  }, [currentStepIndex, isCompleted]);

  // Step-by-step runner execution loop
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isPlaying) {
      if (currentStepIndex < suite.steps.length - 1) {
        const nextIndex = currentStepIndex + 1;
        const currentStep = suite.steps[nextIndex];
        timeout = setTimeout(() => {
          setCurrentStepIndex(nextIndex);
        }, currentStep ? Math.max(300, currentStep.durationMs * 2.2) : 400);
      } else {
        timeout = setTimeout(() => {
          setIsPlaying(false);
          setIsCompleted(true);
        }, 400);
      }
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, currentStepIndex, suite.steps]);

  const handleStartPlay = () => {
    setIsCompleted(false);
    setCurrentStepIndex(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setIsCompleted(false);
    setCurrentStepIndex(-1);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(suite.codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPercent = isCompleted 
    ? 100 
    : currentStepIndex >= 0 
      ? Math.round(((currentStepIndex + 1) / suite.steps.length) * 100) 
      : 0;

  return (
    <div
      id={`test-card-${suite.id}`}
      data-testid="test-suite-card"
      className="bg-[#0F141E] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-900 text-slate-300 border border-slate-800">
                {suite.specFile.split('/').pop()}
              </span>
              {suite.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-800"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="text-base font-bold text-white">
              {suite.title}
            </h3>
          </div>

          <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 shrink-0">
            100% PASS
          </span>
        </div>

        {/* Test Execution Screen / Video Container */}
        <div className="relative mt-2 w-full bg-[#080B10] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          {/* Top Bar of the execution frame */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
            <span className="font-mono text-[11px] text-slate-400">
              playwright test {suite.specFile.split('/').pop()}
            </span>
            <div className="flex items-center space-x-2 font-mono text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{suite.durationMs}ms</span>
              </span>
              <span>•</span>
              <span>{suite.testCount} tests / {suite.assertionCount} assertions</span>
            </div>
          </div>

          {/* Interactive Player Body */}
          <div className="relative h-44 w-full p-3.5 flex flex-col justify-between font-mono text-xs overflow-hidden">
            {/* Idle State */}
            {!isPlaying && !isCompleted && currentStepIndex === -1 && (
              <div className="absolute inset-0 bg-[#080B10] flex flex-col items-center justify-center p-4 text-center z-10">
                <button
                  id={`play-btn-${suite.id}`}
                  onClick={handleStartPlay}
                  className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-all hover:scale-105 active:scale-95 mb-2 shadow-md shadow-emerald-950"
                  title="Run Test"
                >
                  <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                </button>
                <div className="text-xs font-medium text-slate-200">
                  Run Test Suite
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Click to simulate live Playwright execution
                </div>
              </div>
            )}

            {/* Active Terminal Feed */}
            <div 
              ref={terminalLogsRef}
              className="w-full flex-1 overflow-y-auto space-y-1.5 scrollbar-thin pr-1 select-none"
            >
              {suite.steps.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx && isPlaying;
                
                if (currentStepIndex < idx) return null;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-2 rounded text-[11px] font-mono border ${
                      isCurrent
                        ? 'bg-slate-900 border-blue-500/40 text-blue-200'
                        : isPassed
                        ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                        : 'bg-slate-900/30 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <div className="flex items-center space-x-1.5">
                        {isPassed && !isCurrent ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
                        )}
                        <span>{step.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{step.durationMs}ms</span>
                    </div>

                    <div className="mt-1 text-[10px] text-slate-400 pl-5 space-y-0.5">
                      <div className="text-slate-300">› {step.action}</div>
                      <div className="text-emerald-400">✔ {step.assertion}</div>
                    </div>
                  </motion.div>
                );
              })}

              {isCompleted && (
                <div className="p-2 rounded bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs font-mono flex items-center justify-between mt-1.5">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>All {suite.testCount} tests passed ({suite.durationMs}ms)</span>
                  </div>
                  <button
                    onClick={handleStartPlay}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Re-run</span>
                  </button>
                </div>
              )}
            </div>

            {/* Progress & Reset */}
            {(isPlaying || isCompleted) && (
              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between gap-3 text-[10px]">
                <div className="flex-1 flex items-center space-x-2">
                  <div className="flex-1 bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-200"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-slate-400 font-mono">{progressPercent}%</span>
                </div>

                <button
                  onClick={handleReset}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Concise Description */}
        <p className="mt-3 text-xs text-slate-300 leading-relaxed">
          {suite.description}
        </p>
      </div>

      {/* Expandable Spec Code Drawer */}
      <div className="mt-4 pt-3 border-t border-slate-800">
        <button
          onClick={() => setIsCodeOpen(!isCodeOpen)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800/80 text-xs text-slate-300 transition-colors border border-slate-800"
        >
          <div className="flex items-center space-x-2">
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>View Spec Code</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-400">
            <span className="text-[10px] font-mono">TypeScript</span>
            {isCodeOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        <AnimatePresence>
          {isCodeOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className="bg-[#080B10] border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-500">
                  <span>{suite.specFile}</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-[11px] leading-relaxed font-mono text-slate-300 overflow-x-auto">
                  <code>{suite.codeSnippet}</code>
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
