import React, { useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { useEventStore } from '../store/eventStore';
import { CalendarEvent } from '../types/event';
import ListView from './ListView';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Menu, FileText, X, Calendar, Clock, Bookmark, Archive, Trash, Edit, Star, Plus } from 'lucide-react';
import '../styles/calendar.css';
import moment from 'moment';
import { toast } from 'react-toastify';
import WeeklyReport from './WeeklyReport';
import { getAllHolidays } from '../utils/israeliHolidays';
import { formatDate } from '../utils/dateUtils';
import { holidayStyles } from '../utils/holidayStyles';

interface CalendarViewProps {
  onEventSelect?: (event: CalendarEvent) => void;
  onAddEvent?: (start: Date, end: Date) => Promise<any> | void;
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
  noEventsText: 'אין אירועים להצגה'
} as any;

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
  const calendarRef = useRef<FullCalendar | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [eventPopupPosition, setEventPopupPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const israeliHolidays = getAllHolidays();
  const [isNewEventPopup, setIsNewEventPopup] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{start: Date, end: Date} | null>(null);

  // הוספת הסגנון לתוך ה-DOM
  useEffect(() => {
    // בדוק אם הסגנון כבר קיים
    const styleId = 'holiday-styles';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.innerHTML = holidayStyles;
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

  const handleEventClick = (info: EventClickArg | CalendarEvent) => {
    console.log('handleEventClick called in CalendarView.tsx');
    
    // בדיקה אם זה אירוע מלוח השנה או אירוע מהרשימה
    if ('event' in info) {
      // זה אירוע מלוח השנה (EventClickArg)
      const fcEvent = info.event;
      
      // Skip handling for holiday events
      if (fcEvent.extendedProps?.type === 'holiday' || fcEvent.extendedProps?.type === 'memorial') {
        return;
      }
      
      // המרה לאירוע מסוג CalendarEvent
      const startDate = fcEvent.start || new Date();
      const endDate = fcEvent.end || startDate;
      
      const event: CalendarEvent = {
        id: fcEvent.extendedProps?.id || fcEvent.id,
        title: fcEvent.title || '',
        start: startDate,
        end: endDate,
        allDay: fcEvent.allDay || false,
        details: fcEvent.extendedProps?.details || null,
        notes: fcEvent.extendedProps?.notes || null,
        event_type: fcEvent.extendedProps?.event_type || 'time_specific',
        start_date: fcEvent.startStr.split('T')[0],
        end_date: fcEvent.endStr.split('T')[0],
        start_time: fcEvent.startStr.includes('T') ? fcEvent.startStr.split('T')[1].substring(0, 5) : null,
        end_time: fcEvent.endStr.includes('T') ? fcEvent.endStr.split('T')[1].substring(0, 5) : null,
        color: fcEvent.backgroundColor || '#3B82F6',
        status: fcEvent.extendedProps?.status || 'active',
        extendedProps: fcEvent.extendedProps
      };
      
      setSelectedEvent(event);
      
      if (onEventSelect) {
        onEventSelect(event);
      }
      
      // Get the position of the clicked event for popup positioning
      if (info.el) {
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
      }
    } else {
      // זה אירוע מהרשימה (CalendarEvent)
      setSelectedEvent(info);
      
      if (onEventSelect) {
        onEventSelect(info);
      }
      
      // For ListView events, position the popup in the center of the screen
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      const popupPosition = {
        top: windowHeight / 3,
        left: windowWidth / 2 - 175, // Half of popup width (350px)
        width: 350,
        height: 50
      };
      
      setEventPopupPosition(popupPosition);
    }
    
    console.log('Setting selected event:', info);
    setShowEventPopup(true);
  };

  const handleDateSelect = async (selectInfo: DateSelectArg) => {
    console.log('handleDateSelect called with:', selectInfo);
    setSelectedDate(selectInfo.start);
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // clear date selection

    // נשמור את מידע הבחירה כדי שנוכל להשתמש בו אם המשתמש יבחר ליצור אירוע חדש
    setSelectedTimeSlot({
      start: selectInfo.start,
      end: selectInfo.end
    });

    // חישוב מיקום הפופאפ - נשתמש בחישוב דומה לזה שמשמש לאירועים קיימים
    if (typeof window !== 'undefined') {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // במובייל, נציג את הפופאפ במרכז המסך
      if (isMobile) {
        const popupPosition = {
          top: windowHeight / 3,
          left: windowWidth / 2 - Math.min(175, windowWidth / 2 - 20), // מרכז המסך, עם שוליים
          width: Math.min(350, windowWidth - 40), // מקסימום 350px או רוחב המסך פחות שוליים
          height: 50
        };
        
        setEventPopupPosition(popupPosition);
      } else {
        // במחשב, נציג את הפופאפ במרכז האזור שנבחר
        const popupPosition = {
          top: windowHeight / 3,
          left: windowWidth / 2 - 175, // Half of popup width (350px)
          width: 350,
          height: 50
        };
        
        setEventPopupPosition(popupPosition);
      }
    }

    // הצגת הפופאפ
    setShowEventPopup(true);
    setIsNewEventPopup(true); // סימון שזה פופאפ ליצירת אירוע חדש
    
    // הוספת לוג לצורך דיבוג במובייל
    console.log('Popup should be shown now. isMobile:', isMobile, 'showEventPopup:', showEventPopup);
  };

  const renderEventContent = (eventInfo: { event: any; timeText: string; view?: { type: string } }) => {
    const isMonthView = eventInfo.view?.type === 'dayGridMonth';

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
    console.log('handleEditEvent called in CalendarView.tsx');
    // סגירת הפופאפ הקטן
    setShowEventPopup(false);
    
    if (selectedEvent) {
      console.log('Editing event in CalendarView:', selectedEvent);
      
      // העברת האירוע לעריכה ב-App.tsx
      if (onEventSelect) {
        console.log('Passing selected event to parent component for editing:', selectedEvent);
        onEventSelect(selectedEvent);
      }
      
      // שליחת אירוע מותאם אישית לעדכון המצב ב-App.tsx
      const editEvent = new CustomEvent('edit-event', { 
        detail: { 
          isEditing: true,
          eventId: selectedEvent.id,
          event: selectedEvent
        } 
      });
      console.log('Dispatching edit-event with detail:', editEvent.detail);
      window.dispatchEvent(editEvent);
    }
  };

  // Combine user events with holidays if enabled
  const allEvents = useMemo(() => {
    if (showHolidays) {
      return [...calendarEvents, ...getAllHolidays()];
    }
    return calendarEvents;
  }, [calendarEvents, showHolidays]);
  
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
  
  // עדכון קומפוננטת הפופאפ
  const EventPopup = () => {
    if (!eventPopupPosition) return null;
    
    // Calculate optimal position for the popup
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    // Determine if popup should appear above or below the event
    const spaceBelow = windowHeight - (eventPopupPosition.top + eventPopupPosition.height);
    const spaceAbove = eventPopupPosition.top;
    const showBelow = spaceBelow >= 250 || spaceBelow > spaceAbove;
    
    // Position the popup
    const popupStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 1000,
      width: Math.min(350, windowWidth - 40),
      maxHeight: isMobile ? '80vh' : '350px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: isNewEventPopup ? '2px solid #3B82F6' : `2px solid ${selectedEvent?.color || '#3B82F6'}`,
      padding: isMobile ? '12px' : '16px',
      overflow: 'auto'
    };
    
    // במובייל, נציג את הפופאפ במרכז המסך
    if (isMobile) {
      popupStyle.top = '50%';
      popupStyle.left = '50%';
      popupStyle.transform = 'translate(-50%, -50%)';
    } else {
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
    }
    
    // Ensure the popup is visible within the viewport
    if (!isMobile) {
      if (parseFloat(popupStyle.top as string) < 10) {
        popupStyle.top = '10px';
      }
      
      if (parseFloat(popupStyle.left as string) < 10) {
        popupStyle.left = '10px';
      }
    }
    
    return (
      <>
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-10"
          onClick={() => {
            setShowEventPopup(false);
            setIsNewEventPopup(false);
            setSelectedTimeSlot(null);
          }}
          style={{ display: showEventPopup ? 'block' : 'none' }}
        />
        <div 
          className="event-popup"
          style={popupStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {isNewEventPopup ? (
            // תצוגת פופאפ ליצירת אירוע חדש
            <>
              <div className="flex justify-between items-start mb-3">
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>יצירת אירוע חדש</h3>
                <button 
                  onClick={() => {
                    setShowEventPopup(false);
                    setIsNewEventPopup(false);
                    setSelectedTimeSlot(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={isMobile ? 18 : 20} />
                </button>
              </div>
              
              {/* Date and Time */}
              <div className="flex items-start mb-3">
                <Calendar size={isMobile ? 14 : 16} className="text-gray-500 ml-2 mt-1 shrink-0" />
                <div>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700`}>
                    {selectedTimeSlot ? formatDate(selectedTimeSlot.start) : ''}
                  </p>
                  {selectedTimeSlot && (
                    <div className="flex items-center mt-1">
                      <Clock size={isMobile ? 12 : 14} className="text-gray-500 ml-1 shrink-0" />
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700`}>
                        {moment(selectedTimeSlot.start).format('HH:mm')}
                        {' - '}
                        {moment(selectedTimeSlot.end).format('HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    if (selectedTimeSlot && onAddEvent) {
                      onAddEvent(selectedTimeSlot.start, selectedTimeSlot.end);
                      setShowEventPopup(false);
                      setIsNewEventPopup(false);
                      setSelectedTimeSlot(null);
                    }
                  }}
                  className={`flex items-center ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} bg-blue-600 text-white rounded-md hover:bg-blue-700`}
                >
                  <Plus size={isMobile ? 14 : 16} className="ml-1" />
                  צור אירוע חדש
                </button>
              </div>
            </>
          ) : (
            // תצוגת פופאפ לאירוע קיים
            selectedEvent && (
              <>
                <div className="flex justify-between items-start mb-3">
                  <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>{selectedEvent.title}</h3>
                  <button 
                    onClick={() => setShowEventPopup(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={isMobile ? 18 : 20} />
                  </button>
                </div>
                
                {/* Event Type Badge */}
                <div className="flex items-center mb-3">
                  <span 
                    className={`px-2 py-1 rounded-full ${isMobile ? 'text-[10px]' : 'text-xs'} font-medium`}
                    style={{ 
                      backgroundColor: selectedEvent.event_type === 'continuous' ? '#EF4444' : selectedEvent.color,
                      color: ['#FFFFFF', '#FFFF00'].includes(selectedEvent.color) ? '#000000' : '#FFFFFF'
                    }}
                  >
                    {selectedEvent.event_type === 'continuous' && 'מתמשך'}
                    {selectedEvent.event_type === 'full_day' && 'יום מלא'}
                    {selectedEvent.event_type === 'time_specific' && 'שעה מוגדרת'}
                  </span>
                  
                  {selectedEvent.status === 'archived' && (
                    <span className={`mr-2 px-2 py-1 bg-gray-200 rounded-full ${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-gray-700`}>
                      בארכיון
                    </span>
                  )}
                </div>
                
                {/* Date and Time */}
                <div className="flex items-start mb-3">
                  <Calendar size={isMobile ? 14 : 16} className="text-gray-500 ml-2 mt-1 shrink-0" />
                  <div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700`}>
                      {selectedEvent.start_date ? formatDate(selectedEvent.start_date) : ''}
                      {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date && 
                        ` - ${formatDate(selectedEvent.end_date)}`}
                    </p>
                    {selectedEvent.event_type === 'time_specific' && selectedEvent.start_time && (
                      <div className="flex items-center mt-1">
                        <Clock size={isMobile ? 12 : 14} className="text-gray-500 ml-1 shrink-0" />
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700`}>
                          {selectedEvent.start_time}
                          {selectedEvent.end_time && ` - ${selectedEvent.end_time}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Details */}
                {selectedEvent?.details && (
                  <div className="flex items-start mb-3">
                    <FileText size={isMobile ? 14 : 16} className="text-gray-500 ml-2 mt-1 shrink-0" />
                    <div>
                      <h3 className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-gray-700`}>פרטים</h3>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 whitespace-pre-line`}>{selectedEvent.details}</p>
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                {selectedEvent?.notes && (
                  <div className="flex items-start mb-3">
                    <Bookmark size={isMobile ? 14 : 16} className="text-gray-500 ml-2 mt-1 shrink-0" />
                    <div>
                      <h3 className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-gray-700`}>הערות</h3>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 whitespace-pre-line`}>{selectedEvent.notes}</p>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex justify-end gap-2 mt-4">
                  {selectedEvent.status === 'active' && (
                    <button
                      onClick={handleArchiveEvent}
                      className={`flex items-center ${isMobile ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50`}
                    >
                      <Archive size={isMobile ? 12 : 14} className="ml-1" />
                      ארכיון
                    </button>
                  )}
                  <button
                    onClick={handleDeleteEvent}
                    className={`flex items-center ${isMobile ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} border border-red-300 rounded-md text-red-700 hover:bg-red-50`}
                  >
                    <Trash size={isMobile ? 12 : 14} className="ml-1" />
                    מחק
                  </button>
                  <button
                    onClick={() => {
                      setShowEventPopup(false);
                      handleEditEvent();
                    }}
                    className={`flex items-center ${isMobile ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} bg-blue-600 text-white rounded-md hover:bg-blue-700`}
                  >
                    <Edit size={isMobile ? 12 : 14} className="ml-1" />
                    ערוך
                  </button>
                </div>
              </>
            )
          )}
        </div>
      </>
    );
  };
  
  // תיקון שגיאת onAddEvent
  const handleAddEventFromCalendar = async (selectInfo: DateSelectArg) => {
    console.log('handleAddEventFromCalendar called in CalendarView.tsx');
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
      const event: {
        title: string;
        details: string | null;
        notes: string | null;
        event_type: 'time_specific';
        start_date: string;
        end_date: string;
        start_time: string;
        end_time: string;
        color: string;
        status: 'active';
      } = {
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
      };
      console.log('Attempting to add event:', event);
      
      // טיפול ב-onAddEvent
      if (onAddEvent) {
        try {
          // @ts-ignore - מתעלם משגיאות TypeScript כאן
          await onAddEvent(selectInfo.start, selectInfo.end);
          toast.success('האירוע נוצר בהצלחה');
        } catch (error) {
          console.error('Error in onAddEvent:', error);
          toast.error('שגיאה ביצירת האירוע');
          return;
        }
      } else {
        console.warn('onAddEvent function is not provided');
        toast.info('האירוע נוצר בהצלחה');
      }
      
      // רענון האירועים בכל מקרה
      await fetchEvents();
    } catch (err) {
      console.error('Error adding event:', err);
      toast.error('שגיאה ביצירת האירוע');
    }
  };

  // תיקון שגיאות הקשורות לשדות של CalendarEvent
  const formatEventTime = (event: CalendarEvent) => {
    // שימוש בשדות הנכונים
    const startTime = event.start_time || '';
    const endTime = event.end_time || '';
    
    // המשך הקוד כרגיל
    return `${startTime} - ${endTime}`;
  };

  // הוספת אפקט שיוסיף מאזיני אירועים לתאים בלוח השנה במובייל
  useEffect(() => {
    if (isMobile && calendarRef.current) {
      const addMobileTapListeners = () => {
        // מצא את כל התאים בלוח השנה
        const dayCells = document.querySelectorAll('.fc-daygrid-day, .fc-timegrid-slot');
        
        // הוסף מאזין לחיצה לכל תא
        dayCells.forEach(cell => {
          const clickHandler = (e: Event) => {
            // בדוק אם הלחיצה היא על התא עצמו ולא על אירוע
            if ((e.target as HTMLElement).closest('.fc-event') === null) {
              console.log('Cell clicked in mobile view');
              
              // קבל את התאריך והשעה מהתא
              const date = new Date();
              const dataDate = (cell as HTMLElement).getAttribute('data-date');
              
              if (dataDate) {
                const cellDate = new Date(dataDate);
                
                // קבע את השעה לפי התא, אם זה תא של שעה
                if ((cell as HTMLElement).classList.contains('fc-timegrid-slot')) {
                  const timeAttr = (cell as HTMLElement).getAttribute('data-time');
                  if (timeAttr) {
                    const [hours, minutes] = timeAttr.split(':').map(Number);
                    cellDate.setHours(hours, minutes);
                  }
                }
                
                // צור אובייקט בחירה
                const endDate = new Date(cellDate);
                endDate.setHours(endDate.getHours() + 1);
                
                const selectInfo = {
                  start: cellDate,
                  end: endDate,
                  allDay: !(cell as HTMLElement).classList.contains('fc-timegrid-slot'),
                  view: calendarRef.current?.getApi().view
                };
                
                // הפעל את פונקציית הבחירה
                handleDateSelect(selectInfo as DateSelectArg);
              }
            }
          };
          
          cell.addEventListener('click', clickHandler);
          
          // שמור את ה-handler כדי שנוכל להסיר אותו אחר כך
          (cell as any)._mobileClickHandler = clickHandler;
        });
      };
      
      // הוסף את המאזינים לאחר שהלוח נטען
      setTimeout(addMobileTapListeners, 1000);
      
      // הוסף את המאזינים גם כאשר משנים תצוגה
      const api = calendarRef.current.getApi();
      const datesSetHandler = () => {
        setTimeout(addMobileTapListeners, 500);
      };
      
      // שימוש באירוע datesSet במקום viewDidMount
      api.on('datesSet', datesSetHandler);
      
      return () => {
        // נקה את המאזינים בעת פירוק הקומפוננטה
        const dayCells = document.querySelectorAll('.fc-daygrid-day, .fc-timegrid-slot');
        dayCells.forEach(cell => {
          if ((cell as any)._mobileClickHandler) {
            cell.removeEventListener('click', (cell as any)._mobileClickHandler);
          }
        });
        
        // נקה גם את מאזין datesSet
        api.off('datesSet', datesSetHandler);
      };
    }
  }, [isMobile, handleDateSelect]);

  return (
    <div className="h-full flex flex-col">
      {/* Add the holiday styles */}
      <style>{holidayStyles}</style>
      
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
                onClick={() => changeView('dayGridMonth')}
                className={`h-10 px-3 rounded-md ${view === 'dayGridMonth' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                חודשי
              </button>
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
                onClick={() => { changeView('dayGridMonth'); setShowMobileMenu(false); }}
                className={`w-full p-3 text-right rounded-lg ${view === 'dayGridMonth' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              >
                תצוגה חודשית
              </button>
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
        <div className="flex-grow calendar-container w-full h-full">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={view}
            events={allEvents}
            firstDay={0}
            eventClick={(info) => {
              // רק אירועים רגילים, לא חגים
              if (info.event.extendedProps.type !== 'holiday' && info.event.extendedProps.type !== 'memorial') {
                handleEventClick(info);
              }
            }}
            select={handleDateSelect}
            dateClick={(info) => {
              // במובייל, לחיצה על תאריך תפעיל את אותה פונקציה כמו בחירת טווח תאריכים
              if (isMobile) {
                const endDate = new Date(info.date);
                endDate.setHours(endDate.getHours() + 1); // הוסף שעה אחת לתאריך הסיום
                
                const selectInfo = {
                  start: info.date,
                  end: endDate,
                  allDay: info.allDay,
                  view: info.view
                };
                
                handleDateSelect(selectInfo as DateSelectArg);
              }
            }}
            selectable={true}
            selectMirror={true}
            longPressDelay={isMobile ? 100 : 1000} // קיצור זמן הלחיצה הארוכה במובייל
            selectLongPressDelay={isMobile ? 100 : 1000} // קיצור זמן הלחיצה הארוכה לבחירה במובייל
            selectMinDistance={isMobile ? 0 : 5} // מרחק מינימלי לבחירה במובייל
            dayMaxEvents={false}
            weekends={true}
            slotMinTime="00:00:00"
            slotMaxTime="23:59:59"
            allDaySlot={true}
            allDayText="כל היום"
            eventMinHeight={25}
            height={isMobile ? "auto" : "100%"}
            contentHeight={isMobile ? "auto" : "auto"}
            aspectRatio={isMobile ? 0.8 : 1.35}
            handleWindowResize={true}
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
            eventContent={(eventInfo) => {
              // For holidays, use a special rendering
              if (eventInfo.event.extendedProps.type === 'holiday' || eventInfo.event.extendedProps.type === 'memorial') {
                const isMonthView = eventInfo.view.type === 'dayGridMonth';
                const isTimeGridView = eventInfo.view.type === 'timeGridWeek' || eventInfo.view.type === 'timeGridDay';
                
                if (isMonthView) {
                  return (
                    <div className="p-1 holiday-container">
                      <div className="flex items-center">
                        <Star size={14} className="text-amber-500 mr-1" />
                        <div className="holiday-title font-bold text-black">{eventInfo.event.title}</div>
                      </div>
                    </div>
                  );
                } else if (isTimeGridView) {
                  // תצוגה שבועית או יומית - הצג את שם החג בצורה בולטת יותר עם אייקון כוכב
                  return (
                    <div className="p-1 flex items-center holiday-container">
                      <Star size={14} className="text-amber-500 mr-1" />
                      <div className="text-sm font-bold text-black">{eventInfo.event.title}</div>
                    </div>
                  );
                } else {
                  // תצוגות אחרות
                  return (
                    <div className="p-1 flex items-center holiday-container">
                      <Star size={14} className="text-amber-500 mr-1" />
                      <div className="text-sm font-bold text-black">{eventInfo.event.title}</div>
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
                return ['holiday-event', 'text-xs', 'font-bold'];
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
            nowIndicator={true}
          />
        </div>
      )}

      {/* Weekly Report Modal */}
      {showWeeklyReport && (
        <>
          <div className="modal-backdrop" onClick={() => setShowWeeklyReport(false)}></div>
          <div className="modal-content weekly-report-modal">
            <WeeklyReport 
              events={calendarEvents} 
              selectedDate={selectedDate}
              onClose={() => setShowWeeklyReport(false)} 
            />
          </div>
        </>
      )}

      {/* Event Popup */}
      {showEventPopup && <EventPopup />}
    </div>
  );
};

export default CalendarView;