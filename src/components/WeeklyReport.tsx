import React from 'react';
import moment from 'moment-timezone';
import { Event } from '../types/event';

interface WeeklyReportProps {
  events: Event[];
  selectedDate: Date;
  onClose: () => void;
}

const WeeklyReport: React.FC<WeeklyReportProps> = ({ events, selectedDate, onClose }) => {
  const startOfWeek = moment(selectedDate).startOf('week');
  const daysInWeek = Array.from({ length: 7 }, (_, i) => moment(startOfWeek).add(i, 'days'));
  
  const getEventsForDay = (date: moment.Moment) => {
    return events.filter(event => {
      const eventStart = moment(event.start_date);
      const eventEnd = event.end_date ? moment(event.end_date) : eventStart;
      
      return (
        (event.event_type === 'continuous' && eventStart.isSameOrBefore(date, 'day') && (!event.end_date || moment(event.end_date).isSameOrAfter(date, 'day'))) ||
        (eventStart.isSame(date, 'day') || (eventEnd && eventStart.isSameOrBefore(date, 'day') && eventEnd.isSameOrAfter(date, 'day')))
      );
    }).sort((a, b) => {
      const typeOrder = { continuous: 0, full_day: 1, time_specific: 2 };
      if (a.event_type !== b.event_type) {
        return typeOrder[a.event_type] - typeOrder[b.event_type];
      }
      if (a.event_type === 'time_specific' && a.start_time && b.start_time) {
        return a.start_time.localeCompare(b.start_time);
      }
      return 0;
    });
  };
  
  const formatEventTime = (event: Event) => {
    if (event.event_type === 'continuous') return 'מתמשך';
    if (event.event_type === 'full_day') return 'כל היום';
    return event.start_time ? `${event.start_time}${event.end_time ? ` - ${event.end_time}` : ''}` : '';
  };
  
  const getEventStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'פעיל';
      case 'archived': return 'בארכיון';
      case 'completed': return 'הושלם';
      default: return status;
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:inset-auto z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[1200px] max-h-[90vh] overflow-y-auto print:shadow-none print:max-h-none print:overflow-visible">
        <div className="p-6 print:p-2">
          <div className="flex justify-between items-center mb-6 print:mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              דוח שבועי: {startOfWeek.format('DD/MM/YYYY')} - {moment(startOfWeek).add(6, 'days').format('DD/MM/YYYY')}
            </h2>
            <div className="space-x-2 space-x-reverse print:hidden">
              <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                הדפס
              </button>
              <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                סגור
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {/* Header row with days */}
            {daysInWeek.map(day => (
              <div key={day.format('YYYY-MM-DD')} className="text-center p-2 bg-gray-100 font-semibold rounded-t-lg print:break-inside-avoid">
                {day.format('dddd')}
                <div className="text-sm text-gray-600">{day.format('DD/MM')}</div>
              </div>
            ))}
            
            {/* Events grid */}
            {daysInWeek.map(day => {
              const dayEvents = getEventsForDay(day);
              return (
                <div key={day.format('YYYY-MM-DD')} className="min-h-[500px] p-1 border rounded-b-lg print:break-inside-avoid">
                  <div className="space-y-1">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        className={`p-2 rounded text-sm ${
                          event.event_type === 'continuous' 
                            ? 'bg-red-50 border-r-2 border-red-500'
                            : 'bg-gray-50 border-r-2'
                        }`}
                        style={{ borderRightColor: event.event_type === 'continuous' ? '#EF4444' : event.color }}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-xs text-gray-600">{formatEventTime(event)}</div>
                        {event.details && (
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2">{event.details}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          
          body {
            font-size: 9pt;
          }
          
          .print-hidden {
            display: none !important;
          }
          
          h2 {
            font-size: 16pt;
            margin-bottom: 0.5cm;
          }
          
          .grid {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
          }
          
          .min-h-[500px] {
            min-height: auto !important;
            height: auto !important;
          }
          
          /* Ensure content fits on one page */
          .grid-cols-7 > * {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          /* Better contrast for printed text */
          .text-gray-600 {
            color: #444 !important;
          }
          
          /* Ensure borders print well */
          .border {
            border: 1px solid #000 !important;
          }
          
          .border-r-2 {
            border-right-width: 2px !important;
          }
          
          /* Background colors for print */
          .bg-gray-50 {
            background-color: #ffffff !important;
          }
          
          .bg-red-50 {
            background-color: #fff5f5 !important;
          }
          
          .bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WeeklyReport; 