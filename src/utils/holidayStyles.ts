// CSS styles for holidays
export const holidayStyles = `
  .holiday-event {
    background-color: rgba(251, 191, 36, 0.2) !important;
    border-color: #F59E0B !important;
    border-width: 2px !important;
    box-shadow: 0 0 5px rgba(245, 158, 11, 0.5) !important;
  }
  
  .holiday-title {
    font-weight: bold;
    color: #000000 !important;
    font-size: 1rem;
    text-shadow: 0 0 1px rgba(255, 255, 255, 0.8);
  }
  
  .holiday-container {
    display: flex;
    align-items: center;
    padding: 2px 4px;
    background-color: rgba(251, 191, 36, 0.1);
    border-radius: 4px;
  }
  
  .fc-daygrid-day-top .fc-daygrid-day-number {
    position: relative;
    z-index: 4;
  }
  
  .fc-daygrid-day-events {
    min-height: 2em;
  }
  
  /* Force holiday text to be black */
  .fc-event.holiday-event .fc-event-title,
  .fc-event.holiday-event .fc-event-time,
  .fc-event.holiday-event .holiday-title,
  .fc-event.holiday-event .text-sm {
    color: #000000 !important;
  }
`; 