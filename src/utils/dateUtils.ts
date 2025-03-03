import moment from 'moment-timezone';
import { Event, CalendarEvent } from '../types/event';

// Set timezone to Israel
moment.tz.setDefault('Asia/Jerusalem');

export const formatDate = (date: string | Date): string => {
  return moment(date).format('DD/MM/YYYY');
};

export const formatTime = (time: string): string => {
  // Assuming time is in HH:mm format
  return time;
};

export const formatDateTime = (date: string, time: string | null): string => {
  if (!time) return formatDate(date);
  return `${formatDate(date)} ${formatTime(time)}`;
};

export const isPastEvent = (event: Event): boolean => {
  const now = moment();
  
  if (event.event_type === 'continuous') {
    return event.status === 'archived';
  }
  
  if (event.event_type === 'full_day') {
    const endDate = event.end_date ? moment(event.end_date) : moment(event.start_date);
    return endDate.isBefore(now, 'day') && !endDate.isSame(now, 'day');
  }
  
  if (event.event_type === 'time_specific' && event.start_time) {
    const startDateTime = moment(`${event.start_date} ${event.start_time}`, 'YYYY-MM-DD HH:mm');
    return startDateTime.isBefore(now);
  }
  
  return false;
};

// Sort events by priority: continuous > full_day > time_specific
export const sortEventsByPriority = (events: CalendarEvent[]): CalendarEvent[] => {
  return [...events].sort((a, b) => {
    // First sort by event type (continuous > full_day > time_specific)
    const typeOrder: Record<string, number> = {
      continuous: 0,
      full_day: 1,
      time_specific: 2
    };
    
    if (typeOrder[a.event_type] !== typeOrder[b.event_type]) {
      return typeOrder[a.event_type] - typeOrder[b.event_type];
    }
    
    // Then sort by time for time_specific events
    if (a.event_type === 'time_specific' && b.event_type === 'time_specific') {
      return moment(a.start).valueOf() - moment(b.start).valueOf();
    }
    
    // Finally sort by title
    return a.title.localeCompare(b.title);
  });
};

export const convertToCalendarEvents = (events: Event[]): CalendarEvent[] => {
  const calendarEvents = events.map(event => {
    let start: Date;
    let end: Date;
    let allDay: boolean = false;
    
    if (event.event_type === 'continuous') {
      // For continuous events, show them on all days from start until end (or forever if no end date)
      start = moment(event.start_date).startOf('day').toDate();
      end = event.end_date 
        ? moment(event.end_date).endOf('day').toDate()
        : moment().add(1, 'year').endOf('day').toDate(); // Show for next year if no end date
      allDay = true;
    } else if (event.event_type === 'full_day') {
      start = moment(event.start_date).startOf('day').toDate();
      end = event.end_date 
        ? moment(event.end_date).endOf('day').toDate()
        : moment(event.start_date).endOf('day').toDate();
      allDay = true;
    } else {
      // time_specific
      if (event.start_time) {
        start = moment(`${event.start_date} ${event.start_time}`, 'YYYY-MM-DD HH:mm').toDate();
      } else {
        start = moment(event.start_date).startOf('day').toDate();
      }
      
      if (event.end_date && event.end_time) {
        end = moment(`${event.end_date} ${event.end_time}`, 'YYYY-MM-DD HH:mm').toDate();
      } else if (event.end_time) {
        end = moment(`${event.start_date} ${event.end_time}`, 'YYYY-MM-DD HH:mm').toDate();
      } else if (event.end_date) {
        end = moment(event.end_date).endOf('day').toDate();
      } else {
        // Default to 1 hour if no end time/date specified
        end = moment(start).add(1, 'hour').toDate();
      }
    }
    
    return {
      id: event.id,
      title: event.title,
      start,
      end,
      allDay,
      color: event.color || (event.event_type === 'continuous' ? '#EF4444' : '#3B82F6'),
      event_type: event.event_type,
      details: event.details,
      notes: event.notes,
      status: event.status,
      priority: event.priority
    };
  });
  
  // Sort events by priority
  return sortEventsByPriority(calendarEvents);
};

export const getIsraeliHolidays = (year: number): CalendarEvent[] => {
  // This is a simplified version - in a real app, you would use a more comprehensive library
  // or API to get the actual Israeli holidays based on the Hebrew calendar
  const holidays: CalendarEvent[] = [
    {
      id: `rosh-hashana-${year}`,
      title: 'ראש השנה',
      start: moment([year, 8, 15]).toDate(), // September 15 (approximate)
      end: moment([year, 8, 17]).toDate(),
      allDay: true,
      color: '#FFD700',
      event_type: 'full_day',
      details: 'ראש השנה',
      notes: null,
      status: 'active'
    }
    // Add more holidays as needed
  ];
  
  return holidays;
};