import React, { useState, useEffect } from 'react';
import moment from 'moment';
// ייבוא לוקאל עברית כבר קיים בקובץ הראשי
import { CalendarEvent } from '../types/event';
import { useEventStore } from '../store/eventStore';
import { getAllHolidays } from '../utils/israeliHolidays';
import { Star } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

// CSS styles for holiday events in the list
const holidayListStyles = `
  .holiday-event {
    background-color: rgba(251, 191, 36, 0.2) !important;
    border-color: #F59E0B !important;
    border-width: 2px !important;
    box-shadow: 0 0 5px rgba(245, 158, 11, 0.5) !important;
    position: relative;
    overflow: hidden;
  }
  
  .holiday-event::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 20px 20px 0;
    border-color: transparent #F59E0B transparent transparent;
    z-index: 1;
  }
  
  .holiday-event h3 {
    color: #000000 !important;
    font-weight: bold;
    font-size: 1.1rem;
  }
  
  .holiday-event p {
    color: #000000 !important;
  }
`;

interface ListViewProps {
  onEventSelect: (event: CalendarEvent) => void;
}

const ListView: React.FC<ListViewProps> = ({ onEventSelect }) => {
  // הגדרת השפה העברית כבר קיימת בקובץ הראשי
  
  const { calendarEvents, selectedDate, showHolidays } = useEventStore();
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const israeliHolidays = getAllHolidays();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
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
        // אירועים מתמשכים תמיד יוצגו בכל יום
        if (event.event_type === 'continuous') {
          return true;
        }
        
        // חגים תמיד יוצגו
        if (event.extendedProps?.type === 'holiday' || event.extendedProps?.type === 'memorial') {
          // אבל רק אם הם בשבוע הנוכחי
          const startOfWeek = moment(selectedDate).startOf('week');
          const endOfWeek = moment(startOfWeek).add(6, 'days').endOf('day');
          return eventStart.isBetween(startOfWeek, endOfWeek, 'day', '[]');
        }
        
        // אירועים רגילים יוצגו רק אם הם ביום הנבחר
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
  
  // הוספת הסגנון לתוך ה-DOM
  useEffect(() => {
    // בדוק אם הסגנון כבר קיים
    const styleId = 'holiday-list-styles';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.innerHTML = holidayListStyles;
      document.head.appendChild(styleElement);
      
      // ניקוי בעת פירוק הקומפוננטה
      return () => {
        const element = document.getElementById(styleId);
        if (element) {
          element.remove();
        }
      };
    }
  }, []);
  
  // Generate array of days for the current week
  const daysInWeek = Array.from({ length: 7 }, (_, i) => {
    // הגדרת השפה העברית לכל אובייקט יום
    return moment(selectedDate).startOf('week').add(i, 'days').locale('he');
  });
  
  // מערך שמות הימים בעברית
  const hebrewDayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const hebrewDayNamesShort = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\''];
  
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
    // אם זה חג, הצג "חג/מועד" או "יום זיכרון"
    if (event.extendedProps?.type === 'holiday') {
      return 'חג/מועד';
    } else if (event.extendedProps?.type === 'memorial') {
      return 'יום זיכרון';
    }
    
    // אם זה אירוע מתמשך, הצג "מתמשך"
    if (event.event_type === 'continuous') {
      return 'מתמשך';
    }
    
    // אם זה אירוע יום מלא, הצג "יום מלא"
    if (event.event_type === 'full_day') {
      return 'יום מלא';
    }
    
    // אם יש שעת התחלה, הצג אותה
    if (event.start_time) {
      return `${event.start_time}${event.end_time ? ` - ${event.end_time}` : ''}`;
    }
    
    // אם אין שעת התחלה אבל יש שעה באובייקט start, הצג אותה
    if (event.start && event.start.getHours() !== 0) {
      const startTime = moment(event.start).format('HH:mm');
      const endTime = event.end ? moment(event.end).format('HH:mm') : '';
      return `${startTime}${endTime ? ` - ${endTime}` : ''}`;
    }
    
    // אחרת, אל תציג שעה
    return '';
  };
  
  // פונקציה לטיפול בלחיצה על אירוע
  const handleEventClick = (event: CalendarEvent) => {
    // דלג על אירועי חג
    if (event.extendedProps?.type === 'holiday' || event.extendedProps?.type === 'memorial') {
      return;
    }
    
    // וודא שהאירוע מכיל את כל המידע הנדרש
    const completeEvent = {
      ...event,
      id: event.id,
      title: event.title,
      details: event.details || '',
      notes: event.notes || '',
      event_type: event.event_type,
      start_date: event.start_date || moment(event.start).format('YYYY-MM-DD'),
      end_date: event.end_date || (event.end ? moment(event.end).format('YYYY-MM-DD') : null),
      start_time: event.start_time,
      end_time: event.end_time,
      color: event.color,
      status: event.status || 'active',
      extendedProps: event.extendedProps || {}
    };
    
    // העבר את האירוע לפונקציית הבחירה
    onEventSelect(completeEvent);
  };
  
  return (
    <div className="p-4 bg-white min-h-screen">
      {/* Add holiday styles */}
      <style>{holidayListStyles}</style>
      
      {/* Day selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={handleWeekViewClick}
          className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap
            ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          כל השבוע
        </button>
        {daysInWeek.map((day, index) => {
          // שימוש בשמות הימים בעברית
          const dayName = hebrewDayNames[day.day()];
          const shortDayName = hebrewDayNamesShort[day.day()];
          const dayNumber = day.format('D/M');
          
          return (
            <button
              key={day.format('YYYY-MM-DD')}
              onClick={() => handleDayClick(day)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap
                ${viewMode === 'day' && selectedDay && moment(selectedDay).isSame(day, 'day')
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {isMobile ? shortDayName : dayName} {dayNumber}
            </button>
          );
        })}
      </div>
      
      {/* Events list */}
      <div className="bg-white rounded-lg shadow-sm border p-4 min-h-[calc(100vh-12rem)]">
        {viewMode === 'day' ? (
          // Day view - simple list of events
          <div className="space-y-4">
            {selectedDay && (
              <h2 className="text-lg font-bold mb-4 pb-2 border-b text-right">
                {hebrewDayNames[moment(selectedDay).day()]}, {moment(selectedDay).format('D/M/YYYY')}
                {!isMobile && viewMode === 'day' && (
                  <span className="text-sm font-normal text-gray-500 mr-2">
                    (מציג גם אירועים מתמשכים וחגים מהשבוע)
                  </span>
                )}
              </h2>
            )}
            
            {filteredEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                אין אירועים ביום זה
              </div>
            ) : (
              filteredEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                  style={{
                    borderColor: event.extendedProps?.type === 'holiday' ? '#F59E0B' : 
                                event.event_type === 'continuous' ? '#EF4444' : event.color,
                    backgroundColor: event.extendedProps?.type === 'holiday' ? '#FEF3C7' : 
                                    event.event_type === 'continuous' ? '#FEF2F2' : `${event.color}10`,
                  }}
                >
                  <div className={`flex ${isMobile ? 'flex-col' : 'justify-between'} items-start text-right`}>
                    <div className={isMobile ? 'w-full' : 'flex-1'}>
                      <h3 className="text-lg font-bold mb-2">{event.title}</h3>
                      <p className="text-sm text-gray-600">
                        {formatEventTime(event)}
                      </p>
                      {event.details && !isMobile && (
                        <p className="text-sm text-gray-600 mt-3">{event.details}</p>
                      )}
                    </div>
                    <div className={`text-sm text-gray-500 ${isMobile ? 'mt-3 w-full text-right' : 'mr-4'}`}>
                      {moment(event.start).format('D/M/YYYY')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Week view - events grouped by day
          <div className="space-y-8">
            {daysInWeek.map(day => {
              const dayKey = day.format('YYYY-MM-DD');
              const dayEvents = eventsByDay[dayKey] || [];
              
              return (
                <div key={dayKey} className="border-b pb-6 last:border-b-0">
                  <h2 className="text-lg font-bold mb-4 pb-2 border-b text-right">
                    {hebrewDayNames[day.day()]}, {day.format('D/M/YYYY')}
                  </h2>
                  
                  {dayEvents.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                      אין אירועים ביום זה
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dayEvents.map((event, idx) => (
                        <div 
                          key={`${event.id}-${idx}`}
                          onClick={() => handleEventClick(event)}
                          className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                            event.extendedProps?.type === 'holiday' ? 'holiday-event' : ''
                          }`}
                          style={{ 
                            borderColor: event.extendedProps?.type === 'holiday' ? '#F59E0B' : 
                                        event.event_type === 'continuous' ? '#EF4444' : event.color,
                            backgroundColor: event.extendedProps?.type === 'holiday' ? '#FEF3C7' : 
                                            event.event_type === 'continuous' ? '#FEF2F2' : `${event.color}10`,
                          }}
                        >
                          <div className={`flex ${isMobile ? 'flex-col' : 'justify-between'} items-start text-right`}>
                            <div className={isMobile ? 'w-full' : 'flex-1'}>
                              <h3 className="text-lg font-bold mb-2">{event.title}</h3>
                              <p className="text-sm text-gray-600">
                                {formatEventTime(event)}
                              </p>
                              {event.details && !isMobile && (
                                <p className="text-sm text-gray-600 mt-3">{event.details}</p>
                              )}
                            </div>
                            <div className={`text-sm text-gray-500 ${isMobile ? 'mt-3 w-full text-right' : 'mr-4'}`}>
                              {moment(event.start).format('D/M/YYYY')}
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