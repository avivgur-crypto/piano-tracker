export type SessionEvent = {
  time_offset_ms: number;
  note: string;
  velocity: number;
  type: string;
};

export type Session = {
  id: number;
  device_id: string;
  student_id: number | null;
  piece_id: number | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  total_notes: number;
  events: SessionEvent[];
  created_at: string;
};
