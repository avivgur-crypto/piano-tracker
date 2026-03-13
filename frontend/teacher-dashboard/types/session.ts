export type SessionEvent = {
  time_offset_ms?: number;
  note?: string;
  velocity?: number;
  type: string;
  /** Sustain pedal: 0 = OFF, >0 (e.g. 127) = ON. Present when type === "sustain". */
  time?: number;
  value?: number;
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
