export interface Pair{
  board: string;
  devs: string[];
  recurrences?: number;
  daysSinceLastRecurrence?: number;
  sticking?: boolean;
}

export interface PairsCombination{
  pairs: Pair[];
  score?: number;
}
