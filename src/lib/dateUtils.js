import { addDays, isWeekend, startOfDay, format, isBefore, isSameDay } from 'date-fns';
import { enUS, es } from 'date-fns/locale';

/**
 * Adds business days to a given date.
 * Skips Saturdays and Sundays.
 */
export function addBusinessDays(date, days) {
  let currentDate = startOfDay(new Date(date));
  let addedDays = 0;
  
  while (addedDays < days) {
    currentDate = addDays(currentDate, 1);
    // 0 is Sunday, 6 is Saturday in date-fns
    if (!isWeekend(currentDate)) {
      addedDays++;
    }
  }
  return currentDate;
}

/**
 * Formats date into readable string
 */
export function formatDate(date) {
  return format(new Date(date), "dd MMM yyyy", { locale: es });
}

/**
 * Checks if a payment is available compared to current date
 */
export function isPaymentAvailable(availableDate) {
  const today = startOfDay(new Date());
  const aDate = startOfDay(new Date(availableDate));
  
  return isBefore(aDate, today) || isSameDay(aDate, today);
}
