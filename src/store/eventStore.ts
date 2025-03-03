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
  showArchivedEvents: false,
  
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
      const { data, error } = await supabase
        .from('events')
        .insert([event])
        .select()
        .single();
      
      if (error) throw error;
      
      const { events } = get();
      const updatedEvents = [...events, data];
      const updatedCalendarEvents = convertToCalendarEvents(updatedEvents);
      
      set({ 
        events: updatedEvents,
        calendarEvents: updatedCalendarEvents
      });
      
      return data;
    } catch (error) {
      console.error('Error adding event:', error);
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
    const updatedCalendarEvents = convertToCalendarEvents(events).filter(event => {
      if (!showContinuousEvents && event.event_type === 'continuous') {
        return true;
      }
      if (showContinuousEvents && event.event_type === 'continuous') {
        return false;
      }
      return true;
    });
    set({ 
      showContinuousEvents: !showContinuousEvents,
      calendarEvents: updatedCalendarEvents
    });
  },
  
  toggleArchivedEvents: () => {
    const { showArchivedEvents, events } = get();
    const updatedCalendarEvents = convertToCalendarEvents(events).filter(event => {
      if (!showArchivedEvents && event.status === 'archived') {
        return true;
      }
      if (showArchivedEvents && event.status === 'archived') {
        return false;
      }
      return true;
    });
    set({ 
      showArchivedEvents: !showArchivedEvents,
      calendarEvents: updatedCalendarEvents
    });
  },
}));