export type SessionEvent = {
  time_offset_ms: number;
  note: string;
  velocity: number;
  type: string;
};

export type Session = {
  id: number;
  device_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  total_notes: number;
  events: SessionEvent[];
  created_at: string;
};
