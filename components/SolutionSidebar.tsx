import React from 'react';
import { Solution } from '../types';
import { Trash2, Eye } from 'lucide-react';

interface SolutionSidebarProps {
  solutions: Solution[];
  hoveredSolutionId: string | null;
  onHoverSolution: (id: string | null) => void;
  selectedSolutionId: string | null;
  onSelectSolution: (id: string | null) => void;
  onApplySolution: (id: string) => void;
}

const SolutionSidebar: React.FC<SolutionSidebarProps> = ({ 
  solutions, 
  hoveredSolutionId, 
  onHoverSolution,
  selectedSolutionId,
  onSelectSolution,
  onApplySolution
}) => {
  return (
    <div className="flex flex-col h-full w-full bg-white">
      <div className="p-3 md:p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="text-base md:text-lg font-bold text-gray-800">Possible Moves</h2>
          <p className="text-xs text-gray-500">{solutions.length} combinations found</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {solutions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
            <span className="mb-2 text-2xl">🔍</span>
            <p className="text-sm">No moves found.</p>
            <p className="text-xs mt-1">Try clearing some blocks or resetting.</p>
          </div>
        ) : (
          solutions.map((sol, index) => {
            const width = sol.end.col - sol.start.col + 1;
            const height = sol.end.row - sol.start.row + 1;
            const isHovered = hoveredSolutionId === sol.id;
            const isSelected = selectedSolutionId === sol.id;
            const isActive = isHovered || isSelected;

            return (
              <div
                key={sol.id}
                onMouseEnter={() => onHoverSolution(sol.id)}
                onMouseLeave={() => onHoverSolution(null)}
                className={`w-full flex items-center justify-between p-2 md:p-3 rounded-lg border transition-all duration-200 group relative select-none ${isActive ? 'border-azx-accent bg-blue-100 shadow-md translate-x-1 z-10' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
              >
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onSelectSolution(isSelected ? null : sol.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-mono font-bold text-sm ${isActive ? 'text-azx-accent' : 'text-gray-600'}`}>
                      Option #{index + 1}
                    </span>
                    <span className="text-xs font-semibold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      {width}x{height}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    R{sol.start.row + 1}:C{sol.start.col + 1} to R{sol.end.row + 1}:C{sol.end.col + 1}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSolution(isSelected ? null : sol.id);
                    }}
                    className={`p-2 rounded-full transition-colors ${isSelected ? 'text-azx-accent bg-blue-200 hover:bg-blue-300' : 'text-gray-400 hover:text-azx-accent hover:bg-blue-100'}`}
                    title={isSelected ? "Un-highlight" : "Highlight on grid"}
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplySolution(sol.id);
                    }}
                    className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Clear blocks"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SolutionSidebar;