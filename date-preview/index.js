import React from "react";
import { styled, View, Text } from "bappo-components";
import moment from "moment";

const inputDateFormat = "YYYY-MM-DD";
// 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'

const YearlyDatePreview = ({ year, dateArr }) => {
  const months = [];
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

    const emptyCells = [];
    for (let i = 1; i < monthStart.weekday(); i++) {
      emptyCells.push(<DayContainer />);
    }

    return (
      <MonthRow key={index}>
        <View style={{ width: 32 }}>
          <Text>{monthStart.format("MMM")}</Text>
        </View>
        {emptyCells}
        {dayArr.map(day => (
          <DayContainer>
            <Day key={day} selected={days.includes(day)}>
              {day}
            </Day>
          </DayContainer>
        ))}
      </MonthRow>
    );
  };

  return (
    <YearContainer>
      <View style={{ marginBottom: 8 }}>
        <Text>{year}</Text>
      </View>
      {months.map(renderMonthRow)}
    </YearContainer>
  );
};

/**
 * @param {string} props.datesString example: '2019-03-02, 2020-04-10'
 */
const DatePreview = ({ datesString }) => {
  const dateArr = datesString.split(", ");
  const yearToDates = {};
  dateArr.forEach(date => {
    const year = date.slice(0, 4);
    if (!yearToDates[year]) yearToDates[year] = [];

    yearToDates[year].push(date);
  });

  return (
    <View>
      {Object.entries(yearToDates).map(([year, dateArr]) => (
        <YearlyDatePreview year={year} dateArr={dateArr} />
      ))}
    </View>
  );
};

export default DatePreview;

const YearContainer = styled(View)`
  margin-top: 8px;
  margin-bottom: 8px;
  overflow-x: auto;
`;

const MonthRow = styled(View)`
  flex-direction: row;
`;

const DayContainer = styled(View)`
  width: 24px;
`;

const Day = styled(Text)`
  color: ${props => (props.selected ? "black" : "lightgray")};
`;
