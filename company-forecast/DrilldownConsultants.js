import React from 'react';
import { View, Text, styled } from 'bappo-components';
import Table from 'bappo-table';

const Header = [
  'Consultant',
  'Salary',
  'Payroll Tax',
  'Bonus',
  'Leave Provision',
  'Leave',
  'Total',
];

class DrilldownConsultants extends React.Component {
  constructor(props) {
    super(props);

    const { permConsultants } = props;
    const monthLabel = props.report.params.month.label;
    const { cells } = props.mainReportData;

    const records = [];
    permConsultants.forEach(consultant => {
      const salary = Number(cells[`SAL-${monthLabel}`][consultant.id] || 0.0);
      const payrolltax = Number(cells[`PTAXP-${monthLabel}`][consultant.id] || 0.0);
      const bonus = Number(cells[`BON-${monthLabel}`][consultant.id] || 0.0);
      const leaveProvision = Number(cells[`LPROV-${monthLabel}`][consultant.id] || 0.0);
      const leave = Number(cells[`LEA-${monthLabel}`][consultant.id] || 0.0);
      const total = salary + payrolltax + bonus + leaveProvision + leave;

      records.push({
        consultant,
        salary,
        payrolltax,
        bonus,
        leaveProvision,
        leave,
        total,
      });
    });

    // calculate totals
    const total = {
      salary: 0.0,
      payrolltax: 0.0,
      bonus: 0.0,
      leaveProvision: 0.0,
      leave: 0.0,
      total: 0.0,
    };
    records.forEach(r => {
      total.salary += r.salary;
      total.payrolltax += r.payrolltax;
      total.bonus += r.bonus;
      total.leaveProvision += r.leaveProvision;
      total.leave += r.leave;
      total.total += r.total;
    });

    const reportRows = [Header];
    records.forEach(r => {
      const dataRow = [
        r.consultant.name,
        r.salary,
        r.payrolltax,
        r.bonus,
        r.leaveProvision,
        r.leave,
        r.total,
      ];
      reportRows.push(dataRow);
    });

    reportRows.push({
      rowStyle: 'total',
      data: [
        'Total',
        total.salary,
        total.payrolltax,
        total.bonus,
        total.leaveProvision,
        total.leave,
        total.total,
      ],
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

export default DrilldownConsultants;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: 1;
`;
