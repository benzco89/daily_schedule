import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment-timezone';
import 'moment/locale/he';
import { CalendarEvent } from '../types/event';
import { useEventStore } from '../store/eventStore';
import { getIsraeliHolidays, sortEventsByPriority } from '../utils/dateUtils';
import WeeklyReport from './WeeklyReport';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Set timezone to Israel
moment.tz.setDefault('Asia/Jerusalem');

// Setup moment locale with proper Hebrew configuration
moment.locale('he', {
  months: 'ינואר_פברואר_מרץ_אפריל_מאי_יוני_יולי_אוגוסט_ספטמבר_אוקטובר_נובמבר_דצמבר'.split('_'),
  monthsShort: 'ינו׳_פבר׳_מרץ_אפר׳_מאי_יוני_יולי_אוג׳_ספט׳_אוק׳_נוב׳_דצמ׳'.split('_'),
  weekdays: 'ראשון_שני_שלישי_רביעי_חמישי_שישי_שבת'.split('_'),
  weekdaysShort: 'א׳_ב׳_ג׳_ד׳_ה׳_ו׳_ש׳'.split('_'),
  weekdaysMin: 'א_ב_ג_ד_ה_ו_ש'.split('_'),
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'DD/MM/YYYY',
    LL: 'D [ב]MMMM YYYY',
    LLL: 'D [ב]MMMM YYYY HH:mm',
    LLLL: 'dddd, D [ב]MMMM YYYY HH:mm',
  },
  calendar: {
    sameDay: '[היום ב־]LT',
    nextDay: '[מחר ב־]LT',
    nextWeek: 'dddd [ב־]LT',
    lastDay: '[אתמול ב־]LT',
    lastWeek: '[ביום] dddd [האחרון ב־]LT',
    sameElse: 'L',
  },
  relativeTime: {
    future: 'בעוד %s',
    past: 'לפני %s',
    s: 'מספר שניות',
    ss: '%d שניות',
    m: 'דקה',
    mm: '%d דקות',
    h: 'שעה',
    hh: '%d שעות',
    d: 'יום',
    dd: '%d ימים',
    M: 'חודש',
    MM: '%d חודשים',
    y: 'שנה',
    yy: '%d שנים',
  },
  week: {
    dow: 0, // Sunday is the first day of the week
    doy: 6, // The week that contains Jan 1st is the first week of the year
  },
});

const localizer = momentLocalizer(moment);

// Custom event component to control display order
const CustomEvent = ({ event }: { event: CalendarEvent }) => {
  return (
    <div className="rbc-event-content text-right">
      {event.event_type === 'time_specific' && (
        <span className="text-xs">{moment(event.start).format('HH:mm')} - </span>
      )}
      <span>{event.title}</span>
    </div>
  );
};

// Custom day header component to show only day of week
const CustomDayHeader = ({ date }: { date: Date }) => {
  return (
    <span className="text-sm font-medium">
      {moment(date).format('ddd')}
    </span>
  );
};

// Custom date cell component to show only day number
const CustomDateCell = ({ value, children }: { value: Date, children: React.ReactNode }) => {
  // Extract only the day component from the date
  const day = moment(value).format('D');
  
  return (
    <div className="rbc-custom-date-cell">
      {/* Render only the day number */}
      <span className="text-sm font-medium">{day}</span>
      {/* Render children (events) */}
      <div className="rbc-events-container">
        {children}
      </div>
    </div>
  );
};

