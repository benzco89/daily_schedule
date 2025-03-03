import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { X, Calendar, Clock, FileText, Bookmark, Tag } from 'lucide-react';
import { Event, EventType } from '../types/event';

interface EventFormProps {
  event?: Partial<Event>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

// Predefined color options
const colorOptions = [
  { value: '#3B82F6', label: 'כחול' },
  { value: '#10B981', label: 'ירוק' },
  { value: '#EF4444', label: 'אדום' },
  { value: '#F59E0B', label: 'כתום' },
  { value: '#8B5CF6', label: 'סגול' },
  { value: '#EC4899', label: 'ורוד' },
  { value: '#6B7280', label: 'אפור' },
  { value: '#000000', label: 'שחור' },
];

const EventForm: React.FC<EventFormProps> = ({ event, onSubmit, onCancel }) => {
  const [eventType, setEventType] = useState<EventType>(event?.event_type || 'time_specific');
  
  // Get current time in HH:MM format for default values
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  // Get time one hour from now for default end time
  const getEndTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: event?.title || '',
      details: event?.details || '',
      notes: event?.notes || '',
      event_type: event?.event_type || 'time_specific',
      start_date: event?.start_date || '',
      end_date: event?.end_date || '',
      start_time: event?.start_time || '',
      end_time: event?.end_time || '',
      color: event?.event_type === 'continuous' ? '#EF4444' : (event?.color || '#3B82F6'),
      status: event?.status || 'active',
      is_continuous_active: event?.event_type === 'continuous' && !event?.end_date
    }
  });
  
  const selectedEventType = watch('event_type');
  const selectedColor = watch('color');
  const isContinuousActive = watch('is_continuous_active');
  
  useEffect(() => {
    setEventType(selectedEventType as EventType);
    
    // If event type is continuous, force the color to be red
    if (selectedEventType === 'continuous') {
      setValue('color', '#EF4444');
    }
    
    // Don't set default times automatically
  }, [selectedEventType, setValue, watch]);
  
  // Handle continuous event toggle
  useEffect(() => {
    if (selectedEventType === 'continuous' && isContinuousActive) {
      setValue('end_date', '');
    }
  }, [isContinuousActive, selectedEventType, setValue]);
  
  const handleFormSubmit = (data: any) => {
    // If it's a continuous event and is active, remove end date
    if (data.event_type === 'continuous' && data.is_continuous_active) {
      data.end_date = null;
    }
    
    // Force continuous events to be red
    if (data.event_type === 'continuous') {
      data.color = '#EF4444';
    }
    
    // For time-specific events, if end_time is not provided, set it to 1 hour after start_time
    if (data.event_type === 'time_specific' && data.start_time && !data.end_time) {
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);
      
      data.end_time = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Remove the is_continuous_active field before submitting
    const { is_continuous_active, ...submitData } = data;
    onSubmit(submitData);
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {event?.id ? 'עריכת אירוע' : 'אירוע חדש'}
        </h2>
        <button 
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              כותרת <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title', { required: 'כותרת היא שדה חובה' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="הזן כותרת"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>
          
          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סוג אירוע
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className={`flex items-center justify-center px-3 py-2 border rounded-md cursor-pointer ${selectedEventType === 'continuous' ? 'bg-red-100 border-red-500' : 'border-gray-300'}`}>
                <input
                  type="radio"
                  value="continuous"
                  {...register('event_type')}
                  className="sr-only"
                />
                <span>מתמשך</span>
              </label>
              <label className={`flex items-center justify-center px-3 py-2 border rounded-md cursor-pointer ${selectedEventType === 'full_day' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}>
                <input
                  type="radio"
                  value="full_day"
                  {...register('event_type')}
                  className="sr-only"
                />
                <span>יום מלא</span>
              </label>
              <label className={`flex items-center justify-center px-3 py-2 border rounded-md cursor-pointer ${selectedEventType === 'time_specific' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}>
                <input
                  type="radio"
                  value="time_specific"
                  {...register('event_type')}
                  className="sr-only"
                />
                <span>שעה מוגדרת</span>
              </label>
            </div>
          </div>
          
          {/* Continuous Event Toggle */}
          {selectedEventType === 'continuous' && (
            <div className="mt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('is_continuous_active')}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="mr-2 text-sm text-gray-700">אירוע מתמשך פעיל (ללא תאריך סיום)</span>
              </label>
            </div>
          )}
          
          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center">
                  <Calendar size={16} className="ml-1" />
                  <span>תאריך התחלה</span>
                </div>
              </label>
              <input
                type="date"
                {...register('start_date', { required: 'תאריך התחלה הוא שדה חובה' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
              )}
            </div>
            
            {(eventType === 'full_day' || (eventType === 'continuous' && !isContinuousActive)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center">
                    <Calendar size={16} className="ml-1" />
                    <span>תאריך סיום</span>
                  </div>
                </label>
                <input
                  type="date"
                  {...register('end_date')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            {eventType === 'time_specific' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center">
                      <Clock size={16} className="ml-1" />
                      <span>שעת התחלה <span className="text-red-500">*</span></span>
                    </div>
                  </label>
                  <input
                    type="time"
                    {...register('start_time', { 
                      required: eventType === 'time_specific' ? 'שעת התחלה היא שדה חובה' : false 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.start_time && (
                    <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center">
                      <Clock size={16} className="ml-1" />
                      <span>שעת סיום</span>
                    </div>
                  </label>
                  <input
                    type="time"
                    {...register('end_time')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">אם לא תוזן שעת סיום, האירוע יוגדר לשעה אחת</p>
                </div>
              </>
            )}
          </div>
          
          {/* Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center">
                <FileText size={16} className="ml-1" />
                <span>פרטים</span>
              </div>
            </label>
            <textarea
              {...register('details')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="הזן פרטים נוספים"
            />
          </div>
          
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center">
                <Bookmark size={16} className="ml-1" />
                <span>הערות</span>
              </div>
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="הזן הערות"
            />
          </div>
          
          {/* Color Picker - Only show for non-continuous events */}
          {selectedEventType !== 'continuous' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center">
                  <Tag size={16} className="ml-1" />
                  <span>צבע</span>
                </div>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((color) => (
                  <label 
                    key={color.value}
                    className={`flex flex-col items-center p-2 border rounded-md cursor-pointer ${
                      selectedColor === color.value ? 'ring-2 ring-blue-500' : 'border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={color.value}
                      {...register('color')}
                      className="sr-only"
                    />
                    <div 
                      className="w-8 h-8 rounded-full mb-1" 
                      style={{ backgroundColor: color.value }}
                    ></div>
                    <span className="text-xs">{color.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* Status */}
          {event?.id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                סטטוס
              </label>
              <div className="flex items-center space-x-4 space-x-reverse">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="active"
                    {...register('status')}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="mr-2">פעיל</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="archived"
                    {...register('status')}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="mr-2">בארכיון</span>
                </label>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 space-x-reverse">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            ביטול
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {event?.id ? 'עדכון' : 'יצירה'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventForm;