import React from 'react';
import { X, Calendar, Clock, FileText, Bookmark, Edit, Trash, Archive } from 'lucide-react';
import { Event } from '../types/event';
import { formatDate, formatTime } from '../utils/dateUtils';

interface EventModalProps {
  event: Event;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ 
  event, 
  onClose, 
  onEdit, 
  onDelete,
  onArchive
}) => {
  // Determine badge color - continuous events are always red
  const badgeColor = event.event_type === 'continuous' ? '#EF4444' : event.color;
  const badgeTextColor = ['#FFFFFF', '#FFFF00'].includes(badgeColor) ? '#000000' : '#FFFFFF';
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-auto" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 truncate">{event.title}</h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
      </div>
      
      <div className="space-y-4 mb-6">
        {/* Event Type Badge */}
        <div className="flex items-center">
          <span 
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{ 
              backgroundColor: badgeColor,
              color: badgeTextColor
            }}
          >
            {event.event_type === 'continuous' && 'מתמשך'}
            {event.event_type === 'full_day' && 'יום מלא'}
            {event.event_type === 'time_specific' && 'שעה מוגדרת'}
          </span>
          
          {event.status === 'archived' && (
            <span className="mr-2 px-3 py-1 bg-gray-200 rounded-full text-sm font-medium text-gray-700">
              בארכיון
            </span>
          )}
        </div>
        
        {/* Date and Time */}
        <div className="flex items-start">
          <Calendar size={20} className="text-gray-500 ml-2 mt-1" />
          <div>
            <p className="text-gray-700">
              {event.event_type === 'continuous' && 'אירוע מתמשך'}
              {event.event_type === 'full_day' && 'אירוע יום מלא'}
              {event.event_type === 'time_specific' && 'אירוע בשעה מוגדרת'}
            </p>
            <p className="text-gray-700">
              {formatDate(event.start_date)}
              {event.end_date && event.end_date !== event.start_date && ` - ${formatDate(event.end_date)}`}
            </p>
            {event.event_type === 'time_specific' && event.start_time && (
              <div className="flex items-center mt-1">
                <Clock size={16} className="text-gray-500 ml-1" />
                <p className="text-gray-700">
                  {event.start_time}
                  {event.end_time && ` - ${event.end_time}`}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Details */}
        {event.details && (
          <div className="flex items-start">
            <FileText size={20} className="text-gray-500 ml-2 mt-1" />
            <div>
              <h3 className="text-sm font-medium text-gray-700">פרטים</h3>
              <p className="text-gray-700 whitespace-pre-line">{event.details}</p>
            </div>
          </div>
        )}
        
        {/* Notes */}
        {event.notes && (
          <div className="flex items-start">
            <Bookmark size={20} className="text-gray-500 ml-2 mt-1" />
            <div>
              <h3 className="text-sm font-medium text-gray-700">הערות</h3>
              <p className="text-gray-700 whitespace-pre-line">{event.notes}</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-3 space-x-reverse">
        {event.status === 'active' && (
          <button
            onClick={onArchive}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <Archive size={16} className="ml-1" />
            העבר לארכיון
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex items-center px-3 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
        >
          <Trash size={16} className="ml-1" />
          מחק
        </button>
        <button
          onClick={onEdit}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Edit size={16} className="ml-1" />
          ערוך
        </button>
      </div>
    </div>
  );
};

export default EventModal;