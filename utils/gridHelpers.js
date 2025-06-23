import { subDays, format, eachDayOfInterval, getDay, startOfWeek } from 'date-fns';

export const STATUSES = {
  ANSWERED: 'answered',
  NOT_ANSWERED: 'not_answered',
  WRONG: 'wrong',
  MARKED_FOR_REVIEW: 'marked_for_review',
};



export const STATUS_COLORS = {
  [STATUSES.ANSWERED]: 'bg-green-500',
  [STATUSES.NOT_ANSWERED]: 'bg-gray-300',
  [STATUSES.WRONG]: 'bg-red-500',
  [STATUSES.MARKED_FOR_REVIEW]: 'bg-purple-600',
};

export const generateMockData = (days)=> {
  const endDate = new Date();
  const startDate = subDays(endDate, days - 1);

  return eachDayOfInterval({ start: startDate, end: endDate }).map((date) => ({
    date: format(date, 'yyyy-MM-dd'),
    status: Object.values(STATUSES)[Math.floor(Math.random() * 4)] ,
  }));
};

export const getWeekLabels = () => {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const weekStart = startOfWeek(today);
  return weekDays.map((day, index) => ({
    day,
    isCurrentDay: getDay(today) === index,
  }));
};

