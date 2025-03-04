import moment from 'moment-timezone';

export interface Holiday {
  id: string;
  title: string;
  start: string; // ISO date string
  end?: string; // ISO date string
  allDay: boolean;
  color: string;
  display: string;
  extendedProps: {
    type: 'holiday' | 'memorial' | 'event';
    description?: string;
  };
}

// Function to get holidays for a specific year
export const getIsraeliHolidays = (year: number): Holiday[] => {
  // This is a simplified implementation
  // In a real app, you would use a Hebrew calendar library to calculate the exact dates
  // or use an API to fetch the holidays
  
  const holidays: Holiday[] = [
    // Fixed dates (Gregorian calendar)
    {
      id: `independence-day-${year}`,
      title: 'יום העצמאות',
      start: `${year}-05-14`, // Approximate - should be calculated based on Hebrew calendar
      allDay: true,
      color: '#3B82F6',
      display: 'auto',
      extendedProps: {
        type: 'holiday',
        description: 'יום העצמאות של מדינת ישראל'
      }
    },
    {
      id: `memorial-day-${year}`,
      title: 'יום הזיכרון',
      start: `${year}-05-13`, // Approximate - should be calculated based on Hebrew calendar
      allDay: true,
      color: '#6B7280',
      display: 'auto',
      extendedProps: {
        type: 'memorial',
        description: 'יום הזיכרון לחללי מערכות ישראל ונפגעי פעולות האיבה'
      }
    },
    {
      id: `holocaust-day-${year}`,
      title: 'יום השואה',
      start: `${year}-04-27`, // Approximate - should be calculated based on Hebrew calendar
      allDay: true,
      color: '#6B7280',
      display: 'auto',
      extendedProps: {
        type: 'memorial',
        description: 'יום הזיכרון לשואה ולגבורה'
      }
    },
    
    // Jewish holidays (approximate dates for the given year)
    {
      id: `rosh-hashana-${year}`,
      title: 'ראש השנה',
      start: `${year}-09-25`, // Approximate - should be calculated based on Hebrew calendar
      end: `${year}-09-27`, // Approximate - should be calculated based on Hebrew calendar
      allDay: true,
      color: '#F59E0B',
      display: 'auto',
      extendedProps: {
        type: 'holiday',
        description: 'ראש השנה'
      }
    },
    {
      id: `yom-kippur-${year}`,
      title: 'יום כיפור',
      start: `${year}-10-04`, // Approximate - should be calculated based on Hebrew calendar
      allDay: true,
      color: '#F59E0B',
      display: 'auto',
      extendedProps: {
        type: 'holiday',
        description: 'יום הכיפורים'
      }
    },
    {
      id: `sukkot-${year}`,
      title: 'סוכות',
      start: `${year}-10-09`, // Approximate - should be calculated based on Hebrew calendar
      end: `${year}-10-16`, // Approximate - should be calculated based on Hebrew calendar
      allDay: true,
      color: '#F59E0B',
      display: 'auto',
      extendedProps: {
        type: 'holiday',
        description: 'חג הסוכות'
      }
    },
    {
      id: `hanukkah-${year}`,
      title: 'חנוכה',
      start: `${year}-12-18`, // Approximate - should be calculated based on Hebrew calendar
      end: `${year}-12-26`, // Approximate - should be calculated based on Hebrew calendar
      allDay: true,
      color: '#F59E0B',
      display: 'auto',
      extendedProps: {
        type: 'holiday',
        description: 'חג החנוכה'
      }
    },
    {
      id: `purim-${year}`,
      title: 'פורים',
      start: `${year}-03-16`, // Approximate - should be calculated based on Hebrew calendar
      allDay: true,
      color: '#F59E0B',
      display: 'auto',
      extendedProps: {
        type: 'holiday',
        description: 'חג הפורים'
      }
    },
    {
      id: `passover-${year}`,
      title: 'פסח',
      start: `${year}-04-15`, // Approximate - should be calculated based on Hebrew calendar
      end: `${year}-04-22`, // Approximate - should be calculated based on Hebrew calendar
      allDay: true,
      color: '#F59E0B',
      display: 'auto',
      extendedProps: {
        type: 'holiday',
        description: 'חג הפסח'
      }
    },
    {
      id: `shavuot-${year}`,
      title: 'שבועות',
      start: `${year}-06-04`, // Approximate - should be calculated based on Hebrew calendar
      allDay: true,
      color: '#F59E0B',
      display: 'auto',
      extendedProps: {
        type: 'holiday',
        description: 'חג השבועות'
      }
    }
  ];
  
  return holidays;
};

// Get holidays for the current year and next three years
export const getAllHolidays = (): Holiday[] => {
  const currentYear = moment().year();
  return [
    ...getIsraeliHolidays(currentYear),
    ...getIsraeliHolidays(currentYear + 1),
    ...getIsraeliHolidays(currentYear + 2),
    ...getIsraeliHolidays(currentYear + 3)
  ];
}; 