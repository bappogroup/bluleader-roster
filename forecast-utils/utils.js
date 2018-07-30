import moment from "moment";

export const calculatePartialMonth = ({
  month,
  consultantStartDate,
  consultantEndDate
}) => {
  // Calculate partial monthly salary: how many days of this month is with in consultant's start/end date
  // Consultant start date is required, while end date is optional
  let validDays = 0;
  const { firstDay } = month;
  const totalDays = moment(firstDay).daysInMonth();
  const monthStart = moment(firstDay).startOf("month");
  const monthEnd = moment(firstDay).endOf("month");
  const consultantStart = moment(consultantStartDate);
  const consultantEnd = consultantEndDate && moment(consultantEndDate);

  for (let m = monthStart; m.isBefore(monthEnd); m.add(1, "days")) {
    if (consultantEnd) {
      if (m.isSameOrAfter(consultantStart) && m.isSameOrBefore(consultantEnd)) {
        validDays++;
      }
    } else if (m.isSameOrAfter(consultantStart)) {
      validDays++;
    }
  }

  return validDays / totalDays;
};
