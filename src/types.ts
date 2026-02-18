
export interface Penalty {
  name: string;
  amount: number;
  date: string;
  context?: string;
}

export interface QuestData {
  bounty: number;
  day: number;
  targetDays: number;
  habitName: string;
  penalties: Penalty[];
}

export interface UserState {
  uid: string;
  isAnonymous: boolean;
  displayName?: string | null;
}
