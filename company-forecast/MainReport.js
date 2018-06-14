import React from 'react';
import { View, Text, styled, Button, ActivityIndicator } from 'bappo-components';

const ROW_HEIGHT = '30px';

class MainReport extends React.Component {
  state = {
    loading: true,
    months: this.props.months,
  };

  componentDidMount() {
    console.log('Main report mount');
    const { forecastElements } = this.props.rawData;

    const costElements = [];
    const revenueElements = [];
    const overheadElements = [];

    for (const element of forecastElements) {
      switch (element.elementType) {
        case '1':
          costElements.push(element);
          break;
        case '2':
          revenueElements.push(element);
          break;
        case '3':
          overheadElements.push(element);
          break;
        default:
      }
    }

    this.setState({
      loading: false,
      costElements,
      revenueElements,
      overheadElements,
    });
  }

  // Renders the first column containing all forecast element labels
  renderLabelColumn = () => {
    const { costElements, revenueElements, overheadElements } = this.state;
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

  renderDataTable = () => {
    const { months, revenueElements, costElements, overheadElements } = this.state;

    return (
      <DataTableContainer>
        <MonthsRow>{months.map(({ label }) => <TextCell key={label}>{label}</TextCell>)}</MonthsRow>
        {revenueElements.map(this.renderDataRow)}
        {this.renderTotals('revenue')}
        <Row />
        {costElements.map(this.renderDataRow)}
        {this.renderTotals('cost')}
        <Row />
        {this.renderTotals('grossProfit')}
        <Row />
        {overheadElements.map(this.renderDataRow)}
        {this.renderTotals('overhead')}
        <Row />
        {this.renderTotals('netProfit')}
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
    const key = `${month.label}${element.name}`;
    return (
      <ButtonCell
        key={key}
        onPress={() =>
          this.props.openReport({
            name: `Report on ${month.label}, ${element.name}`,
            component: 'Report',
          })
        }
      >
        data
      </ButtonCell>
    );
  };

  renderTotals = key => <Row>{key}</Row>;

  render() {
    if (this.state.loading) return <ActivityIndicator />;

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
  border-left: 1px solid #eee;
  border-bottom: 1px solid #eee;
  border-right: 1px solid #eee;
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
  overflow-x: scroll;
`;

const MonthsRow = styled(Row)`
  flex-direction: row;
`;
