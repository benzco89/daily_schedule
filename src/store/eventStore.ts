import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Event, CalendarEvent } from '../types/event';
import { convertToCalendarEvents } from '../utils/dateUtils';
import { endOfDay, isBefore, startOfDay } from 'date-fns';
import moment from 'moment-timezone';

interface EventState {
  events: Event[];
  calendarEvents: CalendarEvent[];
  loading: boolean;
  error: string | null;
  currentView: 'month' | 'week' | 'day';
  selectedDate: Date;
  selectedEvent: Event | null;
  showContinuousEvents: boolean;
  showArchivedEvents: boolean;
  showHolidays: boolean;
  
  fetchEvents: () => Promise<void>;
  addEvent: (event: Partial<Event>) => Promise<Event | null>;
  updateEvent: (event: Partial<Event>) => Promise<Event | null>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  archiveEvent: (eventId: string) => Promise<Event | null>;
  archivePastEvents: () => Promise<boolean>;
  setCurrentView: (view: 'month' | 'week' | 'day') => void;
  setSelectedDate: (date: Date) => void;
  setSelectedEvent: (event: Event | null) => void;
  toggleContinuousEvents: () => void;
  toggleArchivedEvents: () => void;
  setShowHolidays: (show: boolean) => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  calendarEvents: [],
  loading: false,
  error: null,
  currentView: 'month',
  selectedDate: new Date(),
  selectedEvent: null,
  showContinuousEvents: true,
  showArchivedEvents: true,
  showHolidays: true,
  
  fetchEvents: async () => {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      
      const { archivePastEvents, showContinuousEvents, showArchivedEvents } = get();
      await archivePastEvents();
      
      const fetchedEvents = events || [];
      let convertedCalendarEvents = convertToCalendarEvents(fetchedEvents);
      
      // Filter based on visibility settings
      if (!showContinuousEvents) {
        convertedCalendarEvents = convertedCalendarEvents.filter(event => event.event_type !== 'continuous');
      }
      if (!showArchivedEvents) {
        convertedCalendarEvents = convertedCalendarEvents.filter(event => event.status !== 'archived');
      }
      
      set({ 
        events: fetchedEvents,
        calendarEvents: convertedCalendarEvents
      });
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  },
  
  addEvent: async (event) => {
    try {
      console.log('Starting addEvent with:', event);
      
      // Validate and set default values for required fields
      const eventToAdd = {
        ...event,
        status: event.status || 'active',
        color: event.color || '#3B82F6',
        start_date: event.start_date || moment().format('YYYY-MM-DD'),
        end_date: event.end_date || event.start_date || moment().format('YYYY-MM-DD'),
        event_type: event.event_type || 'full_day'
      };

      // Handle time fields based on event type
      if (eventToAdd.event_type === 'time_specific') {
        // Format time to HH:mm format
        const formatTime = (time: string | null | undefined) => {
          if (!time) return null;
          
          // Remove any invalid characters
          const cleanTime = time.replace(/[^0-9:]/g, '');
          if (!cleanTime) return null;
          
          try {
            // Split into hours and minutes
            const [hours, minutes] = cleanTime.split(':').map(Number);
            
            // Validate hours and minutes
            if (isNaN(hours) || isNaN(minutes) || 
                hours < 0 || hours > 23 || 
                minutes < 0 || minutes > 59) {
              return null;
            }
            
            // Format to HH:mm
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          } catch {
            return null;
          }
        };

        const startTime = formatTime(event.start_time);
        const endTime = formatTime(event.end_time);

        eventToAdd.start_time = startTime || '00:00';
        eventToAdd.end_time = endTime || '23:59';
      } else {
        // For full_day and continuous events, time should be null
        eventToAdd.start_time = null;
        eventToAdd.end_time = null;
      }
      
      console.log('Processed event to add:', eventToAdd);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Supabase connection status:', await supabase.auth.getSession());
      
      const { data, error } = await supabase
        .from('events')
        .insert([eventToAdd])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
      }
      
      console.log('Event added successfully:', data);
      const { events } = get();
      const updatedEvents = [...events, data];
      const updatedCalendarEvents = convertToCalendarEvents(updatedEvents);
      
      set({ 
        events: updatedEvents,
        calendarEvents: updatedCalendarEvents
      });
      
      return data;
    } catch (error) {
      console.error('Error in addEvent:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return null;
    }
  },
  
