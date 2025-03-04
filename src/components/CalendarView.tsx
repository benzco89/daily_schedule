import React, { useState, useEffect, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useEventStore } from '../store/eventStore';
import { CalendarEvent } from '../types/event';
import ListView from './ListView';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Menu, FileText, X, Calendar, Clock, Bookmark, Archive, Trash, Edit } from 'lucide-react';
import '../styles/calendar.css';
import moment from 'moment';
import { toast } from 'react-toastify';
import EventModal from './EventModal';
import WeeklyReport from './WeeklyReport';
import EventForm from './EventForm';
import { getAllHolidays } from '../utils/israeliHolidays';
import { formatDate } from '../utils/dateUtils';

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
    fetchEvents, 
    deleteEvent: deleteEventFromStore, 
    updateEvent: updateEventFromStore,
    selectedDate,
    setSelectedDate,
    showContinuousEvents,
    toggleContinuousEvents,
    showArchivedEvents,
    toggleArchivedEvents,
    showHolidays,
    setShowHolidays
  } = useEventStore();
  const calendarRef = useRef<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const israeliHolidays = getAllHolidays();
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [eventPopupPosition, setEventPopupPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

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
    
    // Skip handling for holiday events
    if (event.extendedProps?.type === 'holiday') {
      return;
    }
    
    setSelectedEvent(event);
    
    // Get the position of the clicked event
    const rect = info.el.getBoundingClientRect();
    
    // Set the position for the popup
    const popupPosition = {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
    
    // Store the position in state
    setEventPopupPosition(popupPosition);
    setShowEventPopup(true);
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
  
  const handleArchiveEvent = async () => {
    if (selectedEvent) {
      try {
        await updateEventFromStore({ id: selectedEvent.id, status: 'archived' });
        toast.success('האירוע הועבר לארכיון בהצלחה');
        setShowEventPopup(false);
        await fetchEvents();
      } catch (error) {
        console.error('Error archiving event:', error);
        toast.error('שגיאה בהעברת האירוע לארכיון');
      }
    }
  };
  
  const handleDeleteEvent = async () => {
    if (selectedEvent && window.confirm('האם אתה בטוח שברצונך למחוק את האירוע?')) {
      try {
        await deleteEventFromStore(selectedEvent.id);
        toast.success('האירוע נמחק בהצלחה');
        setShowEventPopup(false);
        await fetchEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('שגיאה במחיקת האירוע');
      }
    }
  };
  
  const refetchEvents = async () => {
    try {
      await fetchEvents();
    } catch (error) {
      console.error('Error refetching events:', error);
      toast.error('שגיאה בטעינת האירועים');
    }
  };
  
  const EventPopup = () => {
    if (!selectedEvent || !showEventPopup || !eventPopupPosition) return null;
    
    // Calculate optimal position for the popup
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    // Determine if popup should appear above or below the event
    const spaceBelow = windowHeight - (eventPopupPosition.top + eventPopupPosition.height);
    const spaceAbove = eventPopupPosition.top;
    const showBelow = spaceBelow >= 250 || spaceBelow > spaceAbove;
    
    // Position the popup
    const popupStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1000,
      width: Math.min(350, windowWidth - 40),
      maxHeight: '350px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: `2px solid ${selectedEvent.color || '#3B82F6'}`,
      padding: '16px',
      overflow: 'auto'
    };
    
    // Position above or below the event
    if (showBelow) {
      popupStyle.top = `${eventPopupPosition.top + eventPopupPosition.height + 8}px`;
    } else {
      popupStyle.bottom = `${windowHeight - eventPopupPosition.top + 8}px`;
    }
    
    // Center horizontally relative to the event
    const eventCenter = eventPopupPosition.left + (eventPopupPosition.width / 2);
    const popupWidth = Math.min(350, windowWidth - 40);
    popupStyle.left = `${Math.max(20, Math.min(windowWidth - popupWidth - 20, eventCenter - (popupWidth / 2)))}px`;
    
    // Determine badge color - continuous events are always red
    const badgeColor = selectedEvent.event_type === 'continuous' ? '#EF4444' : selectedEvent.color;
    const badgeTextColor = ['#FFFFFF', '#FFFF00'].includes(badgeColor) ? '#000000' : '#FFFFFF';
    
    return (
      <>
        <div 
          className="event-popup"
          style={popupStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
            <button 
              onClick={() => setShowEventPopup(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Event Type Badge */}
          <div className="flex items-center mb-3">
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: badgeColor,
                color: badgeTextColor
              }}
            >
              {selectedEvent.event_type === 'continuous' && 'מתמשך'}
              {selectedEvent.event_type === 'full_day' && 'יום מלא'}
              {selectedEvent.event_type === 'time_specific' && 'שעה מוגדרת'}
            </span>
            
            {selectedEvent.status === 'archived' && (
              <span className="mr-2 px-2 py-1 bg-gray-200 rounded-full text-xs font-medium text-gray-700">
                בארכיון
              </span>
            )}
          </div>
          
          {/* Date and Time */}
          <div className="flex items-start mb-3">
            <Calendar size={16} className="text-gray-500 ml-2 mt-1 shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                {formatDate(selectedEvent.start_date)}
                {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date && ` - ${formatDate(selectedEvent.end_date)}`}
              </p>
              {selectedEvent.event_type === 'time_specific' && selectedEvent.start_time && (
                <div className="flex items-center mt-1">
                  <Clock size={14} className="text-gray-500 ml-1 shrink-0" />
                  <p className="text-sm text-gray-700">
                    {selectedEvent.start_time}
                    {selectedEvent.end_time && ` - ${selectedEvent.end_time}`}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Details */}
          {selectedEvent.details && (
            <div className="flex items-start mb-3">
              <FileText size={16} className="text-gray-500 ml-2 mt-1 shrink-0" />
              <div>
                <h3 className="text-xs font-medium text-gray-700">פרטים</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{selectedEvent.details}</p>
              </div>
            </div>
          )}
          
          {/* Notes */}
          {selectedEvent.notes && (
            <div className="flex items-start mb-3">
              <Bookmark size={16} className="text-gray-500 ml-2 mt-1 shrink-0" />
              <div>
                <h3 className="text-xs font-medium text-gray-700">הערות</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{selectedEvent.notes}</p>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            {selectedEvent.status === 'active' && (
              <button
                onClick={handleArchiveEvent}
                className="flex items-center px-2 py-1 border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50"
              >
                <Archive size={14} className="ml-1" />
                ארכיון
              </button>
            )}
            <button
              onClick={handleDeleteEvent}
              className="flex items-center px-2 py-1 border border-red-300 rounded-md text-xs text-red-700 hover:bg-red-50"
            >
              <Trash size={14} className="ml-1" />
              מחק
            </button>
            <button
              onClick={() => {
                setShowEventPopup(false);
                handleEditEvent();
              }}
              className="flex items-center px-2 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
            >
              <Edit size={14} className="ml-1" />
              ערוך
            </button>
          </div>
        </div>
        
        <div 
          className="event-popup-backdrop"
          onClick={() => setShowEventPopup(false)}
        />
      </>
    );
  };

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

      {/* Event Modal - Only show for editing, not for regular event clicks */}
      {showEventModal && selectedEvent && isEditing && (
        <EventModal
          event={selectedEvent}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onEdit={handleEditEvent}
          onDelete={async () => {
            try {
              await deleteEventFromStore(selectedEvent.id);
              toast.success('האירוע נמחק בהצלחה');
              setShowEventModal(false);
              await fetchEvents();
            } catch (error) {
              console.error('Error deleting event:', error);
              toast.error('שגיאה במחיקת האירוע');
            }
          }}
          onArchive={async () => {
            try {
              await updateEventFromStore({ id: selectedEvent.id, status: 'archived' });
              toast.success('האירוע הועבר לארכיון בהצלחה');
              setShowEventModal(false);
              await fetchEvents();
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

      {/* Event Popup */}
      {showEventPopup && <EventPopup />}
    </div>
  );
};

export default CalendarView;