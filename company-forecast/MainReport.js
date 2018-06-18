import React from 'react';
import { View, Text, styled, Button, ActivityIndicator } from 'bappo-components';
import {
  calculatePermConsultants,
  calculateContractConsultants,
  calculateServiceRevenue,
} from 'forecast-utils';

const ROW_HEIGHT = '30px';

const getCellKey = (elementKey, monthLabel) => `${elementKey}-${monthLabel}`;

class MainReport extends React.Component {
  state = {
    loading: true,
    cells: {},
    totals: {},
  };

  componentDidMount() {
    console.log('Main report mount');
    console.log(this.props);
    const { forecastElements, rosterEntries, projectAssignmentLookup } = this.props.rawData;
    const { permConsultants, contractConsultants, months } = this.props;

    // Calculate cells
    const cells = {};
    // initialize cells
    for (const element of forecastElements) {
      for (const month of months) {
        const cellKey = `${element.key || element.name}-${month.label}`;
        cells[cellKey] = { value: 0 };
      }
    }

    calculatePermConsultants({
      consultants: permConsultants,
      months,
      cells,
    });
    calculateContractConsultants({
      consultants: contractConsultants,
      cells,
      rosterEntries,
    });
    calculateServiceRevenue({
      cells,
      rosterEntries,
      projectAssignmentLookup,
    });

    const totals = this.calculateTotals(cells);

    this.setState({
      totals,
      cells,
      loading: false,
    });
  }

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

  renderTotalRow = category => (
    <Row>{this.props.months.map(({ label }) => this.renderTotalCell(category, label))}</Row>
  );

  renderTotalCell = (category, monthLabel) => {
    const key = `${category}-${monthLabel}`;
    return <TextCell key={key}>{this.state.totals[key]}</TextCell>;
  };

  renderDataTable = () => {
    const { months, revenueElements, costElements, overheadElements } = this.props;

    return (
      <DataTableContainer>
        <MonthsRow>{months.map(({ label }) => <TextCell key={label}>{label}</TextCell>)}</MonthsRow>
        {revenueElements.map(this.renderDataRow)}
        {this.renderTotalRow('Revenue')}
        <Row />
        {costElements.map(this.renderDataRow)}
        {this.renderTotalRow('Cost')}
        <Row />
        {this.renderTotalRow('GrossProfit')}
        <Row />
        {overheadElements.map(this.renderDataRow)}
        {this.renderTotalRow('Overheads')}
        <Row />
        {this.renderTotalRow('NetProfit')}
      </DataTableContainer>
    );
  };

  renderDataRow = forecastElement => {
    const { months } = this.props;

    return (
      <Row key={forecastElement.name}>
        {months.map(month => this.renderDataCell(month, forecastElement))}
      </Row>
    );
  };

  renderDataCell = (month, element) => {
    const cellKey = getCellKey(element.key || element.name, month.label);
    const cellValue = this.state.cells[cellKey] && this.state.cells[cellKey].value;
    let onPress = null;

    switch (element.key) {
      case 'SAL':
      case 'BON':
        onPress = () =>
          this.props.openReport({
            name: `Report on ${month.label}, ${element.name}`,
            component: 'DrilldownConsultants',
            params: { month },
          });
        break;
      case 'CWAGES':
        onPress = () =>
          this.props.openReport({
            name: `Report on ${month.label}, ${element.name}`,
            component: 'DrilldownContractors',
            params: { month },
          });
        break;
      default:
        onPress = function() {
          alert(`No drilldown yet, key is ${element.key}`);
        };
    }

    return (
      <ButtonCell key={cellKey} onPress={onPress}>
        <Text>{cellValue}</Text>
      </ButtonCell>
    );
  };

  render() {
    if (this.state.loading) return <ActivityIndicator />;
    console.log(this.state.cells);

    return (
      <Container>
        {this.renderLabelColumn()}
        {this.renderDataTable()}
      </Container>
    );
  }
}

export default MainReport;

const Container = styled(View)`
  flex-direction: row;
  padding: 30px;
`;

const LabelColumnContainer = styled(View)`
  flex: none;
  width: 180px;
`;

const Row = styled(View)`
  height: ${ROW_HEIGHT};
  flex-direction: row;
`;

const TextCell = styled(Text)`
  flex: 1;
`;

const ButtonCell = styled(Button)`
  flex: 1;
`;

const DataTableContainer = styled(View)`
  flex: 1;
`;

const MonthsRow = styled(Row)`
  flex-direction: row;
`;
