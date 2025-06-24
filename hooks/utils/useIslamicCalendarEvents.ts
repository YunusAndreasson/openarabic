import moment from 'moment-hijri';
import { useMemo } from 'react';

import { HIJRI_MONTHS } from '@/constants/hijri';
import { STRINGS } from '@/constants/strings';


interface IslamicEvent {
  name: string;
  arabicName: string;
  month: number;
  day: number;
  duration?: number; // For multi-day events
}

// Core Islamic events
const ISLAMIC_EVENTS: IslamicEvent[] = [
  { name: 'Muharram', arabicName: 'محرم', month: 1, day: 1 },
  { name: 'Ashura', arabicName: 'عاشوراء', month: 1, day: 10 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 1, day: 13, duration: 3 },
  { name: 'Safar', arabicName: 'صفر', month: 2, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 2, day: 13, duration: 3 },
  { name: "Rabi' al-Awwal", arabicName: 'ربيع الأول', month: 3, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 3, day: 13, duration: 3 },
  { name: "Rabi' al-Thani", arabicName: 'ربيع الثاني', month: 4, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 4, day: 13, duration: 3 },
  { name: 'Jumada al-Awwal', arabicName: 'جمادى الأولى', month: 5, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 5, day: 13, duration: 3 },
  { name: 'Jumada al-Thani', arabicName: 'جمادى الثانية', month: 6, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 6, day: 13, duration: 3 },
  { name: 'Rajab', arabicName: 'رجب', month: 7, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 7, day: 13, duration: 3 },
  { name: "Sha'ban", arabicName: 'شعبان', month: 8, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 8, day: 13, duration: 3 },
  { name: 'Ramadan', arabicName: 'رمضان', month: 9, day: 1, duration: 30 },
  { name: 'Last 10 Days', arabicName: 'العشر الأواخر', month: 9, day: 21, duration: 10 },
  { name: 'Laylatul Qadr', arabicName: 'ليلة القدر', month: 9, day: 27 },
  { name: 'Shawwal', arabicName: 'شوال', month: 10, day: 1 },
  { name: 'Eid al-Fitr', arabicName: 'عيد الفطر', month: 10, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 10, day: 13, duration: 3 },
  { name: "Dhu al-Qi'dah", arabicName: 'ذو القعدة', month: 11, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 11, day: 13, duration: 3 },
  { name: 'Dhul Hijjah', arabicName: 'ذو الحجة', month: 12, day: 1 },
  { name: 'First 10 Days', arabicName: 'العشر الأوائل', month: 12, day: 1, duration: 10 },
  { name: 'Day of Arafah', arabicName: 'يوم عرفة', month: 12, day: 9 },
  { name: 'Eid al-Adha', arabicName: 'عيد الأضحى', month: 12, day: 10 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 12, day: 13, duration: 3 },
];

interface EventWithDate extends IslamicEvent {
  hijriDate: string;
  gregorianDate: Date;
  daysFromNow: number;
  isActive?: boolean;
  progress?: number;
}

function getCurrentHijriDate() {
  const now = moment();
  const hijriDay = now.iDate();
  const hijriMonth = HIJRI_MONTHS[now.iMonth()];
  const hijriYear = now.iYear();
  return `${hijriDay} ${hijriMonth} ${hijriYear} AH`;
}

function calculateUpcomingEvents(): EventWithDate[] {
  const events: EventWithDate[] = [];
  const currentHijriYear = moment().iYear();
  const now = Date.now();

  for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
    const targetYear = currentHijriYear + yearOffset;

    ISLAMIC_EVENTS.forEach(event => {
      const hijriMoment = moment()
        .iYear(targetYear)
        .iMonth(event.month - 1)
        .iDate(event.day);
      const gregorianDate = hijriMoment.toDate();
      const daysFromNow = Math.ceil((gregorianDate.getTime() - now) / (1000 * 60 * 60 * 24));

      if (daysFromNow >= -30) {
        // Show events from 30 days ago to future
        let isActive = false;
        let progress = 0;

        // Check if event is currently active (for multi-day events)
        if (event.duration && daysFromNow <= 0) {
          const daysSinceStart = Math.abs(daysFromNow);
          if (daysSinceStart < event.duration) {
            isActive = true;
            progress = (daysSinceStart + 1) / event.duration;
          }
        }

        events.push({
          ...event,
          hijriDate: `${event.day} ${HIJRI_MONTHS[event.month - 1]} ${targetYear} AH`,
          gregorianDate,
          daysFromNow,
          isActive,
          progress,
        });
      }
    });
  }

  return events.sort((a, b) => a.daysFromNow - b.daysFromNow).slice(0, 25);
}

export const formatDaysUntil = (days: number): string => {
  if (days === 0) return STRINGS.TODAY;
  if (days === 1) return STRINGS.TOMORROW;
  if (days < 0) {
    const daysPast = Math.abs(days);
    if (daysPast === 1) return STRINGS.YESTERDAY;
    if (daysPast <= 7) {
      return STRINGS.DAYS_AGO_TEMPLATE.replace('{days}', daysPast.toString());
    }
    return STRINGS.PAST;
  }
  if (days <= 7) {
    return STRINGS.IN_DAYS_TEMPLATE.replace('{days}', days.toString());
  }
  if (days <= 30) {
    return STRINGS.IN_WEEKS_TEMPLATE.replace(
      '{weeks}',
      Math.ceil(days / 7).toString(),
    );
  }
  if (days <= 365) {
    return STRINGS.IN_MONTHS_TEMPLATE.replace(
      '{months}',
      Math.ceil(days / 30).toString(),
    );
  }
  return STRINGS.IN_YEARS_TEMPLATE.replace(
    '{years}',
    Math.ceil(days / 365).toString(),
  );
};

export function useIslamicCalendarEvents() {
  const events = useMemo(calculateUpcomingEvents, []);
  const currentHijriDate = useMemo(getCurrentHijriDate, []);

  return { events, currentHijriDate };
}

export type { IslamicEvent, EventWithDate };
