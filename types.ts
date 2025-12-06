export interface Coordinate {
  row: number;
  col: number;
}

export interface Solution {
  id: string;
  start: Coordinate;
  end: Coordinate;
  sum: number;
  cells: Coordinate[];
}

export type Grid = number[][];

export enum SolverStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SOLVING = 'SOLVING',
  READY = 'READY',
  ERROR = 'ERROR',
}