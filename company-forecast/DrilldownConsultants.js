import React from 'react';
import { View, Text, styled } from 'bappo-components';
import Table from 'bappo-table';

const Header = ['Consultant', 'SAL', 'PTAX', 'BON', 'LEA'];

class DrilldownConsultants extends React.Component {
  state = {
    consultantRows: [],
    loading: true,
  };

  componentDidMount() {
    console.log(this.props);
    const { permConsultants } = this.props;
    const monthLabel = this.props.report.params.month.label;
    const { cells } = this.props.mainReportData;

    const consultantRows = [Header];
    permConsultants.forEach(consultant => {
      const dataRow = [
        consultant.name,
        cells[`SAL-${monthLabel}`][consultant.id] || 0,
        cells[`PTAX-${monthLabel}`][consultant.id] || 0,
        cells[`BON-${monthLabel}`][consultant.id] || 0,
        cells[`LEA-${monthLabel}`][consultant.id] || 0,
      ];
      consultantRows.push(dataRow);
    });

    this.setState({
      loading: false,
      consultantRows,
    });
  }

  renderCell = data => (
    <Cell>
      <Text>{data}</Text>
    </Cell>
  );

  render() {
    const { loading, consultantRows } = this.state;
    if (loading) return null;

    return (
      <View style={{ flex: 1 }}>
        <Table data={consultantRows} renderCell={this.renderCell} />
      </View>
    );
  }
}

export default DrilldownConsultants;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: 1;
`;
