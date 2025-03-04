import React, { useState, useEffect, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useEventStore } from '../store/eventStore';
import { CalendarEvent } from '../types/event';
import ListView from './ListView';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Menu, FileText } from 'lucide-react';
import '../styles/calendar.css';
import moment from 'moment';
import { toast } from 'react-toastify';
import EventModal from './EventModal';
import WeeklyReport from './WeeklyReport';
import EventForm from './EventForm';
import { getAllHolidays } from '../utils/israeliHolidays';

interface CalendarViewProps {
  onEventSelect?: (event: CalendarEvent) => void;
  onAddEvent?: (start: Date, end: Date) => void;
  defaultView?: 'timeGridWeek' | 'timeGridDay' | 'dayGridMonth' | 'list';
}

const heLocale = {
  code: 'he',
  direction: 'rtl',
  buttonText: {
    prev: 'הקודם',
    next: 'הבא',
    today: 'היום',
    month: 'חודש',
    week: 'שבוע',
    day: 'יום',
    list: 'רשימה'
  },
  weekText: 'שבוע',
  allDayText: 'כל היום',
  moreLinkText: 'עוד',
  noEventsText: 'אין אירועים להצגה',
  dayHeaderFormat: { weekday: 'short' },
  slotLabelFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  },
  weekTextLong: 'שבוע',
  closeHint: 'סגור',
  timeHint: 'זמן',
  eventHint: 'אירוע',
  weekNumbers: true,
  firstDay: 0,
  weekends: true,
  dayPopoverFormat: { month: 'long', day: 'numeric', year: 'numeric' }
};

