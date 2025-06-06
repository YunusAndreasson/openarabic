declare module 'moment-hijri' {
  import type { Moment } from 'moment';

  interface HijriMoment extends Moment {
    iYear(): number;
    iYear(year: number): HijriMoment;
    iMonth(): number;
    iMonth(month: number): HijriMoment;
    iDate(): number;
    iDate(date: number): HijriMoment;
  }

  function moment(): HijriMoment;
  function moment(date?: Date | Moment | number | string): HijriMoment;

  export = moment;
}
