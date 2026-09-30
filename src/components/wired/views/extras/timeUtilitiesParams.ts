/**
 * Int params of the time-utilities add-on: `[mask, mode]`. Bit `id` of the mask creates the
 * sub-variable with that id; calendar parts are ids 1-10, time units since 1970 are ids 20-26.
 */
export const TIME_UTIL_MODE_VALUE = 0;
export const TIME_UTIL_MODE_CREATION_TIME = 1;
export const TIME_UTIL_MODE_LAST_UPDATE_TIME = 2;

export const TIME_UTIL_MODES = [TIME_UTIL_MODE_VALUE, TIME_UTIL_MODE_CREATION_TIME, TIME_UTIL_MODE_LAST_UPDATE_TIME];

export interface ITimeUtilSubVariable {
    id: number;
    name: string;
    label: string;
}

export const TIME_UTIL_SUB_VARIABLES: ITimeUtilSubVariable[] = [
    { id: 1, name: 'millisecond_of_second', label: 'Millisecond of the second' },
    { id: 2, name: 'seconds_of_minute', label: 'Second of the minute' },
    { id: 3, name: 'minute_of_hour', label: 'Minute of the hour' },
    { id: 4, name: 'hour_of_day', label: 'Hour of the day' },
    { id: 5, name: 'day_of_week', label: 'Day of the week' },
    { id: 6, name: 'day_of_month', label: 'Day of the month' },
    { id: 7, name: 'day_of_year', label: 'Day of the year' },
    { id: 8, name: 'week_of_year', label: 'Week of the year' },
    { id: 9, name: 'month_of_year', label: 'Month of the year' },
    { id: 10, name: 'year', label: 'Year' }
];

export const TIME_UTIL_ADVANCED_SUB_VARIABLES: ITimeUtilSubVariable[] = [
    { id: 20, name: 'millisecond', label: 'Milliseconds' },
    { id: 21, name: 'second', label: 'Seconds' },
    { id: 22, name: 'minute', label: 'Minutes' },
    { id: 23, name: 'hour', label: 'Hours' },
    { id: 24, name: 'day', label: 'Days' },
    { id: 25, name: 'week', label: 'Weeks' },
    { id: 26, name: 'month', label: 'Months' }
];

const VALID_MASK = [...TIME_UTIL_SUB_VARIABLES, ...TIME_UTIL_ADVANCED_SUB_VARIABLES].reduce((mask, subVariable) => mask | (1 << subVariable.id), 0);

export const normalizeTimeUtilMask = (value: number) => (Number.isInteger(value) ? value & VALID_MASK : 0);

export const normalizeTimeUtilMode = (value: number) => (TIME_UTIL_MODES.includes(value) ? value : TIME_UTIL_MODE_VALUE);

export const isTimeUtilSubVariableSelected = (mask: number, id: number) => (mask & (1 << id)) !== 0;

export const setTimeUtilSubVariableSelected = (mask: number, id: number, selected: boolean) =>
    normalizeTimeUtilMask(selected ? mask | (1 << id) : mask & ~(1 << id));
