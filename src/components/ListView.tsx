import React, { useState, useEffect } from 'react';
import moment from 'moment-timezone';
import { CalendarEvent } from '../types/event';
import { useEventStore } from '../store/eventStore';
import { getAllHolidays } from '../utils/israeliHolidays';

interface ListViewProps {
  onEventSelect: (event: CalendarEvent) => void;
}

const ListView: React.FC<ListViewProps> = ({ onEventSelect }) => {
  const { calendarEvents, selectedDate, showHolidays } = useEventStore();
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const israeliHolidays = getAllHolidays();
  
  useEffect(() => {
    // Get start of current week (Sunday)
    const startOfWeek = moment(selectedDate).startOf('week');
    const endOfWeek = moment(startOfWeek).add(6, 'days').endOf('day');
    
    // Filter events based on view mode and selected day
    let events = [...calendarEvents];
    
    // Add holidays if enabled
    if (showHolidays) {
      events = [...events, ...israeliHolidays];
    }
    
    const filtered = events.filter(event => {
      const eventStart = moment(event.start);
      const eventEnd = moment(event.end);
      
      // If day view is selected
      if (viewMode === 'day' && selectedDay) {
        return eventStart.isSame(selectedDay, 'day') || 
               eventEnd.isSame(selectedDay, 'day') ||
               (eventStart.isBefore(selectedDay, 'day') && eventEnd.isAfter(selectedDay, 'day'));
      }
      
      // Week view - show all events for the current week
      return (
        // Event starts within this week
        (eventStart.isBetween(startOfWeek, endOfWeek, 'day', '[]')) ||
        // Event ends within this week
        (eventEnd.isBetween(startOfWeek, endOfWeek, 'day', '[]')) ||
        // Event spans over this week
        (eventStart.isSameOrBefore(startOfWeek) && eventEnd.isSameOrAfter(endOfWeek)) ||
        // Continuous events that are active
        (event.event_type === 'continuous' && (!event.end || moment(event.end).isAfter(startOfWeek)))
      );
    });
    
    // Sort events by day and then by start time
    const sortedEvents = filtered.sort((a, b) => {
      // First sort by day
      const dayDiff = moment(a.start).startOf('day').valueOf() - moment(b.start).startOf('day').valueOf();
      if (dayDiff !== 0) return dayDiff;
      
      // Then sort by event type (continuous first, then full day, then time specific)
      const typeOrder = { continuous: 0, full_day: 1, time_specific: 2 };
      const typeA = a.event_type || 'time_specific';
      const typeB = b.event_type || 'time_specific';
      
      if (typeA !== typeB) {
        return (typeOrder[typeA] || 2) - (typeOrder[typeB] || 2);
      }
      
      // Finally sort by start time for time specific events
      return moment(a.start).valueOf() - moment(b.start).valueOf();
    });
    
    setFilteredEvents(sortedEvents);
  }, [calendarEvents, selectedDay, selectedDate, viewMode, showHolidays, israeliHolidays]);
  
  // Generate array of days for the current week
  const daysInWeek = Array.from({ length: 7 }, (_, i) => {
    return moment(selectedDate).startOf('week').add(i, 'days');
  });
  
  // Group events by day for week view
  const eventsByDay = daysInWeek.reduce((acc, day) => {
    const dayKey = day.format('YYYY-MM-DD');
    acc[dayKey] = [];
    return acc;
  }, {} as Record<string, CalendarEvent[]>);
  
  // Populate events for each day, handling continuous events to appear on each day they span
  filteredEvents.forEach(event => {
    const eventStart = moment(event.start);
    const eventEnd = event.end ? moment(event.end) : moment().add(100, 'years'); // Far future for ongoing events
    
    // For each day in the week
    daysInWeek.forEach(day => {
      const dayKey = day.format('YYYY-MM-DD');
      const dayStart = moment(day).startOf('day');
      const dayEnd = moment(day).endOf('day');
      
      // Check if the event occurs on this day
      const isOnThisDay = (
        // Event starts on this day
        eventStart.isBetween(dayStart, dayEnd, 'day', '[]') ||
        // Event ends on this day
        eventEnd.isBetween(dayStart, dayEnd, 'day', '[]') ||
        // Event spans over this day
        (eventStart.isBefore(dayStart) && eventEnd.isAfter(dayEnd)) ||
        // Continuous events
        (event.event_type === 'continuous' && eventStart.isSameOrBefore(dayEnd))
      );
      
      if (isOnThisDay) {
        eventsByDay[dayKey].push(event);
      }
    });
  });
  
  // Sort events within each day
  Object.keys(eventsByDay).forEach(dayKey => {
    eventsByDay[dayKey].sort((a, b) => {
      // Sort by event type first
      const typeOrder = { continuous: 0, full_day: 1, time_specific: 2, holiday: -1 };
      const typeA = a.extendedProps?.type === 'holiday' ? 'holiday' : a.event_type || 'time_specific';
      const typeB = b.extendedProps?.type === 'holiday' ? 'holiday' : b.event_type || 'time_specific';
      
      if (typeA !== typeB) {
        return (typeOrder[typeA] || 2) - (typeOrder[typeB] || 2);
      }
      
      // Then by start time
      return moment(a.start).valueOf() - moment(b.start).valueOf();
    });
  });
  
  const handleDayClick = (day: moment.Moment) => {
    setSelectedDay(day.toDate());
    setViewMode('day');
  };
  
  const handleWeekViewClick = () => {
    setSelectedDay(null);
    setViewMode('week');
  };
  
  const formatEventTime = (event: CalendarEvent) => {
    if (event.event_type === 'continuous') return 'מתמשך';
    if (event.event_type === 'full_day') return 'כל היום';
    if (event.extendedProps?.type === 'holiday') return 'חג/מועד';
    return event.start_time ? `${event.start_time}${event.end_time ? ` - ${event.end_time}` : ''}` : '';
  };
  
  return (
    <div className="p-4 bg-white min-h-screen">
      {/* Day selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={handleWeekViewClick}
          className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap
            ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          כל השבוע
        </button>
        {daysInWeek.map(day => (
          <button
            key={day.format('YYYY-MM-DD')}
            onClick={() => handleDayClick(day)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap
              ${viewMode === 'day' && selectedDay && moment(selectedDay).isSame(day, 'day')
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {day.format('dddd')} {day.format('D/M')}
          </button>
        ))}
      </div>
      
      {/* Events list */}
      <div className="bg-white rounded-lg shadow-sm border p-4 min-h-[calc(100vh-12rem)]">
        {viewMode === 'day' ? (
          // Day view - simple list of events
          <div className="space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                אין אירועים ביום זה
              </div>
            ) : (
              filteredEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => onEventSelect(event)}
                  className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                  style={{
                    borderColor: event.extendedProps?.type === 'holiday' ? '#F59E0B' : 
                                event.event_type === 'continuous' ? '#EF4444' : event.color,
                    backgroundColor: event.extendedProps?.type === 'holiday' ? '#FEF3C7' : 
                                    event.event_type === 'continuous' ? '#FEF2F2' : `${event.color}10`,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold mb-1">{event.title}</h3>
                      <p className="text-sm text-gray-600">
                        {formatEventTime(event)}
                      </p>
                      {event.details && (
                        <p className="text-sm text-gray-600 mt-2">{event.details}</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {moment(event.start).format('D/M/YYYY')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Week view - events grouped by day
          <div className="space-y-6">
            {daysInWeek.map(day => {
              const dayKey = day.format('YYYY-MM-DD');
              const dayEvents = eventsByDay[dayKey] || [];
              
              return (
                <div key={dayKey} className="border-b pb-4 last:border-b-0">
                  <h2 className="text-lg font-bold mb-3 pb-2 border-b">
                    {day.format('dddd')}, {day.format('D/M/YYYY')}
                  </h2>
                  
                  {dayEvents.length === 0 ? (
                    <div className="text-center text-gray-500 py-2">
                      אין אירועים ביום זה
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayEvents.map((event, idx) => (
                        <div
                          key={`${event.id}-${idx}`}
                          onClick={() => onEventSelect(event)}
                          className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                          style={{
                            borderColor: event.extendedProps?.type === 'holiday' ? '#F59E0B' : 
                                        event.event_type === 'continuous' ? '#EF4444' : event.color,
                            backgroundColor: event.extendedProps?.type === 'holiday' ? '#FEF3C7' : 
                                            event.event_type === 'continuous' ? '#FEF2F2' : `${event.color}10`,
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-base font-bold">{event.title}</h3>
                              <p className="text-sm text-gray-600">
                                {formatEventTime(event)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListView;