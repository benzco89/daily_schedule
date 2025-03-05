import React, { useState } from 'react';
import moment from 'moment-timezone';
import { Event, CalendarEvent } from '../types/event';
import { ChevronRight, ChevronLeft, Printer, X, Calendar, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { getAllHolidays } from '../utils/israeliHolidays';
import { useEventStore } from '../store/eventStore';

interface WeeklyReportProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onClose: () => void;
}

const WeeklyReport: React.FC<WeeklyReportProps> = ({ events, selectedDate, onClose }) => {
  // הגדרת תחילת השבוע כבר קיימת בקובץ הראשי
  const [currentWeekStart, setCurrentWeekStart] = useState(moment(selectedDate).startOf('week'));
  const daysInWeek = Array.from({ length: 7 }, (_, i) => moment(currentWeekStart).add(i, 'days'));
  const israeliHolidays = getAllHolidays();
  const showHolidays = useEventStore(state => state.showHolidays);
  
  const navigateToPreviousWeek = () => {
    setCurrentWeekStart(moment(currentWeekStart).subtract(1, 'week'));
  };
  
  const navigateToNextWeek = () => {
    setCurrentWeekStart(moment(currentWeekStart).add(1, 'week'));
  };
  
  const navigateToCurrentWeek = () => {
    setCurrentWeekStart(moment().startOf('week'));
  };
  
  const getEventsForDay = (date: moment.Moment) => {
    const dateStr = date.format('YYYY-MM-DD');
    
    // הדפסת דיבאג
    console.log(`בדיקת אירועים ליום: ${dateStr}`);
    console.log(`מספר האירועים הכולל: ${events.length}`);
    
    const filteredEvents = events.filter(event => {
      // סינון אירועים בארכיון אם צריך
      if (!shouldShowArchivedEvents() && event.status === 'archived') {
        return false;
      }
      
      // המרת תאריכים לפורמט אחיד
      const eventStart = moment(event.start);
      const eventEnd = moment(event.end);
      
      // הדפסת דיבאג לכל אירוע
      console.log(`בדיקת אירוע: ${event.title}, תאריך התחלה: ${eventStart.format('YYYY-MM-DD')}, סוג: ${event.event_type}`);
      
      // טיפול באירועים מתמשכים
      if (event.event_type === 'continuous') {
        // אירוע מתמשך רלוונטי אם היום הנוכחי נמצא בטווח התאריכים של האירוע
        const isRelevant = eventStart.isSameOrBefore(date, 'day') && 
               eventEnd.isSameOrAfter(date, 'day');
        console.log(`  אירוע מתמשך ${event.title} רלוונטי ליום ${dateStr}? ${isRelevant}`);
        return isRelevant;
      } 
      
      // אירועים רגילים - בדיקה אם הם מתרחשים ביום הזה
      const isOnThisDay = eventStart.format('YYYY-MM-DD') === dateStr;
      console.log(`  אירוע ${event.title} מתרחש ביום ${dateStr}? ${isOnThisDay}`);
      return isOnThisDay;
    });
    
    console.log(`נמצאו ${filteredEvents.length} אירועים ליום ${dateStr}`);
    
    return filteredEvents.sort((a, b) => {
      // מיון האירועים: מתמשכים, יום שלם, ספציפיים לפי זמן
      const typeOrder = { continuous: 0, full_day: 1, time_specific: 2 };
      
      // מיון לפי סוג אירוע
      if (a.event_type !== b.event_type) {
        return typeOrder[a.event_type as keyof typeof typeOrder] - 
               typeOrder[b.event_type as keyof typeof typeOrder];
      }
      
      // מיון לפי זמן התחלה (עבור אירועים ספציפיים לפי זמן)
      if (a.event_type === 'time_specific' && !a.allDay && !b.allDay) {
        return moment(a.start).diff(moment(b.start));
      }
      
      // מיון לפי כותרת
      return a.title.localeCompare(b.title);
    });
  };
  
  const getHolidaysForDay = (date: moment.Moment) => {
    const dateStr = date.format('YYYY-MM-DD');
    return israeliHolidays.filter(holiday => holiday.date === dateStr);
  };
  
  const shouldShowHolidays = () => {
    return showHolidays;
  };
  
  /**
   * מפרמטת את זמן האירוע
   * @param event האירוע שאת זמנו יש לפרמט
   * @returns מחרוזת המייצגת את זמן האירוע
   */
  const formatEventTime = (event: CalendarEvent) => {
    if (event.event_type === 'time_specific' && !event.allDay) {
      // מציג רק את שעת ההתחלה
      return moment(event.start).format('HH:mm');
    }
    return '';
  };
  
  const getEventStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'פעיל';
      case 'archived': return 'בארכיון';
      case 'completed': return 'הושלם';
      default: return status;
    }
  };
  
  const printReport = () => {
    window.print();
  };
  
  /**
   * מחזירה את הסגנון המתאים לאירוע
   * @param event האירוע
   * @returns אובייקט עם מחלקות CSS מתאימות
   */
  const getEventTypeStyles = (event: CalendarEvent) => {
    const baseClasses = "rounded-md shadow-sm p-2 transition-all";
    const isArchived = event.status === 'archived';
    
    // שימוש בצבע שבחר המשתמש
    const userColor = event.color || '#3788d8'; // צבע ברירת מחדל אם אין צבע
    
    // יצירת סגנון דינמי עם הצבע שבחר המשתמש - אפקט גרדיאנט יפה
    const style = {
      background: `linear-gradient(to right, white, ${userColor}25)`,
      borderRight: `4px solid ${userColor}`,
      opacity: isArchived ? 0.7 : 1
    };
    
    return { className: baseClasses, style };
  };
  
  // בדיקה אם להציג אירועים בארכיון - ברירת המחדל היא להציג
  const shouldShowArchivedEvents = () => {
    // אם showArchivedEvents לא מוגדר, נחזיר true כברירת מחדל
    return useEventStore(state => state.showArchivedEvents) ?? true;
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 overflow-auto flex items-center justify-center p-4 print:p-0 print:bg-white print:backdrop-blur-none">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-auto print:shadow-none print:max-w-none print:max-h-none">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center print:hidden z-10">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={navigateToPreviousWeek}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="שבוע קודם"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={navigateToNextWeek}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="שבוע הבא"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={navigateToCurrentWeek}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              השבוע הנוכחי
            </button>
          </div>
          
          <h1 className="text-xl font-bold text-center flex-1">
            דוח שבועי: {currentWeekStart.format('DD/MM/YYYY')} - {moment(currentWeekStart).add(6, 'days').format('DD/MM/YYYY')}
          </h1>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={printReport}
              className="flex items-center px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <Printer className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0" />
              הדפסה
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="סגור"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 print:p-2">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 print:gap-2">
            {daysInWeek.map((day) => {
              const dayEvents = getEventsForDay(day);
              const holidays = shouldShowHolidays() ? getHolidaysForDay(day) : [];
              const isToday = day.isSame(moment(), 'day');
              
              return (
                <div 
                  key={day.format('YYYY-MM-DD')} 
                  className={`border rounded-lg overflow-hidden ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <div className={`font-bold text-center p-2 ${isToday ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                    <div className="text-lg">{day.format('dddd')}</div>
                    <div className="text-sm">{day.format('DD/MM/YYYY')}</div>
                  </div>
                  
                  <div className="p-2 space-y-2 min-h-[150px]">
                    {holidays.length > 0 && (
                      <div className="space-y-1">
                        {holidays.map((holiday) => (
                          <div 
                            key={holiday.id} 
                            className="bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 p-2 rounded-md border-r-4 border-amber-500 text-sm print:text-xs shadow-sm"
                          >
                            <div className="font-medium">{holiday.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {dayEvents.length === 0 && holidays.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center py-4">אין אירועים</div>
                      ) : (
                        dayEvents.map((event) => (
                          <div 
                            key={event.id} 
                            className={getEventTypeStyles(event).className}
                            style={getEventTypeStyles(event).style}
                          >
                            <div className="font-medium flex items-center justify-between">
                              <span>{event.title}</span>
                              {event.status !== 'active' && (
                                <span className="text-xs bg-gray-200 text-gray-700 px-1 py-0.5 rounded-full">
                                  {getEventStatusText(event.status)}
                                </span>
                              )}
                            </div>
                            
                            {event.event_type === 'continuous' && (
                              <div className="text-xs text-purple-700 mt-1 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {moment(event.start).format('DD/MM')} 
                                {` - ${moment(event.end).format('DD/MM')}`}
                              </div>
                            )}
                            
                            {event.event_type === 'time_specific' && !event.allDay && (
                              <div className="text-xs text-blue-700 mt-1 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatEventTime(event)}
                              </div>
                            )}
                            
                            {event.details && (
                              <div className="text-xs mt-1 line-clamp-2 text-gray-600 pt-1 border-t border-gray-100">
                                {event.details}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <style jsx>{`
          @media print {
            @page {
              size: landscape;
              margin: 1cm;
            }
            
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .min-h-[150px] {
              min-height: auto !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default WeeklyReport; 