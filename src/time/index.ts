// Game time for any game: the date of the story, counted in days from the start of the adventure, durations, and the calendar that shows a date as a day of a month.
export { type Calendar, type CalendarDay, calendarDay, type CalendarMonth, type CalendarStart, formatCalendarDay, readCalendar, readCalendarStart, realCalendar } from "./calendar.ts";
export { addDuration, formatDuration, formatGameDate, type GameDate, lastGameDay, minutesBetween, readDuration, readGameDate } from "./game-date.ts";