const CalendarView: React.FC<CalendarViewProps> = ({ 
  onEventSelect, 
  onAddEvent,
  defaultView = 'timeGridWeek'
}) => {
  const [view, setView] = useState<'timeGridWeek' | 'timeGridDay' | 'dayGridMonth' | 'list'>(defaultView);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { 
    calendarEvents, 
    selectedDate, 
    setSelectedDate, 
    addEvent,
    showContinuousEvents,
    showArchivedEvents,
    toggleContinuousEvents,
    toggleArchivedEvents,
    fetchEvents,
    updateEvent,
    deleteEvent,
    archiveEvent
  } = useEventStore();
  const calendarRef = useRef<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showHolidays, setShowHolidays] = useState(true);
  const israeliHolidays = getAllHolidays();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (isMobile && view !== 'timeGridDay' && view !== 'list') {
      setView('timeGridDay');
    }
  }, [isMobile, view]);
  
  useEffect(() => {
    if (defaultView) {
      setView(defaultView);
      if (calendarRef.current) {
        calendarRef.current.getApi().changeView(defaultView);
      }
    }
  }, [defaultView]);

  const changeView = (newView: typeof view) => {
    setView(newView);
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(newView);
    }
  };

  const handleEventClick = (info: any) => {
    const event = {
      ...info.event.toPlainObject(),
      ...info.event.extendedProps,
      color: info.event.backgroundColor
    };
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDateSelect = async (selectInfo: any) => {
    console.log('handleDateSelect called with:', selectInfo);
    setSelectedDate(selectInfo.start);
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // clear date selection

    const title = prompt('כותרת האירוע:');
    console.log('Event title:', title);
    
    if (!title) {
      toast.info('הוספת האירוע בוטלה');
      return;
    }

    try {
      const event = {
        title,
        details: null,
        notes: null,
        event_type: 'time_specific' as const,
        start_date: moment(selectInfo.start).format('YYYY-MM-DD'),
        end_date: moment(selectInfo.end).format('YYYY-MM-DD'),
        start_time: moment(selectInfo.start).format('HH:mm'),
        end_time: moment(selectInfo.end).format('HH:mm'),
        color: '#3B82F6',
        status: 'active' as const,
        user_id: null
      };
      console.log('Attempting to add event:', event);
      
      const result = await addEvent(event);
      console.log('Add event result:', result);
      
      if (result) {
        toast.success('האירוע נוצר בהצלחה');
        await fetchEvents(); // רענון האירועים מיד לאחר ההוספה
      } else {
        toast.error('שגיאה ביצירת האירוע');
      }
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('שגיאה ביצירת האירוע');
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const isMonthView = eventInfo.view.type === 'dayGridMonth';
    
    return (
      <div className={`p-1 ${isMonthView ? 'text-xs' : ''}`}>
        <div className={`${isMonthView ? 'text-xs' : 'text-sm'} font-medium mb-1`}>
          {eventInfo.timeText}
        </div>
        <div className={`${isMonthView ? 'text-xs' : 'text-base'} font-bold truncate`}>
          {eventInfo.event.title}
        </div>
      </div>
    );
  };

  const handleEditEvent = () => {
    if (selectedEvent) {
      setIsEditing(true);
      setShowEventModal(false);
      setShowEventForm(true);
    }
  };

  // Combine user events with holidays if enabled
  const allEvents = useMemo(() => {
    if (showHolidays) {
      return [...calendarEvents, ...israeliHolidays];
    }
    return calendarEvents;
  }, [calendarEvents, israeliHolidays, showHolidays]);
  
  return (
    <div className="h-full flex flex-col">
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setShowMobileMenu(true)}
          className="fixed bottom-4 left-4 z-50 bg-white rounded-full p-2 shadow-lg"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Top Controls - Calendar/List Toggle */}
      <div className="flex flex-col p-4 border-b">
        {/* Main Controls Row - All buttons in one line */}
        <div className="flex flex-wrap items-center gap-2">
          {!isMobile && (
            <>
              <div className="flex rounded-md overflow-hidden border border-gray-200 shadow-sm h-10">
                <button
                  onClick={() => view === 'list' ? changeView(defaultView) : null}
                  className={`px-4 h-full flex items-center ${view !== 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  style={{ borderRadius: '4px 0 0 4px' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 4a1 1 0 011-1h8a1 1 0 011 1v10a1 1 0 01-1 1H6a1 1 0 01-1-1V4zm2 1v8h6V5H7z" clipRule="evenodd" />
                  </svg>
                  לוח
                </button>
                <button
                  onClick={() => view !== 'list' ? changeView('list') : null}
                  className={`px-4 h-full flex items-center ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  style={{ borderRadius: '0 4px 4px 0' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  רשימה
                </button>
              </div>
              
              {/* Calendar View Type Buttons - Moved from below */}
              <button
                onClick={() => changeView('timeGridWeek')}
                className={`h-10 px-3 rounded-md ${view === 'timeGridWeek' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                שבועי
              </button>
              <button
                onClick={() => changeView('timeGridDay')}
                className={`h-10 px-3 rounded-md ${view === 'timeGridDay' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                יומי
              </button>
              <button
                onClick={() => changeView('dayGridMonth')}
                className={`h-10 px-3 rounded-md ${view === 'dayGridMonth' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                חודשי
              </button>
            </>
          )}
          
          {/* Mobile Toggle between Calendar and List View */}
          {isMobile && (
            <div className="flex rounded-md overflow-hidden border border-gray-200 shadow-sm h-8">
              <button
                onClick={() => view === 'list' ? changeView(defaultView) : null}
                className={`px-3 h-full flex items-center text-sm ${view !== 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                style={{ borderRadius: '4px 0 0 4px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4a1 1 0 011-1h8a1 1 0 011 1v10a1 1 0 01-1 1H6a1 1 0 01-1-1V4zm2 1v8h6V5H7z" clipRule="evenodd" />
                </svg>
                לוח
              </button>
              <button
                onClick={() => view !== 'list' ? changeView('list') : null}
                className={`px-3 h-full flex items-center text-sm ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                style={{ borderRadius: '0 4px 4px 0' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                רשימה
              </button>
            </div>
          )}
          
          <button
            onClick={() => setShowWeeklyReport(true)}
            className={`${isMobile ? 'h-8 px-2 text-xs' : 'h-10 px-3'} rounded-md bg-gray-100 hover:bg-gray-200 flex items-center gap-1`}
            title="הצג דוח שבועי"
          >
            <FileText size={isMobile ? 12 : 16} />
            {!isMobile && <span>דוח שבועי</span>}
            {isMobile && <span>דוח</span>}
          </button>
          
          <button
            onClick={toggleContinuousEvents}
            className={`${isMobile ? 'h-8 px-2 text-xs' : 'h-10 px-3'} rounded-md ${showContinuousEvents ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title={showContinuousEvents ? 'הסתר אירועים מתמשכים' : 'הצג אירועים מתמשכים'}
          >
            {isMobile ? (showContinuousEvents ? 'הסתר מתמשכים' : 'הצג מתמשכים') : (showContinuousEvents ? 'הסתר אירועים מתמשכים' : 'הצג אירועים מתמשכים')}
          </button>
          
          <button
            onClick={toggleArchivedEvents}
            className={`${isMobile ? 'h-8 px-2 text-xs' : 'h-10 px-3'} rounded-md ${showArchivedEvents ? 'bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title={showArchivedEvents ? 'הסתר אירועים בארכיון' : 'הצג אירועים בארכיון'}
          >
            {isMobile ? (showArchivedEvents ? 'הסתר ארכיון' : 'הצג ארכיון') : (showArchivedEvents ? 'הסתר אירועים בארכיון' : 'הצג אירועים בארכיון')}
          </button>
          
          <button
            onClick={() => setShowHolidays(!showHolidays)}
            className={`${isMobile ? 'h-8 px-2 text-xs' : 'h-10 px-3'} rounded-md ${showHolidays ? 'bg-amber-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title={showHolidays ? 'הסתר חגים ומועדים' : 'הצג חגים ומועדים'}
          >
            {isMobile ? (showHolidays ? 'הסתר חגים' : 'הצג חגים') : (showHolidays ? 'הסתר חגים ומועדים' : 'הצג חגים ומועדים')}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobile && showMobileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4" onClick={e => e.stopPropagation()}>
            <div className="space-y-2">
              <button
                onClick={() => { changeView('timeGridWeek'); setShowMobileMenu(false); }}
                className={`w-full p-3 text-right rounded-lg ${view === 'timeGridWeek' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              >
                תצוגה שבועית
              </button>
              <button
                onClick={() => { changeView('timeGridDay'); setShowMobileMenu(false); }}
                className={`w-full p-3 text-right rounded-lg ${view === 'timeGridDay' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              >
                תצוגה יומית
              </button>
              <button
                onClick={() => { changeView('dayGridMonth'); setShowMobileMenu(false); }}
                className={`w-full p-3 text-right rounded-lg ${view === 'dayGridMonth' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              >
                תצוגה חודשית
              </button>
              <button
                onClick={() => { changeView('list'); setShowMobileMenu(false); }}
                className={`w-full p-3 text-right rounded-lg ${view === 'list' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              >
                תצוגת רשימה
              </button>
              <button
                onClick={() => { setShowEventForm(true); setShowMobileMenu(false); }}
                className="w-full p-3 text-right rounded-lg bg-blue-600 text-white"
              >
                אירוע חדש
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'list' ? (
        <ListView onEventSelect={handleEventClick} />
      ) : (
        <div className={`flex-grow calendar-container ${isMobile ? 'h-[calc(100vh-12rem)]' : ''}`}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={view}
            events={allEvents}
            eventClick={(info) => {
              // Only handle click for user events, not holidays
              if (!info.event.extendedProps.type) {
                handleEventClick(info);
              }
            }}
            select={handleDateSelect}
          selectable={true}
            selectMirror={true}
            dayMaxEvents={false}
            weekends={true}
            slotMinTime="00:00:00"
            slotMaxTime="23:59:59"
            allDaySlot={true}
            allDayText="כל היום"
            eventMinHeight={25}
            eventContent={(eventInfo) => {
              // For holidays, use a special rendering
              if (eventInfo.event.extendedProps.type === 'holiday' || eventInfo.event.extendedProps.type === 'memorial') {
                const isMonthView = eventInfo.view.type === 'dayGridMonth';
                
                if (isMonthView) {
                  return (
                    <div className="p-1 holiday-container">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: eventInfo.event.backgroundColor }}></div>
                        <div className="holiday-title">{eventInfo.event.title}</div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-1 flex items-center">
                      <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: eventInfo.event.backgroundColor }}></div>
                      <div className="text-sm font-medium">{eventInfo.event.title}</div>
                    </div>
                  );
                }
              }
              
              // For regular events, use the standard rendering
              return renderEventContent(eventInfo);
            }}
            eventClassNames={(info) => {
              // For holidays, add a special class
              if (info.event.extendedProps.type === 'holiday' || info.event.extendedProps.type === 'memorial') {
                return ['holiday-event', 'text-xs'];
              }
              
              // For regular events, use the standard classes
              const classes = ['text-base'];
              if (info.event.allDay) {
                if (info.event.extendedProps.event_type === 'continuous') {
                  classes.push('continuous-event');
                } else {
                  classes.push('full-day-event');
                }
              } else {
                classes.push('time-specific-event');
              }
              
              if (info.event.extendedProps.status === 'archived') {
                classes.push('archived');
              }

              // Add custom color class only for non-continuous events
              if (info.event.extendedProps.event_type !== 'continuous' && info.event.extendedProps.color) {
                info.event.setProp('backgroundColor', info.event.extendedProps.color);
                info.event.setProp('borderColor', info.event.extendedProps.color);
              }
              
              return classes;
            }}
            headerToolbar={{
              start: 'next,prev today',
              center: 'title',
              end: ''
            }}
            height="100%"
            direction="rtl"
            locale={heLocale}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            eventDisplay="block"
            eventOverlap={false}
            eventConstraint={{
              startTime: '00:00',
              endTime: '24:00'
            }}
            slotEventOverlap={false}
            expandRows={true}
            stickyHeaderDates={true}
            nowIndicator={true}
            views={{
              dayGridMonth: {
                dayMaxEventRows: 4,
                moreLinkText: 'עוד',
                moreLinkClick: 'day'
              },
              timeGridWeek: {
                dayHeaderFormat: { weekday: 'short', day: 'numeric', month: 'numeric' }
              },
              timeGridDay: {
                dayHeaderFormat: { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' }
              }
            }}
          />
        </div>
      )}

      {showEventModal && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onEdit={handleEditEvent}
          onDelete={async () => {
            try {
              await deleteEvent(selectedEvent.id);
              toast.success('האירוע נמחק בהצלחה');
              await fetchEvents();
              setShowEventModal(false);
              setSelectedEvent(null);
            } catch (error) {
              console.error('Error deleting event:', error);
              toast.error('שגיאה במחיקת האירוע');
            }
          }}
          onArchive={async () => {
            try {
              await archiveEvent(selectedEvent.id);
              toast.success('האירוע הועבר לארכיון בהצלחה');
              await fetchEvents();
              setShowEventModal(false);
              setSelectedEvent(null);
            } catch (error) {
              console.error('Error archiving event:', error);
              toast.error('שגיאה בהעברת האירוע לארכיון');
            }
          }}
        />
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-auto">
            <h2 className="text-2xl font-bold mb-4">{isEditing ? 'עריכת אירוע' : 'הוספת אירוע'}</h2>
            <EventForm
              event={isEditing ? selectedEvent : undefined}
              onSubmit={async (eventData) => {
                try {
                  if (isEditing && selectedEvent) {
                    await updateEvent({ ...eventData, id: selectedEvent.id });
                    toast.success('האירוע עודכן בהצלחה');
                  } else {
                    await addEvent(eventData);
                    toast.success('האירוע נוצר בהצלחה');
                  }
                  await fetchEvents();
                  setShowEventForm(false);
                  setIsEditing(false);
                  setSelectedEvent(null);
                } catch (error) {
                  console.error('Error saving event:', error);
                  toast.error('שגיאה בשמירת האירוע');
                }
              }}
              onCancel={() => {
                setShowEventForm(false);
                setIsEditing(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Weekly Report Modal */}
      {showWeeklyReport && (
        <WeeklyReport
          events={calendarEvents}
          selectedDate={selectedDate}
          onClose={() => setShowWeeklyReport(false)}
        />
      )}
    </div>
  );
};

export default CalendarView;