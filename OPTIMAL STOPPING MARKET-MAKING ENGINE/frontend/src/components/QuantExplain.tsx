import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

interface QuantExplainProps {
  title: string;
  formula: string;
  whatIsIt: string;
  whyItMatters: string;
  theory: string;
  assumptions: string;
  paramEffect: string;
}

export const QuantExplain: React.FC<QuantExplainProps> = ({
  title,
  formula,
  whatIsIt,
  whyItMatters,
  theory,
  assumptions,
  paramEffect
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3 border border-pink-500/20 rounded-md bg-[#0b0f19]/80 overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 font-semibold transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-pink-400" />
          <span>QUANT EXPLAIN: {title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="p-3.5 space-y-2.5 text-slate-300 border-t border-pink-500/20">
          <div className="p-2 bg-black/40 rounded border border-pink-500/30 font-mono text-center text-pink-400 text-sm">
            {formula}
          </div>
          <div>
            <span className="text-pink-400 font-bold">What is happening: </span>
            {whatIsIt}
          </div>
          <div>
            <span className="text-purple-400 font-bold">Why it matters financially: </span>
            {whyItMatters}
          </div>
          <div>
            <span className="text-blue-400 font-bold">Underlying Theory: </span>
            {theory}
          </div>
          <div>
            <span className="text-amber-400 font-bold">Assumptions: </span>
            {assumptions}
          </div>
          <div>
            <span className="text-emerald-400 font-bold">Parameter Dynamics & Decision Impact: </span>
            {paramEffect}
          </div>
        </div>
      )}
    </div>
  );
};
