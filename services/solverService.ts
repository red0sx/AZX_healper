import { Grid, Solution } from '../types';

export const findSolutions = (grid: Grid, targetSum: number = 10): Solution[] => {
  const solutions: Solution[] = [];
  const rows = grid.length;
  if (rows === 0) return [];
  const cols = grid[0].length;
  const generateId = (r1: number, c1: number, r2: number, c2: number) => `${r1}-${c1}:${r2}-${c2}`;

  for (let r1 = 0; r1 < rows; r1++) {
    for (let c1 = 0; c1 < cols; c1++) {
      if (grid[r1][c1] === 0 || grid[r1][c1] > targetSum) continue;

      for (let r2 = r1; r2 < rows; r2++) {
        for (let c2 = c1; c2 < cols; c2++) {
          if (grid[r2][c2] === 0) continue;

          let currentSum = 0;
          let valid = true;
          const cells = [];
          
          for (let i = r1; i <= r2; i++) {
            for (let j = c1; j <= c2; j++) {
              const val = grid[i][j];
              currentSum += val;
              cells.push({ row: i, col: j });
              if (currentSum > targetSum) {
                valid = false;
                break;
              }
            }
            if (!valid) break;
          }

          if (valid && currentSum === targetSum) {
            solutions.push({
              id: generateId(r1, c1, r2, c2),
              start: { row: r1, col: c1 },
              end: { row: r2, col: c2 },
              sum: currentSum,
              cells: cells
            });
          }
        }
      }
    }
  }
  return solutions;
};