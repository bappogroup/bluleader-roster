import React from "react";
import moment from "moment";
import { AutoSizer, MultiGrid } from "react-virtualized";
import { styled, View, TouchableView, Text } from "bappo-components";

/**
 * Return a list of appended date object, to be used as the first row
 * @param {momentObj} startDate
 * @param {momentObj} endDate
 */
function getDateRow(startDate, endDate) {
  const dateFormat = "YYYY-MM-DD";
  const datesToArray = (from, to) => {
    const list = [];
    let day = moment(from).clone();

    do {
      list.push(day);
      day = day.clone().add(1, "d");
    } while (day <= moment(to));
    return list;
  };
  const dateRow = datesToArray(startDate, endDate).map((date, index) => {
    let labelFormat = "DD";
    if (date.day() === 1 || index === 0) labelFormat = "MMM DD";

    return {
      formattedDate: date.format(labelFormat),
      weekday: date.format("ddd"),
      isWeekend: date.day() === 6 || date.day() === 0,
      date
    };
  });
  dateRow.unshift("");
  return dateRow;
}

function GridView({ requests, durationInWeeks = 52 }) {
  // Dimensions
  const CELL_DIMENSION = 45;
  const FIRST_COLUMN_WIDTH = 160;

  let gridRef;
  const dateRow = getDateRow(moment(), moment().add(durationInWeeks, "weeks"));

  const cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
    let backgroundColor = "#f8f8f8";
    const date = dateRow[columnIndex];

    if (rowIndex === 0) {
      // Date row
      let color = "black";
      if (date.isWeekend) color = "lightgrey";
      return (
        <DateCell key={key} style={style} color={color}>
          <Text>{date.weekday}</Text>
          <Text>{date.formattedDate}</Text>
        </DateCell>
      );
    }

    return (
      <EntryCell key={key} style={style} backgroundColor={backgroundColor}>
        <Text>asd</Text>
      </EntryCell>
    );
  };

  const columnWidthGetter = ({ index }) =>
    index === 0 ? FIRST_COLUMN_WIDTH : CELL_DIMENSION;

  return (
    <Container>
      <AutoSizer>
        {({ height, width }) => (
          <MultiGrid
            width={width}
            height={height}
            fixedColumnCount={1}
            fixedRowCount={1}
            cellRenderer={cellRenderer}
            columnCount={dateRow.length}
            columnWidth={columnWidthGetter}
            rowCount={requests.length + 1}
            rowHeight={CELL_DIMENSION}
            ref={ref => (gridRef = ref)}
          />
        )}
      </AutoSizer>
    </Container>
  );
}

export default GridView;

const Container = styled(View)`
  flex: 1;
`;

const baseStyle = `
  margin-left: 2px;
  margin-right: 2px;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  font-size: 12px;
`;

const DateCell = styled(View)`
  ${baseStyle}
`;

const RequestCell = styled(TouchableView)`
  ${baseStyle}
  background-color: white;
`;

const EntryCell = styled(View)`
  ${baseStyle} background-color: ${props => props.backgroundColor};

  border: 1px solid #eee;

  ${props => (props.blur ? "filter: blur(3px); opacity: 0.5;" : "")};
`;
