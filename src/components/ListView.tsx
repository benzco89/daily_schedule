import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Archive } from 'lucide-react';
import { Event } from '../types/event';
import { formatDate, isPastEvent } from '../utils/dateUtils';
import { useEventStore } from '../store/eventStore';

interface ListViewProps {
  onEventSelect: (event: Event) => void;
}

const ListView: React.FC<ListViewProps> = ({ onEventSelect }) => {
  const { events } = useEventStore();
  const [showArchived, setShowArchived] = useState(false);
  
  const filteredEvents = useMemo(() => {
    if (showArchived) {
      return events.filter(event => event.status === 'archived');
    } else {
      return events.filter(event => event.status === 'active');
    }
  }, [events, showArchived]);
  
  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    
    filteredEvents.forEach(event => {
      const dateKey = event.start_date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });
    
    // Sort dates
    return Object.keys(groups)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(date => ({
        date,
        events: groups[date].sort((a, b) => {
          // Sort by event type first (continuous > full_day > time_specific)
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
            if (a.start_time && b.start_time) {
              return a.start_time.localeCompare(b.start_time);
            }
          }
          
          // Finally sort by title
          return a.title.localeCompare(b.title);
        })
      }));
  }, [filteredEvents]);
  
  return (
    <div className="h-full flex flex-col" dir="rtl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 upcoming-events-title">
          {showArchived ? 'אירועים בארכיון' : 'אירועים מתוכננים'}
        </h2>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          <Archive size={16} className="ml-2" />
          {showArchived ? 'הצג אירועים פעילים' : 'הצג ארכיון'}
        </button>
      </div>
      
      <div className="flex-grow overflow-auto">
        {groupedEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow-sm p-6">
            {showArchived ? 'אין אירועים בארכיון' : 'אין אירועים מתוכננים'}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedEvents.map(group => (
              <div key={group.date} className="upcoming-events">
                <div className="flex items-center mb-3">
                  <Calendar size={20} className="text-blue-500 ml-2" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    {formatDate(group.date)}
                  </h3>
                </div>
                
                <div className="space-y-3">
                  {group.events.map(event => (
                    <div 
                      key={event.id}
                      className="event-card"
                      style={{ borderRightColor: event.event_type === 'continuous' ? '#EF4444' : event.color }}
                      onClick={() => onEventSelect(event)}
                    >
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <h4 className="event-title">{event.title}</h4>
                          {event.event_type === 'time_specific' && event.start_time && (
                            <div className="flex items-center text-sm event-time">
                              <Clock size={14} className="ml-1" />
                              <span>{event.start_time}</span>
                            </div>
                          )}
                        </div>
                        
                        {event.details && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {event.details}
                          </p>
                        )}
                        
                        <div className="flex items-center mt-2">
                          <span 
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{ 
                              backgroundColor: event.event_type === 'continuous' ? '#EF4444' : event.color,
                              color: ['#FFFFFF', '#FFFF00'].includes(event.color) && event.event_type !== 'continuous' ? '#000000' : '#FFFFFF'
                            }}
                          >
                            {event.event_type === 'continuous' && 'מתמשך'}
                            {event.event_type === 'full_day' && 'יום מלא'}
                            {event.event_type === 'time_specific' && 'שעה מוגדרת'}
                          </span>
                          
                          {event.end_date && event.end_date !== event.start_date && (
                            <span className="text-xs text-gray-500 mr-2">
                              עד {formatDate(event.end_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="event-status" 
                        style={{ backgroundColor: event.status === 'archived' ? '#9CA3AF' : '#10B981' }}>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListView;