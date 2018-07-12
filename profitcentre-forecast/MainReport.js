import React from 'react';
import { View, Text, styled, Button, ActivityIndicator } from 'bappo-components';
import BappoTable from 'bappo-table';
import { pcForecastElements } from 'forecast-utils';

class MainReport extends React.Component {
  constructor(props) {
    super(props);

    const { months } = props;
    const { cells } = props.mainReportData;

    // Calculate data for table
    const data = [];

    // Month row
    const monthRow = [''];
    months.forEach(month => monthRow.push(month.label));
    data.push(monthRow);

    pcForecastElements.forEach(ele => {
      const row = {
        elementKey: ele,
        data: [ele],
      };
      months.forEach(month => row.data.push(cells[`${ele}-${month.label}`].value));
      data.push(row);
    });

    const projectMarginRow = {
      rowStyle: 'total',
      data: ['Project Margin'],
    };
    months.forEach(month =>
      projectMarginRow.data.push(
        cells[`T&M Project Revenue-${month.label}`].value +
          cells[`Fixed Price Project Revenue-${month.label}`].value -
          cells[`Project Cost-${month.label}`].value -
          cells[`Project Expense-${month.label}`].value,
      ),
    );
    data.splice(5, 0, projectMarginRow, []);

    const peopleMarginRow = {
      rowStyle: 'total',
      data: ['People Margin'],
    };
    const netProfitRow = {
      rowStyle: 'total',
      data: ['Net Profit'],
    };
    months.forEach((month, index) => {
      peopleMarginRow.data.push(
        cells[`People Cost Recovery-${month.label}`].value -
          cells[`Consultant Cost(permanent)-${month.label}`].value -
          cells[`Consultant Cost(contractor)-${month.label}`].value,
      );
      netProfitRow.data.push(
        projectMarginRow.data[index + 1] +
          peopleMarginRow.data[index + 1] +
          cells[`Other Revenue-${month.label}`].value -
          cells[`Overheads-${month.label}`].value,
      );
    });
    data.splice(10, 0, peopleMarginRow, []);
    data.push([], netProfitRow);

    this.state = { data };
  }

  renderHeaderCell = (data, { key, index }) => {
    const month = this.props.months[index];

    return (
      <ButtonCell
        key={key}
        onPress={() =>
          this.props.openReport({
            name: `Report on ${month.label}`,
            component: 'Drilldown',
            params: { month },
          })
        }
      >
        <Text style={{ color: 'white' }}>{data}</Text>
      </ButtonCell>
    );
  };

  render() {
    const { data } = this.state;
    if (!data) return <ActivityIndicator />;

    return (
      <Container>
        <BappoTable renderHeaderCell={this.renderHeaderCell} data={data} />
      </Container>
    );
  }
}

export default MainReport;

const Container = styled(View)`
  flex: 1;
`;

const ButtonCell = styled(Button)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;