interface CalendarViewProps {
  onEventSelect: (event: CalendarEvent) => void;
  onAddEvent: (start: Date, end: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onEventSelect, onAddEvent }) => {
  const { 
    calendarEvents, 
    currentView, 
    selectedDate,
    showContinuousEvents,
    showArchivedEvents,
    setCurrentView, 
    setSelectedDate,
    toggleContinuousEvents,
    toggleArchivedEvents
  } = useEventStore();
  const [combinedEvents, setCombinedEvents] = useState<CalendarEvent[]>([]);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  
  useEffect(() => {
    // Combine user events with Israeli holidays and sort by priority
    const holidays = getIsraeliHolidays(selectedDate.getFullYear());
    const allEvents = [...calendarEvents, ...holidays];
    setCombinedEvents(sortEventsByPriority(allEvents));
  }, [calendarEvents, selectedDate]);
  
  // Custom event styling
  const eventStyleGetter = (event: CalendarEvent) => {
    // Always make continuous events red regardless of their set color
    if (event.event_type === 'continuous') {
      return {
        style: {
          backgroundColor: '#EF4444', // Red for continuous events
          borderRadius: '4px',
          opacity: event.status === 'archived' ? 0.6 : 1,
          color: '#FFFFFF',
          border: '0',
          display: 'block',
          fontWeight: 'bold',
          textAlign: 'right', // Right align text
          padding: '2px 4px',
        }
      };
    }
    
    // For other event types
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '4px',
        opacity: event.status === 'archived' ? 0.6 : 1,
        color: ['#FFFFFF', '#FFFF00'].includes(event.color) ? '#000000' : '#FFFFFF',
        border: '0',
        display: 'block',
        textAlign: 'right', // Right align text
        padding: '2px 4px',
      }
    };
  };
  
  // Handle view change
  const handleViewChange = (view: string) => {
    setCurrentView(view as 'month' | 'week' | 'day');
  };
  
  // Handle date change
  const handleNavigate = (date: Date) => {
    setSelectedDate(date);
  };
  
  // Handle event selection
  const handleSelectEvent = (event: CalendarEvent) => {
    onEventSelect(event);
  };
  
  // Handle slot selection (for adding new events)
  const handleSelectSlot = ({ start, end }: { start: Date, end: Date }) => {
    onAddEvent(start, end);
  };
  
  // Handle print
  const handlePrint = () => {
    window.print();
  };
  
  // Custom day formatting for Hebrew
  const formats = {
    dateFormat: 'D', // Show only day number
    dayFormat: 'ddd', // Show only day name without date
    monthHeaderFormat: 'MMMM YYYY',
    dayHeaderFormat: 'dddd', // Show only day name in day view
    dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }) => 
      `${moment(start).format('DD/MM')} - ${moment(end).format('DD/MM')}`,
    agendaDateFormat: 'DD/MM/YYYY',
    agendaTimeFormat: 'HH:mm',
    agendaTimeRangeFormat: ({ start, end }: { start: Date, end: Date }) => 
      `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
  };
  
  // Custom components
  const components = {
    event: CustomEvent,
    day: {
      header: CustomDayHeader
    },
    dateCell: CustomDateCell
  };
  
  const CustomToolbar = (toolbar: any) => {
    const goToToday = () => {
      toolbar.onNavigate('TODAY');
    };

    const goToPrev = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const showReport = () => {
      setSelectedDate(toolbar.date);
      setShowWeeklyReport(true);
    };

    return (
      <div className="rbc-toolbar">
        <span className="rbc-btn-group">
          <button type="button" onClick={goToToday}>
            היום
          </button>
          <button type="button" onClick={goToPrev}>
            הקודם
          </button>
          <button type="button" onClick={goToNext}>
            הבא
          </button>
        </span>
        <span className="rbc-toolbar-label">{toolbar.label}</span>
        <span className="rbc-btn-group">
          <button type="button" onClick={showReport}>
            דוח שבועי
          </button>
        </span>
      </div>
    );
  };
  
  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 px-4">
          <div className="flex space-x-4 space-x-reverse">
            <button
              onClick={toggleContinuousEvents}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${showContinuousEvents 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              {showContinuousEvents ? 'הסתר אירועים מתמשכים' : 'הצג אירועים מתמשכים'}
            </button>
            <button
              onClick={toggleArchivedEvents}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${showArchivedEvents 
                  ? 'bg-gray-500 text-white hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              {showArchivedEvents ? 'הסתר אירועים בארכיון' : 'הצג אירועים בארכיון'}
            </button>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => handleViewChange('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${currentView === 'month' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-200'}`}
              >
                חודשי
              </button>
              <button
                onClick={() => handleViewChange('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${currentView === 'week' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-200'}`}
              >
                שבועי
              </button>
              <button
                onClick={() => handleViewChange('day')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${currentView === 'day' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-200'}`}
              >
                יומי
              </button>
            </div>
            
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              הדפס
            </button>
          </div>
        </div>
        
        <div className={`flex-1 ${(currentView === 'week' || currentView === 'day') ? 'max-h-[600px] overflow-y-auto' : ''}`}>
          <Calendar
            localizer={localizer}
            events={combinedEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: currentView === 'month' ? '100%' : '600px' }}
            views={['month', 'week', 'day']}
            view={currentView}
            date={selectedDate}
            onView={handleViewChange}
            onNavigate={handleNavigate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable={true}
            eventPropGetter={eventStyleGetter}
            rtl={true}
            culture="he"
            formats={formats}
            components={{
              ...components,
              toolbar: CustomToolbar,
            }}
            popup={true}
            showMultiDayTimes={true}
            min={new Date(1972, 0, 1, 0, 0, 0)}
            max={new Date(1972, 0, 1, 23, 59, 59)}
            messages={{
              allDay: 'כל היום',
              previous: 'הקודם',
              next: 'הבא',
              today: 'היום',
              month: 'חודש',
              week: 'שבוע',
              day: 'יום',
              agenda: 'סדר יום',
              date: 'תאריך',
              time: 'שעה',
              event: 'אירוע',
              noEventsInRange: 'אין אירועים בטווח זה',
            }}
          />
        </div>
      </div>
      {showWeeklyReport && (
        <WeeklyReport
          events={combinedEvents.map(event => ({
            id: event.id,
            title: event.title,
            description: event.description,
            start_date: moment(event.start).format('YYYY-MM-DD'),
            end_date: moment(event.end).format('YYYY-MM-DD'),
            start_time: moment(event.start).format('HH:mm'),
            end_time: moment(event.end).format('HH:mm'),
            event_type: event.event_type || 'time_specific',
            color: event.color || '#3B82F6',
            status: event.status,
            priority: event.priority
          }))}
          selectedDate={selectedDate}
          onClose={() => setShowWeeklyReport(false)}
        />
      )}
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .calendar-container,
          .calendar-container * {
            visibility: visible;
          }
          .calendar-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        
        /* RTL fixes for react-big-calendar */
        .rbc-btn-group {
          direction: ltr;
        }
        
        .rbc-header {
          text-align: center;
          font-weight: bold;
          padding: 8px 4px;
        }
        
        .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
          text-align: right;
        }
        
        /* Improved calendar styling */
        .rbc-calendar {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .rbc-month-view {
          border-radius: 8px;
          overflow: hidden;
        }
        
        .rbc-day-bg {
          transition: background-color 0.2s;
        }
        
        .rbc-day-bg:hover {
          background-color: rgba(59, 130, 246, 0.05);
        }
        
        .rbc-off-range-bg {
          background-color: #f9fafb;
        }
        
        .rbc-today {
          background-color: rgba(59, 130, 246, 0.1);
        }
        
        .rbc-event {
          border-radius: 4px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          padding: 2px 5px !important;
          font-size: 0.85rem;
        }
        
        .rbc-toolbar button {
          color: #4b5563;
          border-radius: 4px;
        }
        
        .rbc-toolbar button.rbc-active {
          background-color: #3b82f6;
          color: white;
        }
        
        /* Compact view for days */
        .rbc-date-cell {
          padding: 4px;
          text-align: center;
        }
        
        /* Better styling for month view */
        .rbc-month-row {
          overflow: visible;
        }
        
        .rbc-row-content {
          margin-top: 4px;
        }
        
        /* Highlight current day */
        .rbc-date-cell.rbc-now {
          font-weight: bold;
        }
        
        /* Fix for RTL month view */
        .rbc-month-view .rbc-header {
          text-align: center;
        }
        
        /* Fix for RTL week view */
        .rbc-time-view .rbc-header {
          text-align: center;
        }
        
        /* Fix for RTL day view */
        .rbc-time-view .rbc-label {
          text-align: right;
          padding-right: 8px;
        }
        
        /* Fix for RTL agenda view */
        .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
          text-align: right;
        }
        
        /* Ensure continuous events are always displayed first */
        .rbc-events-container {
          display: flex;
          flex-direction: column;
        }
        
        /* Hide full date in day view headers */
        .rbc-time-header-content .rbc-header {
          font-size: 1rem;
        }
        
        /* Make continuous events stand out more */
        .rbc-event[style*="background-color: rgb(239, 68, 68)"] {
          border-left: 3px solid #d32f2f !important;
        }
      `}</style>
    </>
  );
};

export default CalendarView;