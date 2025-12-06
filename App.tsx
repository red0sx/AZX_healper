import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Camera, RotateCcw, Info, Upload, AlertCircle, ArrowLeft, Image as ImageIcon, Loader2, X, Settings, Key, Check, ShieldCheck, Gamepad2, Grid3X3, Zap } from 'lucide-react';
import { Grid, SolverStatus } from './types.ts';
import { parseGridFromImage } from './services/geminiService.ts';
import { findSolutions } from './services/solverService.ts';
import SolutionSidebar from './components/SolutionSidebar.tsx';

const App: React.FC = () => {
  const [initialGrid, setInitialGrid] = useState<Grid>([]);
  const [grid, setGrid] = useState<Grid>([]);
  const [status, setStatus] = useState<SolverStatus>(SolverStatus.IDLE);
  const [hoveredSolutionId, setHoveredSolutionId] = useState<string | null>(null);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("Analyzing Grid...");
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
          setCameraError("Oops! Can't see the camera.");
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
    setLoadingMessage("Reading Game Data...");
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

  // --- Render Components ---

  if (isCameraOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col font-sans">
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm bg-retro-paper border-4 border-retro-dark shadow-pixel">
              <div className="text-retro-red mb-4">
                 <AlertCircle size={48} />
              </div>
              <h3 className="text-2xl font-bold text-retro-dark mb-4 font-mono">CAMERA_ERR</h3>
              <p className="text-retro-dark mb-6">{cameraError}</p>
              <button 
                onClick={() => setIsCameraOpen(false)}
                className="px-6 py-3 bg-retro-red text-white font-bold border-2 border-retro-dark shadow-pixel active:translate-y-1 active:shadow-none"
              >
                CLOSE
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
              <div className="absolute inset-0 pointer-events-none border-[12px] border-retro-dark/50"></div>
              {/* Scanlines effect */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] z-10"></div>
              
              <button 
                onClick={() => setIsCameraOpen(false)}
                className="absolute top-6 right-6 p-3 bg-retro-red border-4 border-retro-dark text-white z-20 shadow-pixel active:translate-y-1 active:shadow-none"
              >
                <X size={24} />
              </button>
            </>
          )}
        </div>
        {!cameraError && (
          <div className="h-32 bg-retro-dark flex items-center justify-center gap-8 border-t-4 border-white/20">
             <button 
               onClick={capturePhoto}
               className="w-20 h-20 bg-retro-paper border-4 border-white rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
             >
               <div className="w-16 h-16 bg-retro-red border-4 border-retro-dark rounded-full" />
             </button>
          </div>
        )}
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-retro-paper border-4 border-retro-dark shadow-pixel p-8 w-full max-w-lg relative">
          <div className="bg-retro-dark text-white text-center py-2 -mx-8 -mt-8 mb-8 border-b-4 border-retro-dark">
             <h2 className="text-3xl font-bold tracking-widest">+ CONFIG +</h2>
          </div>
          
          <div className="space-y-6">
            <div className="border-2 border-dashed border-retro-dark/50 p-4 bg-white">
              <p className="text-xl mb-2 flex items-center gap-2">
                <Key size={20} /> API ACCESS
              </p>
              <div className="text-base text-gray-600 mb-4 font-sans">
                Enter your Gemini API Key to enable the solver service.
              </div>
              <input 
                type="password" 
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="Paste key here..."
                className="w-full p-3 bg-retro-grid border-2 border-retro-dark focus:outline-none focus:bg-white focus:border-retro-blue text-xl font-mono"
              />
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                <ShieldCheck size={14}/> Stored locally on device
              </p>
            </div>
            
            <button 
              onClick={saveApiKey}
              disabled={!tempKey}
              className="w-full bg-retro-blue text-white font-bold text-2xl py-4 border-4 border-retro-dark shadow-pixel hover:bg-retro-blue-light active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              INITIALIZE <Check size={28} />
            </button>
            
            {apiKey && (
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full text-retro-dark hover:underline py-2 font-bold text-lg"
              >
                [ RETURN ]
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (grid.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
        
        <button 
          onClick={() => { setTempKey(apiKey); setShowSettings(true); }}
          className="absolute top-6 right-6 p-3 bg-retro-paper border-2 border-retro-dark text-retro-dark shadow-pixel-sm hover:translate-y-1 active:shadow-none transition-all z-20"
        >
          <Settings size={24} />
        </button>

        {status === SolverStatus.ANALYZING && (
          <div className="absolute inset-0 z-50 bg-retro-dark/80 flex flex-col items-center justify-center">
             <div className="bg-retro-paper p-8 border-4 border-white shadow-pixel-lg flex flex-col items-center max-w-sm text-center">
                <Loader2 size={64} className="text-retro-blue animate-spin mb-4" />
                <p className="text-2xl font-bold text-retro-dark blink-text">{loadingMessage}</p>
             </div>
          </div>
        )}

        {status === SolverStatus.ERROR && (
           <div className="absolute top-10 z-50 bg-retro-paper border-4 border-retro-red text-retro-red px-6 py-4 shadow-pixel flex items-center gap-4">
             <AlertCircle size={32} />
             <div>
               <p className="font-bold text-xl">ERROR</p>
               <p className="text-base">SCAN FAILED. RETRY.</p>
             </div>
           </div>
        )}

        <div className="w-full max-w-lg mx-auto text-center z-10">
          <div className="mb-12 relative inline-block border-4 border-retro-dark bg-retro-paper p-6 shadow-pixel-lg rotate-1">
             <div className="absolute -top-3 -left-3 w-6 h-6 bg-retro-grid border-2 border-retro-dark rounded-full"></div>
             <div className="absolute -top-3 -right-3 w-6 h-6 bg-retro-grid border-2 border-retro-dark rounded-full"></div>
             <h1 className="text-5xl md:text-6xl font-bold text-retro-dark tracking-tighter leading-none mb-2">
              AZX HELPER
            </h1>
            <div className="text-xl bg-retro-dark text-white px-2 py-1 inline-block">SERVICE TIME</div>
          </div>
          
          <div className="space-y-6 px-4">
            <button 
              onClick={() => setIsCameraOpen(true)}
              disabled={status === SolverStatus.ANALYZING || !apiKey}
              className="w-full flex items-center justify-between p-4 bg-retro-blue text-white border-4 border-retro-dark shadow-pixel hover:bg-retro-blue-light active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black/20 flex items-center justify-center border-2 border-black/10">
                  <Camera size={28} />
                </div>
                <div className="text-left">
                  <span className="block text-2xl font-bold">START SCAN</span>
                </div>
              </div>
              <div className="px-3 py-1 bg-black/20 text-sm font-bold">
                 [Q]
              </div>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={status === SolverStatus.ANALYZING || !apiKey}
              className="w-full flex items-center justify-between p-4 bg-retro-paper text-retro-dark border-4 border-retro-dark shadow-pixel hover:bg-white active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-retro-grid flex items-center justify-center border-2 border-retro-dark/10">
                  <ImageIcon size={28} />
                </div>
                <div className="text-left">
                  <span className="block text-2xl font-bold">LOAD IMAGE</span>
                </div>
              </div>
               <div className="px-3 py-1 bg-retro-grid text-sm font-bold border border-retro-dark/20">
                 [W]
              </div>
            </button>
          </div>

          <div className="mt-12 text-retro-dark/60 flex items-center justify-center gap-2 font-bold text-lg">
            <Info size={20} />
            <p>CTRL+V TO PASTE</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans text-retro-dark">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
      
      {/* Main Sheet Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto my-4 lg:my-8 flex flex-col lg:flex-row gap-6 px-4 overflow-hidden">
        
        {/* Left Side: Puzzle Board */}
        <div className="flex-1 flex flex-col bg-retro-paper border-4 border-retro-dark shadow-pixel overflow-hidden relative">
          
          {/* Header Bar */}
          <div className="bg-retro-dark text-white p-3 flex items-center justify-between border-b-4 border-retro-dark shrink-0">
             <div className="flex items-center gap-2">
                <span className="text-retro-red font-bold">+</span>
                <span className="text-xl tracking-widest">GAME GUIDE</span>
                <span className="text-retro-red font-bold">+</span>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={goHome}
                  className="bg-retro-red px-3 py-1 text-sm border-2 border-black/30 hover:bg-white hover:text-retro-red transition-colors"
                >
                  EXIT
                </button>
             </div>
          </div>

          {/* Action Bar */}
          <div className="bg-retro-grid border-b-4 border-retro-dark p-3 flex gap-3 shrink-0">
             <button 
                onClick={resetGrid}
                className="p-2 bg-white border-2 border-retro-dark shadow-pixel-sm active:translate-y-0.5 active:shadow-none hover:bg-blue-50"
                title="Reset"
              >
                <RotateCcw size={20} />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white border-2 border-retro-dark shadow-pixel-sm active:translate-y-0.5 active:shadow-none hover:bg-blue-50"
                title="Upload"
              >
                <Upload size={20} />
              </button>
              <button 
                onClick={() => setIsCameraOpen(true)}
                className="p-2 bg-retro-blue text-white border-2 border-retro-dark shadow-pixel-sm active:translate-y-0.5 active:shadow-none hover:bg-retro-blue-light"
                title="Scan"
              >
                <Camera size={20} />
              </button>
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-auto p-6 flex flex-col items-center bg-[#b8c2cf] relative notebook-lines">
             {/* Decorative 'tape' */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-retro-paper/50 rotate-1 border-x-2 border-white/20 blur-[1px]"></div>

             <div className="my-auto relative">
                <div className="bg-[#8b9bb4] p-4 border-4 border-white shadow-xl inline-block">
                   <div 
                      className="grid gap-1.5"
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
                                className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-[#7a8a9f] bg-[#9caabf]/50 flex items-center justify-center"
                              >
                                 <div className="w-2 h-2 bg-[#7a8a9f] rounded-full opacity-50" />
                              </div>
                            );
                          }

                          return (
                            <div 
                              key={`${rowIndex}-${colIndex}`}
                              className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold text-3xl sm:text-4xl border-b-4 border-r-4 transition-transform duration-100 ${isHighlighted ? 'bg-retro-red text-white border-retro-dark -translate-y-1 shadow-lg z-10' : 'bg-retro-blue text-white border-[#3d5269] hover:brightness-110'}`}
                            >
                              <span className="drop-shadow-md">{cellVal}</span>
                            </div>
                          );
                        })
                      ))}
                    </div>
                </div>
             </div>
             
             {/* Subtext */}
             <div className="mt-6 bg-retro-dark text-white px-6 py-2 border-2 border-white shadow-lg text-lg tracking-widest">
                {hoveredSolutionId ? ">> PREVIEW <<" : "AZX SERVICE TIME"}
             </div>
          </div>
        </div>

        {/* Right Side: Solutions List (Notebook Page) */}
        <div className="h-[300px] lg:h-full lg:w-[400px] bg-retro-paper border-4 border-retro-dark shadow-pixel flex flex-col shrink-0">
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