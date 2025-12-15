import React from 'react';
import { WordData } from '../types';
import { Star, BookOpen, Volume2 } from 'lucide-react';

interface WordCardProps {
  wordData: WordData;
  isFavorite?: boolean;
  onToggleFavorite?: (word: WordData) => void;
  onAddToLearn?: (word: WordData) => void;
  isInToLearn?: boolean;
}

export const WordCard: React.FC<WordCardProps> = ({ 
  wordData, 
  isFavorite, 
  onToggleFavorite,
  onAddToLearn,
  isInToLearn 
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 mr-2">
            <h2 className="text-3xl font-bold text-slate-900 leading-tight">{wordData.word}</h2>
            <div className="flex items-center gap-2 text-slate-500 mt-1">
              <span className="italic font-serif">{wordData.partOfSpeech}</span>
              {wordData.pronunciation && (
                <span className="text-sm bg-slate-100 px-2 py-0.5 rounded-full">/{wordData.pronunciation}/</span>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
             {onAddToLearn && (
                <button 
                  onClick={() => onAddToLearn(wordData)}
                  className={`p-2 rounded-full transition-colors ${isInToLearn ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:bg-slate-50'}`}
                  title={isInToLearn ? "Remove from Study List" : "Add to Study List"}
                >
                  <BookOpen fill={isInToLearn ? "currentColor" : "none"} size={24} />
                </button>
             )}
             {onToggleFavorite && (
                <button 
                  onClick={() => onToggleFavorite(wordData)}
                  className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-yellow-400 bg-yellow-50' : 'text-slate-300 hover:bg-slate-50'}`}
                  title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Star fill={isFavorite ? "currentColor" : "none"} size={24} />
                </button>
             )}
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Definition</h3>
            <p className="text-lg leading-snug text-slate-800">{wordData.definition}</p>
          </div>
          
          <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Example</h3>
            <p className="text-indigo-900 italic leading-snug">"{wordData.example}"</p>
          </div>
        </div>
      </div>
    </div>
  );
};