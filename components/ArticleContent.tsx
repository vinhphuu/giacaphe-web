"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface Props { content: string; }

const components: Components = {
  h1: ({children}) => <h1 className="text-2xl font-bold text-white mt-10 mb-4 leading-tight">{children}</h1>,
  h2: ({children}) => <h2 className="text-xl font-bold text-white mt-10 mb-4 pb-2 border-b border-slate-700">{children}</h2>,
  h3: ({children}) => <h3 className="text-lg font-semibold text-amber-400 mt-8 mb-3">{children}</h3>,
  h4: ({children}) => <h4 className="text-base font-semibold text-slate-200 mt-6 mb-2">{children}</h4>,
  p:  ({children}) => <p className="text-slate-300 leading-relaxed mb-5 text-[15px]">{children}</p>,
  strong: ({children}) => <strong className="font-bold text-white">{children}</strong>,
  em: ({children}) => <em className="italic text-amber-300">{children}</em>,
  table: ({children}) => <div className="overflow-x-auto my-6 rounded-xl border border-slate-700"><table className="w-full text-sm">{children}</table></div>,
  thead: ({children}) => <thead className="bg-slate-800 text-slate-300 text-xs uppercase tracking-wider">{children}</thead>,
  tbody: ({children}) => <tbody className="divide-y divide-slate-700/60">{children}</tbody>,
  tr: ({children}) => <tr className="hover:bg-slate-800/40 transition-colors">{children}</tr>,
  th: ({children}) => <th className="px-4 py-3 text-left font-semibold">{children}</th>,
  td: ({children}) => <td className="px-4 py-3 text-slate-300">{children}</td>,
  ul: ({children}) => <ul className="list-disc list-inside space-y-2 mb-5 text-slate-300 ml-2">{children}</ul>,
  ol: ({children}) => <ol className="list-decimal list-inside space-y-2 mb-5 text-slate-300 ml-2">{children}</ol>,
  li: ({children}) => <li className="text-[15px] leading-relaxed">{children}</li>,
  blockquote: ({children}) => <blockquote className="border-l-4 border-amber-500 bg-amber-500/5 px-4 py-3 my-6 rounded-r-lg"><div className="text-amber-200 italic">{children}</div></blockquote>,
  code: ({children}) => <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
  hr: () => <hr className="border-slate-700 my-8" />,
  a: ({href,children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">{children}</a>,
};

export default function ArticleContent({ content }: Props) {
  return (
    <div className="mt-8">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
