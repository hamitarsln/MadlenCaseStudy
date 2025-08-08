"use client";
import React from 'react';

interface MessageFormatterProps {
  content: string;
  isUser?: boolean;
}

export function MessageFormatter({ content, isUser = false }: MessageFormatterProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return <div className="prose prose-sm dark:prose-invert max-w-none ai-message">{formatAIMessage(content)}</div>;
}

function formatAIMessage(text: string): React.ReactNode {
  const jsonRegex = /```json\n?([\s\S]*?)\n?```/g;
  let parts = [];
  let lastIndex = 0;
  let match;
  let partIndex = 0;

  while ((match = jsonRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <div key={`text-${partIndex}`}>
          {processText(text.slice(lastIndex, match.index))}
        </div>
      );
      partIndex++;
    }
    
    parts.push(
      <div key={`json-${partIndex}`} className="my-4 p-4 bg-slate-800/50 border border-slate-600/50 rounded-lg">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span>📊 Performans Analizi</span>
        </div>
        <div className="bg-slate-900/70 p-3 rounded border border-slate-700">
          <pre className="text-xs overflow-x-auto">
            <code className="text-green-400">{formatJSON(match[1])}</code>
          </pre>
        </div>
      </div>
    );
    partIndex++;
    
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <div key={`text-final-${partIndex}`}>
        {processText(text.slice(lastIndex))}
      </div>
    );
  }

  return <div className="space-y-2">{parts}</div>;
}

function processText(text: string): React.ReactNode {
  text = text.replace(/\*\*(.*?)\*\*/g, '<span class="inline-flex items-center px-2 py-1 bg-primary/20 text-primary font-semibold rounded-md border border-primary/30 shadow-sm">✨ $1</span>');
  
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="text-slate-300 italic font-light">$1</em>');
  
  text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-700/80 text-yellow-300 px-2 py-1 rounded font-mono text-sm border border-slate-600">$1</code>');
  
  text = text.replace(/\n\n/g, '</p><p class="mb-3">');
  text = text.replace(/\n/g, '<br />');
  
  text = `<p class="mb-3 leading-relaxed">${text}</p>`;
  
  return <div dangerouslySetInnerHTML={{ __html: text }} />;
}

function formatJSON(jsonStr: string): string {
  try {
    const parsed = JSON.parse(jsonStr.trim());
    
    const translated = {
      grammar_score: "Dilbilgisi",
      vocab_score: "Kelime Hazinesi", 
      fluency_score: "Akıcılık",
      new_words: "Yeni Kelimeler",
      structure_used: "Yapı Kullanımı"
    };
    
    let formatted = "{\n";
    Object.entries(parsed).forEach(([key, value], index, arr) => {
      const translatedKey = translated[key as keyof typeof translated] || key;
      let formattedValue = value;
      
      if (key.includes('_score')) {
        const score = value as number;
        const stars = "⭐".repeat(Math.max(1, Math.min(5, score)));
        formattedValue = `${score}/5 ${stars}`;
      } else if (Array.isArray(value)) {
        formattedValue = `[${(value as string[]).map(w => `"${w}"`).join(', ')}]`;
      } else if (typeof value === 'boolean') {
        formattedValue = value ? "✅" : "❌";
      }
      
      formatted += `  "${translatedKey}": ${typeof formattedValue === 'string' ? `"${formattedValue}"` : formattedValue}`;
      if (index < arr.length - 1) formatted += ",";
      formatted += "\n";
    });
    formatted += "}";
    
    return formatted;
  } catch {
    return jsonStr;
  }
}
