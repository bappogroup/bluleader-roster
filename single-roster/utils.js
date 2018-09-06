// Format a date into ISO string e.g. 2018-01-01
export function formatDate(d) {
  const date = new Date(d);
  return (
    date.getFullYear() +
    "-" +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + date.getDate()).slice(-2)
  );
}

export function getMonday(d) {
  const _d = new Date(d);
  const day = _d.getDay();
  const diff = _d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(_d.setDate(diff));
}

export function addWeeks(date, weeks) {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + weeks * 7);
  return newDate;
}

export function getWeeksDifference(date1, date2) {
  return Math.round((getMonday(date1) - getMonday(date2)) / 604800000);
}
