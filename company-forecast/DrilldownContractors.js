import React from 'react';
import { View, Text, styled } from 'bappo-components';
import Table from 'bappo-table';

const Header = ['Consultant', 'Wage', 'Payroll Tax'];

class DrilldownContractors extends React.Component {
  constructor(props) {
    super(props);
    console.log(props);

    const { contractConsultants } = this.props;
    const monthLabel = this.props.report.params.month.label;
    const { cells } = this.props.mainReportData;

    const consultantRows = [Header];
    // let totalWages
    contractConsultants.forEach(consultant => {
      // const dataRow = {
      //   elementKey
      // }
      const dataRow = [
        consultant.name,
        cells[`CWAGES-${monthLabel}`][consultant.id] || 0,
        cells[`PTAX-${monthLabel}`][consultant.id] || 0,
      ];
      consultantRows.push(dataRow);
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
