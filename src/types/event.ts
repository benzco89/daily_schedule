export type EventType = 'continuous' | 'full_day' | 'time_specific';
export type EventStatus = 'active' | 'archived';

export interface Event {
  id: string;
  created_at: string;
  title: string;
  details: string | null;
  notes: string | null;
  event_type: EventType;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  color: string;
  status: EventStatus;
  user_id: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  event_type: EventType;
  details: string | null;
  notes: string | null;
  status: EventStatus;
}