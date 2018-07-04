import React from 'react';
import { View, Text, styled } from 'bappo-components';
import Table from 'bappo-table';

const Header = ['Description', 'Amount', 'Profit Centre', 'Cost Center'];

class DrilldownPlain extends React.Component {
  constructor(props) {
    super(props);

    const { cells } = props.mainReportData;
    const { profitCentreLookup, costCenterLookup } = props;
    const { elementKey } = props.report.params;
    const monthLabel = props.report.params.month.label;
    const cellKey = `${elementKey}-${monthLabel}`;
    const cell = cells[cellKey];

    const reportRows = [Header];
    Object.values(cell).forEach(forecastEntry => {
      if (typeof forecastEntry === 'object') {
        const profitCentreName =
          profitCentreLookup[forecastEntry.profitCentre_id] &&
          profitCentreLookup[forecastEntry.profitCentre_id].name;
        const costCenterName =
          costCenterLookup[forecastEntry.costCenter_id] &&
          costCenterLookup[forecastEntry.costCenter_id].name;
        const row = [
          forecastEntry.description || elementKey,
          forecastEntry.amount,
          profitCentreName,
          costCenterName,
        ];
        reportRows.push(row);
      }
    });

    reportRows.push({
      rowStyle: 'total',
      data: ['Total', cells[cellKey].value, '', ''],
    });

    this.state = { reportRows };
  }

  renderCell = data => (
    <Cell>
      <Text>{data}</Text>
    </Cell>
  );

  render() {
    return (
      <View style={{ flex: 1 }}>
        <Table data={this.state.reportRows} renderCell={this.renderCell} />
      </View>
    );
  }
}

export default DrilldownPlain;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: 1;
`;
