import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, List, Plus, Loader2 } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useMediaQuery } from './hooks/useMediaQuery';

import { useEventStore } from './store/eventStore';
import { Event, CalendarEvent } from './types/event';
import CalendarView from './components/CalendarView';
import ListView from './components/ListView';
import EventForm from './components/EventForm';
import EventModal from './components/EventModal';

function App() {
  const { 
    events, 
    loading, 
    error, 
    fetchEvents, 
    addEvent, 
    updateEvent, 
    deleteEvent, 
    archiveEvent,
    archivePastEvents
  } = useEventStore();
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newEventDate, setNewEventDate] = useState<{ start: Date, end: Date } | null>(null);
  
  useEffect(() => {
    fetchEvents();
    
    // Set up interval to check for past events every hour
    const intervalId = setInterval(() => {
      archivePastEvents();
    }, 60 * 60 * 1000); // 1 hour in milliseconds
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [fetchEvents, archivePastEvents]);
  
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);
  
  // Listen for edit-event custom event from CalendarView
  useEffect(() => {
    const handleEditEventFromCalendar = (event: CustomEvent) => {
      console.log('Received edit-event from CalendarView:', event.detail);
      if (event.detail && event.detail.isEditing) {
        // Check if the event data is included in the custom event
        if (event.detail.event) {
          console.log('Using event data from custom event:', event.detail.event);
          setSelectedEvent(event.detail.event);
          setIsEditing(true);
          setShowEventForm(true);
          return;
        }
        
        // Make sure we're using the same selected event
        if (event.detail.eventId) {
          // Find the event in the store if needed
          const eventToEdit = events.find(e => e.id === event.detail.eventId);
          if (eventToEdit) {
            console.log('Setting selected event for editing:', eventToEdit);
            setSelectedEvent(eventToEdit);
            // Set editing state after setting the selected event
            setIsEditing(true);
            setShowEventForm(true);
          }
        } else if (selectedEvent) {
          // If no eventId provided but we have a selected event, use that
          console.log('Using already selected event for editing:', selectedEvent);
          setIsEditing(true);
          setShowEventForm(true);
        }
      }
    };

    window.addEventListener('edit-event', handleEditEventFromCalendar as EventListener);
    
    return () => {
      window.removeEventListener('edit-event', handleEditEventFromCalendar as EventListener);
    };
  }, [events, selectedEvent, setSelectedEvent]);
  
  const handleAddEvent = (start: Date, end: Date) => {
    setNewEventDate({ start, end });
    setShowEventForm(true);
    setIsEditing(false);
    setSelectedEvent(null);
  };
  
  const handleEventSelect = (event: CalendarEvent | Event) => {
    console.log('handleEventSelect called in App.tsx with event:', event);
    // Find the full event data from the events array
    const fullEvent = events.find(e => e.id === event.id);
    if (fullEvent) {
      console.log('Found full event:', fullEvent);
      setSelectedEvent(fullEvent);
      // Don't reset isEditing here, let the specific handlers manage this state
    } else {
      console.log('Could not find full event in events array, using event as is:', event);
      // If we can't find the event in the events array, use the event as is
      setSelectedEvent(event as Event);
    }
  };
  
  const handleEditEvent = () => {
    console.log('handleEditEvent called in App.tsx');
    if (selectedEvent) {
      console.log('Editing event:', selectedEvent);
      setIsEditing(true);
      setNewEventDate(null); // Clear any default dates when editing
      setShowEventForm(true); // Make sure the form is shown when editing
      
      // Dispatch a custom event to ensure synchronization with CalendarView
      const editEvent = new CustomEvent('edit-event', { 
        detail: { 
          isEditing: true,
          eventId: selectedEvent.id 
        } 
      });
      window.dispatchEvent(editEvent);
    }
  };
  
  const handleDeleteEvent = async () => {
    if (selectedEvent) {
      try {
        await deleteEvent(selectedEvent.id);
        toast.success('האירוע נמחק בהצלחה');
        setSelectedEvent(null);
      } catch (error) {
        toast.error('שגיאה במחיקת האירוע');
      }
    }
  };
  
  const handleArchiveEvent = async () => {
    if (selectedEvent) {
      try {
        await archiveEvent(selectedEvent.id);
        toast.success('האירוע הועבר לארכיון בהצלחה');
        setSelectedEvent(null);
      } catch (error) {
        toast.error('שגיאה בהעברת האירוע לארכיון');
      }
    }
  };
  
  const handleFormSubmit = async (data: any) => {
    try {
      if (isEditing && selectedEvent) {
        // When editing, just pass the data directly without modifying dates
        await updateEvent(selectedEvent.id, data);
        toast.success('האירוע עודכן בהצלחה');
      } else {
        // Format the data for a new event
        const newEvent = {
          ...data,
          // If we have a newEventDate, use it to set the start and end dates
          ...(newEventDate && {
            start_date: newEventDate.start.toISOString().split('T')[0],
            ...(data.event_type !== 'time_specific' && {
              end_date: data.event_type === 'continuous' && !data.end_date ? null : 
                newEventDate.end.toISOString().split('T')[0]
            }),
            // Only use the newEventDate times if the user didn't provide times in the form
            ...(data.event_type === 'time_specific' && {
              // Use form values if provided, otherwise use the newEventDate times
              start_time: data.start_time || newEventDate.start.toTimeString().substring(0, 5),
              end_time: data.end_time || newEventDate.end.toTimeString().substring(0, 5)
            })
          })
        };
        
        await addEvent(newEvent);
        toast.success('האירוע נוצר בהצלחה');
      }
      
      setShowEventForm(false);
      setIsEditing(false);
      setSelectedEvent(null);
      setNewEventDate(null);
    } catch (error) {
      toast.error('שגיאה בשמירת האירוע');
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">מערכת ניהול אירועים</h1>
          <div className="flex items-center space-x-4 space-x-reverse">
            <button
              onClick={() => setShowEventForm(true)}
              className={`${isMobile ? 'px-3 py-1.5 text-sm mr-8' : 'px-4 py-2'} bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center`}
            >
              <Plus size={isMobile ? 16 : 18} className="ml-1" />
              אירוע חדש
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <span className="mr-2 text-gray-700">טוען...</span>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg p-6 h-[calc(100vh-12rem)]">
            <CalendarView 
              onEventSelect={handleEventSelect}
              onAddEvent={handleAddEvent}
              defaultView={isMobile ? "timeGridDay" : "timeGridWeek"}
            />
          </div>
        )}
      </main>
      
      {/* Event Form */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-auto">
            <EventForm
              event={isEditing && selectedEvent ? selectedEvent : (newEventDate ? { start_date: newEventDate.start.toISOString().split('T')[0], end_date: newEventDate.end.toISOString().split('T')[0] } : undefined)}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowEventForm(false);
                setIsEditing(false);
                setSelectedEvent(null);
                setNewEventDate(null);
              }}
            />
          </div>
        </div>
      )}
      
      {/* Event Details Modal */}
      {/* הסרת החלון הגדול כדי שרק הפופאפ הקטן יופיע
      {selectedEvent && !isEditing && !showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <EventModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
            onArchive={handleArchiveEvent}
          />
        </div>
      )}
      */}
      
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App;