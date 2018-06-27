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
        cells[`T&M Project Revenue-${month.label}`].value -
          cells[`T&M Project Cost-${month.label}`].value,
      ),
    );
    data.splice(3, 0, projectMarginRow, []);

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
          peopleMarginRow.data[index + 1] -
          cells[`Overheads-${month.label}`].value,
      );
    });
    data.splice(8, 0, peopleMarginRow, []);
    data.push([], netProfitRow);

    this.state = { data };
  }

  renderCell = (data, params) => {
    const { key, elementKey, index } = params;

    const month = this.props.months[index];
    // let component;
    const otherParams = {};

    if (!elementKey) {
      // Totals
      return (
        <Cell key={key}>
          <Text>{data}</Text>
        </Cell>
      );
    }

    // switch (elementKey) {
    //   case 'SAL':
    //   case 'BON':
    //   case 'PTAXP':
    //   case 'LEA':
    //     component = 'DrilldownConsultants';
    //     break;
    //   case 'PTAXC':
    //   case 'CWAGES':
    //     component = 'DrilldownContractors';
    //     break;
    //   case 'FIXREV':
    //     // TODO
    //     break;
    //   case 'TMREV':
    //     // TODO
    //     break;
    //   default:
    //     component = 'DrilldownPlain';
    //     otherParams.elementKey = elementKey;
    // }

    return (
      <ButtonCell
        key={key}
        onPress={() =>
          this.props.openReport({
            name: `Report on ${month.label}`,
            component: 'Drilldown',
            params: { month, ...otherParams },
          })
        }
      >
        <Text>{data}</Text>
      </ButtonCell>
    );
  };

  render() {
    const { data } = this.state;
    if (!data) return <ActivityIndicator />;

    return (
      <Container>
        <BappoTable renderCell={this.renderCell} data={data} />
      </Container>
    );
  }
}

export default MainReport;

const Container = styled(View)`
  flex: 1;
`;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: 1;
`;

const ButtonCell = styled(Button)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;
