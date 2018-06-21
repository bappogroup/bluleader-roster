import React from 'react';
import { View, Text, styled } from 'bappo-components';
import Table from 'bappo-table';

const Header = ['Consultant', 'Wage', 'Payroll Tax'];

class DrilldownContractors extends React.Component {
  constructor(props) {
    super(props);

    const { contractConsultants } = props;
    const monthLabel = props.report.params.month.label;
    const { cells } = props.mainReportData;

    const consultantRows = [Header];
    contractConsultants.forEach(consultant => {
      const dataRow = [
        consultant.name,
        cells[`CWAGES-${monthLabel}`][consultant.id] || 0,
        cells[`PTAXC-${monthLabel}`][consultant.id] || 0,
      ];
      consultantRows.push(dataRow);
    });

    consultantRows.push({
      rowStyle: 'total',
      data: ['Total', cells[`CWAGES-${monthLabel}`].value, cells[`PTAXC-${monthLabel}`].value],
    });

    this.state = { consultantRows };
  }

  renderCell = data => (
    <Cell>
      <Text>{data}</Text>
    </Cell>
  );

  render() {
    return (
      <View style={{ flex: 1 }}>
        <Table data={this.state.consultantRows} renderCell={this.renderCell} />
      </View>
    );
  }
}

export default DrilldownContractors;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: 1;
`;