  updateEvent: async (event) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(event)
        .eq('id', event.id)
        .select()
        .single();
      
      if (error) throw error;
      
      const { events } = get();
      const updatedEvents = events.map((e) => (e.id === event.id ? data : e));
      const updatedCalendarEvents = convertToCalendarEvents(updatedEvents);
      
      set({
        events: updatedEvents,
        calendarEvents: updatedCalendarEvents
      });
      
      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      return null;
    }
  },
  
  deleteEvent: async (eventId) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      
      const { events } = get();
      const updatedEvents = events.filter((event) => event.id !== eventId);
      const updatedCalendarEvents = convertToCalendarEvents(updatedEvents);
      
      set({
        events: updatedEvents,
        calendarEvents: updatedCalendarEvents
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  },
  
  archiveEvent: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ status: 'archived' })
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      
      const { events } = get();
      const updatedEvents = events.map((e) => (e.id === eventId ? data : e));
      const updatedCalendarEvents = convertToCalendarEvents(updatedEvents);
      
      set({
        events: updatedEvents,
        calendarEvents: updatedCalendarEvents
      });
      
      return data;
    } catch (error) {
      console.error('Error archiving event:', error);
      return null;
    }
  },
  
  archivePastEvents: async () => {
    try {
      const { events } = get();
      const now = moment();
      
      // Find past events that aren't archived
      const pastEvents = events.filter(event => {
        // Skip already archived events
        if (event.status === 'archived') {
          return false;
        }
        
        // Handle continuous events - archive only if they have an end date and it's passed
        if (event.event_type === 'continuous') {
          return event.end_date && moment(event.end_date).endOf('day').isBefore(now);
        }
        
        // For full day events
        if (event.event_type === 'full_day') {
          const endDate = event.end_date || event.start_date;
          return moment(endDate).endOf('day').isBefore(now);
        }
        
        // For time specific events
        const endDate = event.end_date || event.start_date;
        const endTime = event.end_time || '23:59';
        const eventEnd = moment(`${endDate} ${endTime}`, 'YYYY-MM-DD HH:mm');
        
        return eventEnd.isBefore(now);
      });
      
      // Archive each past event
      const { archiveEvent } = get();
      const archivePromises = pastEvents.map(event => archiveEvent(event.id));
      await Promise.all(archivePromises);
      
      return true;
    } catch (error) {
      console.error('Error archiving past events:', error);
      return false;
    }
  },
  
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  toggleContinuousEvents: () => {
    const { showContinuousEvents, events } = get();
    const updatedShowContinuous = !showContinuousEvents;
    let filteredEvents = convertToCalendarEvents(events);

    // Filter out continuous events if they should be hidden
    if (!updatedShowContinuous) {
      filteredEvents = filteredEvents.filter(event => event.event_type !== 'continuous');
    }

    // Apply archived filter if needed
    const { showArchivedEvents } = get();
    if (!showArchivedEvents) {
      filteredEvents = filteredEvents.filter(event => event.status !== 'archived');
    }

    set({ 
      showContinuousEvents: updatedShowContinuous,
      calendarEvents: filteredEvents
    });
  },
  
  toggleArchivedEvents: () => {
    const { showArchivedEvents, events } = get();
    const updatedShowArchived = !showArchivedEvents;
    let filteredEvents = convertToCalendarEvents(events);

    // Filter out archived events if they should be hidden
    if (!updatedShowArchived) {
      filteredEvents = filteredEvents.filter(event => event.status !== 'archived');
    }

    // Apply continuous filter if needed
    const { showContinuousEvents } = get();
    if (!showContinuousEvents) {
      filteredEvents = filteredEvents.filter(event => event.event_type !== 'continuous');
    }

    set({ 
      showArchivedEvents: updatedShowArchived,
      calendarEvents: filteredEvents
    });
  },
  
  setShowHolidays: (show) => set({ showHolidays: show }),
}));