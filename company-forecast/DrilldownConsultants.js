import React from 'react';
import { View, Text, styled } from 'bappo-components';
import Table from 'bappo-table';

const Header = ['Consultant', 'SAL', 'PTAX', 'BON', 'LEA'];

class DrilldownConsultants extends React.Component {
  state = {
    reportRows: [],
    loading: true,
  };

  componentDidMount() {
    const { permConsultants } = this.props;
    const monthLabel = this.props.report.params.month.label;
    const { cells } = this.props.mainReportData;

    const records = [];
    permConsultants.forEach(consultant => {
      records.push({
        consultant,
        salary: Number(cells[`SAL-${monthLabel}`][consultant.id] || 0.0),
        payrolltax: Number(cells[`PTAX-${monthLabel}`][consultant.id] || 0.0),
        bonus: Number(cells[`BON-${monthLabel}`][consultant.id] || 0.0),
        leave: Number(cells[`LEA-${monthLabel}`][consultant.id] || 0.0),
      });
    });

    // calculate totals
    const total = { salary: 0.0, payrolltax: 0.0, bonus: 0.0, leave: 0.0 };
    records.forEach(r => {
      total.salary += r.salary;
      total.payrolltax += r.payrolltax;
      total.bonus += r.bonus;
      total.leave += r.leave;
    });

    const reportRows = [Header];
    records.forEach(r => {
      const dataRow = [r.consultant.name, r.salary, r.payrolltax, r.bonus, r.leave];
      reportRows.push(dataRow);
    });

    reportRows.push({
      rowStyle: 'total',
      data: ['Total', total.salary, total.payrolltax, total.bonus, total.leave],
    });
    reportRows.push([]);

    this.setState({
      loading: false,
      reportRows,
    });
  }

  renderCell = data => (
    <Cell>
      <Text>{data}</Text>
    </Cell>
  );

  render() {
    const { loading, reportRows } = this.state;
    if (loading) return null;

    return (
      <View style={{ flex: 1 }}>
        <Table data={reportRows} renderCell={this.renderCell} />
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
