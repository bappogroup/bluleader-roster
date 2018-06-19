import React from 'react';
import { View, Text, styled, Button, ActivityIndicator } from 'bappo-components';
import BappoTable from 'bappo-table';

const ROW_HEIGHT = '30px';

class MainReport extends React.Component {
  calculateTotals = cells => {
    const { costElements, revenueElements, overheadElements, months } = this.props;
    const totals = {};

    months.forEach(({ label }) => {
      totals[`Revenue-${label}`] = 0;
      totals[`Cost-${label}`] = 0;
      totals[`Overheads-${label}`] = 0;
      totals[`GrossProfit-${label}`] = 0;
      totals[`NetProfit-${label}`] = 0;

      costElements.forEach(ele => {
        const cellKey = `${ele.key || ele.name}-${label}`;
        totals[`Cost-${label}`] += +cells[cellKey].value;
      });

      revenueElements.forEach(ele => {
        const cellKey = `${ele.key || ele.name}-${label}`;
        totals[`Revenue-${label}`] += +cells[cellKey].value;
      });

      overheadElements.forEach(ele => {
        const cellKey = `${ele.key || ele.name}-${label}`;
        totals[`Overheads-${label}`] += +cells[cellKey].value;
      });

      totals[`Cost-${label}`] = +totals[`Cost-${label}`].toFixed(2);
      totals[`Revenue-${label}`] = +totals[`Revenue-${label}`].toFixed(2);
      totals[`Overheads-${label}`] = +totals[`Overheads-${label}`].toFixed(2);
      totals[`GrossProfit-${label}`] = totals[`Revenue-${label}`] - totals[`Cost-${label}`];
      totals[`NetProfit-${label}`] = totals[`GrossProfit-${label}`] - totals[`Overheads-${label}`];
    });

    return totals;
  };

  // Renders the first column containing all forecast element labels
  renderLabelColumn = () => {
    const { costElements, revenueElements, overheadElements } = this.props;
    const renderElementLabel = ({ name }) => (
      <Row key={name}>
        <Text>{name}</Text>
      </Row>
    );

    return (
      <LabelColumnContainer>
        <Row />
        {revenueElements.map(renderElementLabel)}
        <Row>
          <Text>Total Revenue</Text>
        </Row>
        <Row />
        {costElements.map(renderElementLabel)}
        <Row>
          <Text>Total Cost of Sales</Text>
        </Row>
        <Row />
        <Row>
          <Text>Gross Profit</Text>
        </Row>

        <Row />
        {overheadElements.map(renderElementLabel)}
        <Row>
          <Text>Total Overheads</Text>
        </Row>

        <Row />
        <Row>
          <Text>Net Profit</Text>
        </Row>
      </LabelColumnContainer>
    );
  };

  renderCell = (data, params) => {
    const { elementKey, index } = params;

    const month = this.props.months[index];

    switch (elementKey) {
      case 'SAL':
      case 'BON':
      case 'PTAX':
      case 'LEA':
        return (
          <ButtonCell
            onPress={() =>
              this.props.openReport({
                name: `Report on ${month.label}`,
                component: 'DrilldownConsultants',
                params: { month },
              })
            }
          >
            <Text>{data}</Text>
          </ButtonCell>
        );
      case 'CWAGES':
        return (
          <ButtonCell
            onPress={() =>
              this.props.openReport({
                name: `Report on ${month.label}`,
                component: 'DrilldownContractors',
                params: { month },
              })
            }
          >
            <Text>{data}</Text>
          </ButtonCell>
        );
      default:
        return (
          <Cell>
            <Text>{data}</Text>
          </Cell>
        );
    }
  };

  render() {
    const { dataForTable } = this.props.mainReportData;
    if (!dataForTable) return <ActivityIndicator />;

    return (
      <Container>
        <BappoTable renderCell={this.renderCell} data={dataForTable} />
      </Container>
    );
  }
}

export default MainReport;

const Container = styled(View)`
  flex: 1;
`;

const LabelColumnContainer = styled(View)`
  flex: none;
  width: 180px;
`;

const Row = styled(View)`
  height: ${ROW_HEIGHT};
  flex-direction: row;
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
