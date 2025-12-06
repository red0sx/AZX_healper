import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Camera, RotateCcw, Info, Upload, AlertCircle, ArrowLeft, Image as ImageIcon, Loader2, X, Settings, Key, Check, ShieldCheck } from 'lucide-react';
import { Grid, SolverStatus } from './types';
import { parseGridFromImage } from './services/geminiService';
import { findSolutions } from './services/solverService';
import SolutionSidebar from './components/SolutionSidebar';

const App: React.FC = () => {
  const [initialGrid, setInitialGrid] = useState<Grid>([]);
  const [grid, setGrid] = useState<Grid>([]);
  const [status, setStatus] = useState<SolverStatus>(SolverStatus.IDLE);
  const [hoveredSolutionId, setHoveredSolutionId] = useState<string | null>(null);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("Initializing...");
  const [apiKey, setApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [tempKey, setTempKey] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('azx_gemini_key');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowSettings(true);
    }
  }, []);

  const saveApiKey = () => {
    if (tempKey.trim()) {
      localStorage.setItem('azx_gemini_key', tempKey.trim());
      setApiKey(tempKey.trim());
      setShowSettings(false);
    }
  };

  const solutions = useMemo(() => findSolutions(grid), [grid]);

  const highlightedCells = useMemo(() => {
    const activeId = hoveredSolutionId || selectedSolutionId;
    if (!activeId) return new Set<string>();
    const sol = solutions.find(s => s.id === activeId);
    if (!sol) return new Set<string>();
    const set = new Set<string>();
    sol.cells.forEach(cell => set.add(`${cell.row}-${cell.col}`));
    return set;
  }, [hoveredSolutionId, selectedSolutionId, solutions]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraOpen) {
      setCameraError(null);
      (async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error(err);
          setCameraError("Camera access denied. Please check permissions.");
        }
      })();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen]);

  const processImageSrc = async (src: string) => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }
    setStatus(SolverStatus.ANALYZING);
    setLoadingMessage("Analyzing image...");
    try {
      const newGrid = await parseGridFromImage(src, apiKey);
      if (!newGrid || newGrid.length === 0) {
        throw new Error("No grid detected");
      }
      setInitialGrid(newGrid);
      setGrid(newGrid);
      setStatus(SolverStatus.READY);
      setSelectedSolutionId(null);
    } catch (err) {
      console.error(err);
      setStatus(SolverStatus.ERROR);
      setTimeout(() => setStatus(SolverStatus.IDLE), 3000); 
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        processImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        setIsCameraOpen(false);
        processImageSrc(dataUrl);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
      e.target.value = '';
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) processFile(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [apiKey]);

  const updateCell = (row: number, col: number, value: string) => {
    const num = parseInt(value);
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = isNaN(num) ? 0 : num;
    setGrid(newGrid);
  };

  const applySolution = (id: string) => {
    const sol = solutions.find(s => s.id === id);
    if (!sol) return;
    const newGrid = grid.map(row => [...row]);
    sol.cells.forEach(({row, col}) => newGrid[row][col] = 0);
    setGrid(newGrid);
    setHoveredSolutionId(null);
    setSelectedSolutionId(null);
  };

  const resetGrid = () => {
    setGrid(initialGrid);
    setStatus(SolverStatus.READY);
    setSelectedSolutionId(null);
  };

  const goHome = () => {
    setGrid([]);
    setInitialGrid([]);
    setStatus(SolverStatus.IDLE);
    setHoveredSolutionId(null);
    setSelectedSolutionId(null);
  };

  if (isCameraOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
              <AlertCircle size={48} className="text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
              <p className="text-gray-400 mb-6">{cameraError}</p>
              <button 
                onClick={() => setIsCameraOpen(false)}
                className="px-6 py-2 bg-white text-black rounded-full font-medium active:scale-95 transition-transform"
              >
                Close Camera
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setIsCameraOpen(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full z-10"
              >
                <X size={24} />
              </button>
            </>
          )}
        </div>
        {!cameraError && (
          <div className="h-24 bg-black flex items-center justify-center gap-8 pb-4">
             <button 
               onClick={capturePhoto}
               className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center active:scale-95 transition-transform"
             >
               <div className="w-14 h-14 rounded-full bg-white border-2 border-black" />
             </button>
          </div>
        )}
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="min-h-screen bg-azx-bg flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="flex items-center gap-3 mb-6 text-azx-blue">
            <Settings size={28} />
            <h2 className="text-2xl font-bold">App Setup</h2>
          </div>
          <div className="mb-6">
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              To use this tool, you need a <strong>Google Gemini API Key</strong>. 
            </p>
            <ol className="list-decimal list-inside text-xs text-gray-500 space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-azx-accent hover:underline">Google AI Studio</a>.</li>
              <li>Click "Create API Key".</li>
              <li>Paste the key below.</li>
            </ol>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">API Key</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azx-accent focus:border-azx-accent outline-none font-mono text-sm"
                />
                <Key className="absolute left-3 top-3.5 text-gray-400" size={16} />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                <ShieldCheck size={12}/> Stored locally in your browser.
              </p>
            </div>
            <button 
              onClick={saveApiKey}
              disabled={!tempKey}
              className="w-full bg-azx-accent text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Save & Continue
            </button>
            {apiKey && (
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full text-gray-500 text-sm hover:text-gray-700 py-2"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (grid.length === 0) {
    return (
      <div className="min-h-screen bg-azx-bg flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
        <button 
          onClick={() => { setTempKey(apiKey); setShowSettings(true); }}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-azx-blue transition-colors z-20"
        >
          <Settings size={24} />
        </button>
        {status === SolverStatus.ANALYZING && (
          <div className="absolute inset-0 z-50 bg-white/90 flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-azx-accent border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={24} className="text-azx-accent animate-pulse" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-700 animate-pulse">{loadingMessage}</p>
          </div>
        )}
        {status === SolverStatus.ERROR && (
           <div className="absolute top-10 z-50 bg-red-100 border border-red-300 text-red-700 px-6 py-4 rounded-xl shadow-lg animate-fade-in-down flex items-center gap-3">
             <AlertCircle size={24} />
             <div>
               <p className="font-bold">Scan Failed</p>
               <p className="text-sm">Could not analyze the image. Please try again.</p>
             </div>
           </div>
        )}
        <div className="w-full max-w-md mx-auto text-center z-10">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-azx-blue to-azx-accent mb-8 tracking-tight">
            AZX Service Helper
          </h1>
          <div className="space-y-4">
            <button 
              onClick={() => setIsCameraOpen(true)}
              disabled={status === SolverStatus.ANALYZING || !apiKey}
              className="w-full group relative flex items-center justify-center gap-4 p-5 bg-azx-accent text-white rounded-2xl shadow-lg hover:bg-blue-400 hover:shadow-blue-400/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="bg-white/20 p-2 rounded-full group-hover:scale-110 transition-transform">
                <Camera size={24} />
              </div>
              <div className="text-left">
                <span className="block text-lg font-bold">Open Camera</span>
                <span className="block text-xs opacity-90">Scan directly</span>
              </div>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={status === SolverStatus.ANALYZING || !apiKey}
              className="w-full group relative flex items-center justify-center gap-4 p-5 bg-white text-gray-700 border-2 border-gray-100 rounded-2xl shadow-sm hover:border-azx-accent hover:shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="bg-gray-100 p-2 rounded-full group-hover:bg-blue-50 group-hover:text-azx-accent transition-colors">
                <ImageIcon size={24} />
              </div>
              <div className="text-left">
                <span className="block text-lg font-bold">Upload Image</span>
                <span className="block text-xs text-gray-400">From gallery</span>
              </div>
            </button>
          </div>
          <div className="mt-12 text-sm text-gray-400 flex items-center justify-center gap-2">
            <Info size={14} />
            <p>You can also paste (Ctrl+V) a screenshot.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans text-gray-900">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-30 shrink-0 h-14">
        <button 
          onClick={goHome}
          className="flex items-center gap-2 text-gray-600 hover:text-azx-blue hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm"
        >
          <ArrowLeft size={18} />
          <span>Home</span>
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={resetGrid}
            className="p-2 text-gray-500 hover:text-azx-blue hover:bg-gray-100 rounded-full transition-colors"
            title="Reset Puzzle"
          >
            <RotateCcw size={20} />
          </button>
          <div className="h-6 w-px bg-gray-200 mx-1"></div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-azx-blue hover:bg-gray-100 rounded-full transition-colors"
            title="Upload New"
            disabled={status === SolverStatus.ANALYZING}
          >
            <Upload size={20} />
          </button>
          <button 
            onClick={() => setIsCameraOpen(true)}
            className="p-2 text-azx-accent hover:bg-blue-50 rounded-full transition-colors"
            title="Scan New"
            disabled={status === SolverStatus.ANALYZING}
          >
             {status === SolverStatus.ANALYZING ? (
               <span className="w-5 h-5 block border-2 border-azx-accent/30 border-t-azx-accent rounded-full animate-spin"></span>
             ) : (
               <Camera size={20} />
             )}
          </button>
        </div>
      </header>
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden relative">
        <div className="flex-1 flex flex-col relative overflow-hidden bg-azx-bg">
          <div className="flex-1 overflow-auto flex flex-col items-center p-4 lg:p-8">
            <div className="my-auto">
              <div className="bg-white p-2 sm:p-4 rounded-xl shadow-2xl border-4 border-gray-200 inline-block transition-all duration-300">
                <div 
                  className="grid gap-px sm:gap-1 bg-gray-300 border border-gray-300"
                  style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 0}, minmax(0, 1fr))` }}
                >
                  {grid.map((rowArr, rowIndex) => (
                    rowArr.map((cellVal, colIndex) => {
                      const isHighlighted = highlightedCells.has(`${rowIndex}-${colIndex}`);
                      const isEmpty = cellVal === 0;
                      if (isEmpty) {
                        return (
                          <div 
                            key={`${rowIndex}-${colIndex}`}
                            className={`relative w-7 h-9 sm:w-9 sm:h-11 lg:w-10 lg:h-12 bg-gray-200/50 rounded-sm flex items-center justify-center transition-colors ${isHighlighted ? 'bg-azx-accent/30 z-10' : ''}`}
                          />
                        );
                      }
                      return (
                        <div 
                          key={`${rowIndex}-${colIndex}`}
                          className={`relative w-7 h-9 text-lg sm:w-9 sm:h-11 sm:text-xl lg:w-10 lg:h-12 lg:text-2xl flex items-center justify-center transition-all duration-200 font-mono font-bold ${isHighlighted ? 'bg-azx-accent text-white z-10 scale-105 shadow-lg' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                        >
                          <input 
                            type="tel"
                            value={cellVal}
                            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                            className={`w-full h-full text-center bg-transparent outline-none cursor-default focus:cursor-text p-0 m-0 ${isHighlighted ? 'text-white' : 'text-gray-100'} focus:bg-slate-800 focus:text-white focus:ring-2 focus:ring-blue-400 focus:z-20`}
                            maxLength={1}
                            inputMode="numeric"
                          />
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-gray-400 text-sm">
              <Info size={16} />
              <span className="hidden lg:inline">Hover to highlight. Click to select.</span>
              <span className="lg:hidden">Tap items below to see solution on grid.</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 h-[35vh] min-h-[200px] lg:h-full lg:w-96 lg:min-w-[320px] bg-white border-t lg:border-t-0 lg:border-l border-gray-200 shadow-xl z-20 flex flex-col">
          <SolutionSidebar 
            solutions={solutions}
            hoveredSolutionId={hoveredSolutionId}
            onHoverSolution={setHoveredSolutionId}
            selectedSolutionId={selectedSolutionId}
            onSelectSolution={setSelectedSolutionId}
            onApplySolution={applySolution}
          />
        </div>
      </div>
    </div>
  );
};

export default App;