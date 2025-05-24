declare module 'moment-hijri' {
  import { Moment } from 'moment';

  interface HijriMoment extends Moment {
    iYear(): number;
    iYear(year: number): HijriMoment;
    iMonth(): number;
    iMonth(month: number): HijriMoment;
    iDate(): number;
    iDate(date: number): HijriMoment;
  }

  function moment(): HijriMoment;
  function moment(date?: string | number | Date | Moment): HijriMoment;

  export = moment;
}
