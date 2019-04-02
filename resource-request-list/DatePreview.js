import React from "react";
import { styled, View, Text } from "bappo-components";
import moment from "moment";

const inputDateFormat = "YYYY-MM-DD";
// 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'

const DatePreview = ({ datesString }) => {
  const months = [];

  const dateArr = datesString.split(", ");
  dateArr.forEach(date => {
    const m = moment(date, inputDateFormat);
    const monthIndex = m.month();
    const day = m.format("DD");
    if (!months[monthIndex])
      months[monthIndex] = { index: monthIndex, days: [] };
    months[monthIndex].days.push(day);
  });

  const renderMonthRow = month => {
    if (!(month && month.days && month.days.length > 0)) return;

    const { index, days } = month;
    const monthStart = moment()
      .month(index)
      .startOf("month");
    const monthEnd = moment()
      .month(index)
      .endOf("month");
    const dayArr = [];
    for (
      let i = monthStart.clone();
      i.isSameOrBefore(monthEnd);
      i.add(1, "day")
    ) {
      dayArr.push(i.format("DD"));
    }

    return (
      <MonthRow key={index}>
        <View style={{ width: 32 }}>
          <Text style={{ fontWeight: "bold" }}>{monthStart.format("MMM")}</Text>
        </View>
        {dayArr.map(day => (
          <Day key={day} selected={days.includes(day)}>
            {day}
          </Day>
        ))}
      </MonthRow>
    );
  };

  return <Container>{months.map(renderMonthRow)}</Container>;
};

export default DatePreview;

const Container = styled(View)`
  margin-top: 8px;
  margin-bottom: 8px;
  overflow-x: auto;
`;

const MonthRow = styled(View)`
  flex-direction: row;
`;

const Day = styled(Text)`
  margin-left: 4px;
  margin-right: 6px;
  color: ${props => (props.selected ? "black" : "lightgray")};
`;
