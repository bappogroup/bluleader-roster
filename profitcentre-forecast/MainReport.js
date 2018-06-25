import React from 'react';
import { View, Text, styled, Button, ActivityIndicator } from 'bappo-components';
import BappoTable from 'bappo-table';
import { calculateProfitCentreMainReport } from 'forecast-utils';

const forecastElements = [
  'T&M Project Revenue',
  'T&M Project Cost',
  'People Cost Recovery',
  'People Cost',
  'Overheads',
];

class MainReport extends React.Component {
  constructor(props) {
    super(props);

    const { months, rawData } = props;

    const { cells } = calculateProfitCentreMainReport({
      months,
      ...rawData,
    });
    console.log(cells);

    // Calculate data for table
    const data = [];

    // Month row
    const monthRow = [''];
    months.forEach(month => monthRow.push(month.label));
    data.push(monthRow);

    forecastElements.forEach(ele => {
      const row = {
        elementName: ele,
        data: [ele],
      };
      months.forEach(month => row.data.push(cells[`${ele}-${month.label}`].value));
      data.push(row);
    });

    // Project Revenue
    // const revenueRow = ['T&M Project Revenue'];
    // months.forEach(month => revenueRow)

    this.state = { data };
  }

  renderCell = (data, params) => {
    const { key, elementKey, index } = params;

    const month = this.props.months[index];
    let component;
    const otherParams = {};

    if (!elementKey) {
      // Totals
      return (
        <Cell key={key}>
          <Text>{data}</Text>
        </Cell>
      );
    }

    switch (elementKey) {
      case 'SAL':
      case 'BON':
      case 'PTAXP':
      case 'LEA':
        component = 'DrilldownConsultants';
        break;
      case 'PTAXC':
      case 'CWAGES':
        component = 'DrilldownContractors';
        break;
      case 'FIXREV':
        // TODO
        break;
      case 'TMREV':
        // TODO
        break;
      default:
        component = 'DrilldownPlain';
        otherParams.elementKey = elementKey;
    }

    return (
      <ButtonCell
        key={key}
        onPress={() =>
          this.props.openReport({
            name: `Report on ${month.label}`,
            component,
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
