import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { WordCard } from './components/WordCard';
import { Button } from './components/Button';
import { generateWordOfDay, generateDefinitionQuiz, generateContextQuiz } from './services/geminiService';
import { UserSettings, UserProgress, WordData, GameState, GameMode, QuizQuestion } from './types';
import { DEFAULT_SETTINGS, FONTS, DIFFICULTIES } from './constants';
import { Check, X, RefreshCw, Trophy, Book, Trash2, Heart, Award, ArrowRight, RotateCcw, Home } from 'lucide-react';

// Custom hook for local storage
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [listTab, setListTab] = useState<'learned' | 'toLearn' | 'favorites'>('favorites');
  const [settings, setSettings] = useLocalStorage<UserSettings>('vocab_settings', DEFAULT_SETTINGS);
  const [progress, setProgress] = useLocalStorage<UserProgress>('vocab_progress', {
    succeeded: [],
    failed: [],
    favorites: [],
    toLearn: [],
  });

  // Game State
  const [gameState, setGameState] = useState<GameState>({
    currentMode: GameMode.None,
    isLoading: false,
    quizData: null,
    score: 0,
    streak: 0,
    isGameOver: false,
    sessionFailedWords: [],
  });
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showResultCard, setShowResultCard] = useState(false);
  const [wordOfDay, setWordOfDay] = useState<WordData | null>(null);
  
  // Reference to hold the promise of the next question for prefetching
  const nextQuestionPromise = useRef<Promise<QuizQuestion> | null>(null);

  // Helper to add word to lists
  const addToProgress = (listName: keyof UserProgress, word: WordData) => {
    setProgress({
      ...progress,
      [listName]: [...progress[listName].filter(w => w.word !== word.word), word]
    });
  };

  const removeFromProgress = (listName: keyof UserProgress, wordStr: string) => {
     setProgress({
      ...progress,
      [listName]: progress[listName].filter(w => w.word !== wordStr)
    });
  };

  const toggleFavorite = (word: WordData) => {
    const isFav = progress.favorites.some(w => w.word === word.word);
    if (isFav) {
      removeFromProgress('favorites', word.word);
    } else {
      addToProgress('favorites', word);
    }
  };

  const toggleToLearn = (word: WordData) => {
    const isListed = progress.toLearn.some(w => w.word === word.word);
    if (isListed) {
      removeFromProgress('toLearn', word.word);
    } else {
      addToProgress('toLearn', word);
    }
  };

  // Initialize Word of Day
  useEffect(() => {
    const fetchWOD = async () => {
      // Simple cache for WOD
      const today = new Date().toDateString();
      const cached = localStorage.getItem('wod_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === today && parsed.difficulty === settings.difficulty) {
          setWordOfDay(parsed.data);
          return;
        }
      }

      try {
        const word = await generateWordOfDay(settings.difficulty);
        setWordOfDay(word);
        localStorage.setItem('wod_cache', JSON.stringify({ date: today, difficulty: settings.difficulty, data: word }));
      } catch (e) {
        console.error("Failed to fetch WOD");
      }
    };

    if (activeTab === 'home' && !wordOfDay) {
      fetchWOD();
    }
  }, [settings.difficulty, activeTab, wordOfDay]);


  // Game Logic
  const startGame = async (mode: GameMode) => {
    // Clear any pending prefetch when starting fresh
    nextQuestionPromise.current = null;
    setGameState(prev => ({ 
      ...prev, 
      currentMode: mode, 
      isLoading: true, 
      quizData: null,
      score: 0,
      streak: 0,
      isGameOver: false,
      sessionFailedWords: []
    }));
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setShowResultCard(false);

    try {
      let data: QuizQuestion;
      if (mode === GameMode.DefinitionMatch) {
        data = await generateDefinitionQuiz(settings.difficulty);
      } else {
        data = await generateContextQuiz(settings.difficulty);
      }
      setGameState(prev => ({ ...prev, quizData: data, isLoading: false }));
    } catch (e) {
      setGameState(prev => ({ ...prev, isLoading: false, currentMode: GameMode.None }));
      alert("Could not start game. Check connection.");
    }
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return; // Prevent double click
    
    setSelectedAnswer(answer);
    const correct = answer === gameState.quizData?.correctAnswer;
    setIsAnswerCorrect(correct);

    if (correct) {
      setGameState(prev => ({ ...prev, score: prev.score + 10, streak: prev.streak + 1 }));
      if (gameState.quizData?.wordContext) {
        addToProgress('succeeded', gameState.quizData.wordContext);
      }
    } else {
      setGameState(prev => ({ 
        ...prev, 
        streak: 0,
        // Add to session mistakes, preventing duplicates
        sessionFailedWords: gameState.quizData?.wordContext 
          ? [...prev.sessionFailedWords.filter(w => w.word !== gameState.quizData!.wordContext.word), gameState.quizData.wordContext]
          : prev.sessionFailedWords
      }));
      if (gameState.quizData?.wordContext) {
        addToProgress('failed', gameState.quizData.wordContext);
        addToProgress('toLearn', gameState.quizData.wordContext); // Auto-add failed to learn list
      }
    }

    // Delay showing the result card to allow user to see feedback
    setTimeout(() => {
      setShowResultCard(true);
    }, 1000);

    // Prefetch the next question immediately
    if (gameState.currentMode !== GameMode.None) {
      const generator = gameState.currentMode === GameMode.DefinitionMatch 
          ? generateDefinitionQuiz 
          : generateContextQuiz;
      nextQuestionPromise.current = generator(settings.difficulty);
    }
  };

  const nextQuestion = async () => {
    // If we have a pending promise, wait for it
    if (nextQuestionPromise.current) {
      setGameState(prev => ({ ...prev, isLoading: true }));
      try {
        const data = await nextQuestionPromise.current;
        setGameState(prev => ({ ...prev, quizData: data, isLoading: false }));
        setSelectedAnswer(null);
        setIsAnswerCorrect(null);
        setShowResultCard(false);
      } catch (e) {
        console.error("Prefetch failed", e);
        startGame(gameState.currentMode); // Retry with full start cycle if prefetch fails
      }
      nextQuestionPromise.current = null;
    } else {
      // Fallback if no prefetch started (shouldn't happen in normal flow)
      startGame(gameState.currentMode);
    }
  };

  const finishGame = () => {
    setGameState(prev => ({ ...prev, isGameOver: true }));
    nextQuestionPromise.current = null;
  };

  const returnToMenu = () => {
    setGameState({ 
      currentMode: GameMode.None, 
      isLoading: false, 
      quizData: null, 
      score: 0, 
      streak: 0,
      isGameOver: false,
      sessionFailedWords: [] 
    });
    nextQuestionPromise.current = null;
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setShowResultCard(false);
  };

  // Views
  const renderHome = () => (
    <div className="space-y-4 animate-fadeIn h-full flex flex-col">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 text-white shadow-xl shrink-0">
        <h2 className="text-xl font-bold mb-1">Welcome Back!</h2>
        <p className="opacity-90 mb-4 text-sm">Ready to expand your vocabulary?</p>
        
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/10 rounded-xl p-2 backdrop-blur-sm">
            <div className="text-xl font-bold">{progress.succeeded.length}</div>
            <div className="text-[10px] opacity-75 uppercase tracking-wide">Mastered</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 backdrop-blur-sm">
            <div className="text-xl font-bold">{progress.toLearn.length}</div>
            <div className="text-[10px] opacity-75 uppercase tracking-wide">To Learn</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 backdrop-blur-sm">
            <div className="text-xl font-bold">{progress.favorites.length}</div>
            <div className="text-[10px] opacity-75 uppercase tracking-wide">Favorites</div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2 shrink-0">
          <Award className="text-yellow-500" size={20} />
          Word of the Day
        </h3>
        <div className="flex-1 overflow-y-auto">
          {wordOfDay ? (
            <WordCard 
              wordData={wordOfDay} 
              isFavorite={progress.favorites.some(w => w.word === wordOfDay.word)}
              onToggleFavorite={toggleFavorite}
              isInToLearn={progress.toLearn.some(w => w.word === wordOfDay.word)}
              onAddToLearn={toggleToLearn}
            />
          ) : (
            <div className="h-full bg-slate-100 rounded-2xl animate-pulse"></div>
          )}
        </div>
        <div className="mt-2 text-right shrink-0">
           <Button variant="ghost" size="sm" onClick={() => { setWordOfDay(null); localStorage.removeItem('wod_cache'); }}>
             <RefreshCw size={14} className="mr-2" /> Refresh
           </Button>
        </div>
      </div>
    </div>
  );

  const renderGames = () => {
    if (gameState.currentMode !== GameMode.None) {
      if (gameState.isGameOver) {
        // SUMMARY SCREEN
        return (
          <div className="h-full flex flex-col animate-slideUp">
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 text-center mb-4 shrink-0">
                <h2 className="text-2xl font-bold mb-1">Session Complete!</h2>
                <p className="text-slate-500 mb-4 text-sm">Great practice session.</p>
                <div className="flex justify-center gap-8">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-indigo-600">{gameState.score}</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Score</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-red-500">{gameState.sessionFailedWords.length}</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Mistakes</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 mb-4">
                {gameState.sessionFailedWords.length > 0 ? (
                    <>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 shrink-0 px-1">Review Mistakes</h3>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                          {gameState.sessionFailedWords.map((word, idx) => (
                              <WordCard 
                                  key={idx} 
                                  wordData={word}
                                  isFavorite={progress.favorites.some(w => w.word === word.word)}
                                  onToggleFavorite={toggleFavorite}
                                  isInToLearn={progress.toLearn.some(w => w.word === word.word)}
                                  onAddToLearn={toggleToLearn}
                              />
                          ))}
                      </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 flex-col">
                        <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-3">
                          <Check size={32} />
                        </div>
                        <p>Perfect run! No mistakes to review.</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0">
                 <Button variant="secondary" onClick={returnToMenu} className="py-3">
                    <Home size={18} className="mr-2" /> Menu
                 </Button>
                 <Button onClick={() => startGame(gameState.currentMode)} className="py-3">
                    <RotateCcw size={18} className="mr-2" /> Play Again
                 </Button>
            </div>
          </div>
        );
      }

      // ACTIVE GAME SCREEN
      return (
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <Button variant="ghost" size="sm" onClick={finishGame}>Exit</Button>
            <div className="flex gap-4 font-bold text-slate-700">
              <span className="flex items-center gap-1"><Trophy size={16} className="text-yellow-500"/> {gameState.score}</span>
              <span className="flex items-center gap-1 text-orange-500">🔥 {gameState.streak}</span>
            </div>
          </div>

          {gameState.isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 animate-pulse">Consulting the AI...</p>
            </div>
          ) : selectedAnswer && gameState.quizData && showResultCard ? (
             /* RESULT WINDOW */
             <div className="flex-1 flex flex-col animate-slideUp min-h-0">
               <div className={`flex flex-col items-center p-4 rounded-3xl mb-3 shrink-0 ${isAnswerCorrect ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${isAnswerCorrect ? 'bg-green-200' : 'bg-red-200'}`}>
                    {isAnswerCorrect ? <Check size={24} strokeWidth={3} /> : <X size={24} strokeWidth={3} />}
                  </div>
                  <h2 className="text-xl font-bold mb-0">{isAnswerCorrect ? 'Correct!' : 'Incorrect'}</h2>
                  {!isAnswerCorrect && (
                    <p className="text-sm opacity-80 mt-1">The answer was: <span className="font-bold">{gameState.quizData.correctAnswer}</span></p>
                  )}
               </div>

               <div className="flex-1 overflow-y-auto mb-3 scrollbar-hide">
                 <WordCard 
                    wordData={gameState.quizData.wordContext} 
                    isFavorite={progress.favorites.some(w => w.word === gameState.quizData?.wordContext.word)}
                    onToggleFavorite={toggleFavorite}
                    isInToLearn={progress.toLearn.some(w => w.word === gameState.quizData?.wordContext.word)}
                    onAddToLearn={toggleToLearn}
                 />
               </div>

               <Button className="w-full py-3 text-lg shadow-xl shrink-0" onClick={nextQuestion}>
                 Next Question <ArrowRight className="ml-2" />
               </Button>
             </div>
          ) : gameState.quizData ? (
            /* QUESTION WINDOW */
            <div className="flex-1 flex flex-col animate-slideUp min-h-0">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-3 shrink-0 max-h-[40%] overflow-y-auto">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 block">Question</span>
                <p className="text-lg font-medium text-slate-800 leading-snug">{gameState.quizData.question}</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pb-2 scrollbar-hide">
                {gameState.quizData.options.map((option, idx) => {
                  // Determine button styling based on selection state
                  let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all font-medium text-base transform ";
                  
                  if (selectedAnswer) {
                    if (option === selectedAnswer) {
                       if (isAnswerCorrect) {
                          // Selected & Correct
                          btnClass += "border-green-500 bg-green-100 text-green-800 ring-2 ring-green-400 scale-[1.02] shadow-md z-10 ";
                       } else {
                          // Selected & Incorrect
                          btnClass += "border-red-500 bg-red-100 text-red-800 ring-2 ring-red-400 animate-shake z-10 ";
                       }
                    } else if (option === gameState.quizData?.correctAnswer && !isAnswerCorrect) {
                       // Show correct answer if user was wrong
                       btnClass += "border-green-500 bg-green-50 text-green-800 opacity-80 ";
                    } else {
                       // Fade out others
                       btnClass += "border-slate-100 bg-slate-50 opacity-50 grayscale ";
                    }
                  } else {
                    // Default interactive state
                    btnClass += "border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50 active:scale-[0.99] ";
                  }

                  return (
                    <button 
                      key={idx} 
                      className={btnClass}
                      onClick={() => handleAnswer(option)}
                      disabled={!!selectedAnswer}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-4 h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2">Training Modes</h2>
        
        <div 
          onClick={() => startGame(GameMode.DefinitionMatch)}
          className="group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-300 transition-all hover:shadow-md"
        >
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Book size={24} />
          </div>
          <h3 className="text-xl font-bold mb-2">Definition Match</h3>
          <p className="text-slate-500 text-sm">Master definitions by matching words to their meanings.</p>
        </div>

        <div 
          onClick={() => startGame(GameMode.ContextClues)}
          className="group cursor-pointer bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-300 transition-all hover:shadow-md"
        >
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Award size={24} />
          </div>
          <h3 className="text-xl font-bold mb-2">Context Clues</h3>
          <p className="text-slate-500 text-sm">Fill in the blank! Use context clues to choose the right word.</p>
        </div>
      </div>
    );
  };

  const renderLists = () => {
    const currentList = {
      learned: progress.succeeded,
      toLearn: progress.toLearn,
      favorites: progress.favorites
    }[listTab];

    return (
      <div className="h-full flex flex-col">
        <h2 className="text-2xl font-bold mb-4 shrink-0">Your Vocabulary</h2>
        
        <div className="flex gap-2 p-1 bg-slate-200 rounded-xl mb-4 shrink-0">
          {(['favorites', 'toLearn', 'learned'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setListTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                listTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'favorites' ? 'Favorites' : tab === 'toLearn' ? 'To Learn' : 'Mastered'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {currentList.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No words here yet.</p>
              <p className="text-sm">Start playing games to build your list!</p>
            </div>
          ) : (
            currentList.map((word, idx) => (
              <WordCard 
                key={`${word.word}-${idx}`}
                wordData={word}
                isFavorite={progress.favorites.some(w => w.word === word.word)}
                onToggleFavorite={toggleFavorite}
                isInToLearn={progress.toLearn.some(w => w.word === word.word)}
                onAddToLearn={toggleToLearn}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6 h-full overflow-y-auto pb-4">
      <h2 className="text-2xl font-bold mb-4">Preferences</h2>
      
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-lg mb-4">Difficulty Level</h3>
        <div className="space-y-2">
          {DIFFICULTIES.map(level => (
            <label key={level} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200">
              <input 
                type="radio" 
                name="difficulty" 
                checked={settings.difficulty === level}
                onChange={() => {
                   setSettings({...settings, difficulty: level});
                   setWordOfDay(null); // Force refresh WOD
                   localStorage.removeItem('wod_cache');
                }}
                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium">{level}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-lg mb-4">Typography</h3>
        <div className="mb-6">
          <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Font Family</label>
          <div className="grid grid-cols-1 gap-2">
            {FONTS.map(font => (
              <button
                key={font.value}
                onClick={() => setSettings({...settings, font: font.value})}
                className={`text-left px-4 py-3 rounded-xl border transition-all ${
                  settings.font === font.value 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className={font.className}>{font.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Font Size</label>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
             {(['small', 'medium', 'large'] as const).map(size => (
               <button
                 key={size}
                 onClick={() => setSettings({...settings, fontSize: size})}
                 className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                   settings.fontSize === size ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                 }`}
               >
                 {size.charAt(0).toUpperCase() + size.slice(1)}
               </button>
             ))}
          </div>
        </div>
      </section>

      <section className="bg-red-50 p-5 rounded-2xl border border-red-100">
        <h3 className="font-bold text-red-900 mb-2">Danger Zone</h3>
        <p className="text-sm text-red-700 mb-4">Clear all your progress and history.</p>
        <Button 
          variant="danger" 
          onClick={() => {
            if (confirm("Are you sure you want to reset all progress?")) {
              setProgress({ succeeded: [], failed: [], favorites: [], toLearn: [] });
            }
          }}
        >
          <Trash2 size={16} className="mr-2" />
          Reset All Progress
        </Button>
      </section>
    </div>
  );

  return (
    <Layout settings={settings} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'home' && renderHome()}
      {activeTab === 'games' && renderGames()}
      {activeTab === 'lists' && renderLists()}
      {activeTab === 'settings' && renderSettings()}
    </Layout>
  );
};

export default App;