import React from "react";
import { View } from "bappo-components";
import Table from "bappo-table";

const Header = [
  "Consultant",
  "Revenue",
  "Project Expenses",
  "Salary",
  "Payroll Tax",
  "Bonus",
  "Leave Provision",
  "Leave",
  "Cost",
  "GM",
  "GM%"
];

class DrilldownConsultants extends React.Component {
  constructor(props) {
    super(props);

    const { permConsultants } = props;
    const monthLabel = props.report.params.month.label;
    const { cells } = props.mainReportData;
    const { rosterEntries, projectAssignmentLookup } = props.rawData;

    //  Revenue lookup
    const revenueByConsultant = {};
    const expenseByConsultant = {};
    rosterEntries.forEach(entry => {
      if (!revenueByConsultant[entry.consultant_id]) {
        revenueByConsultant[entry.consultant_id] = 0;
      }
      if (!expenseByConsultant[entry.consultant_id]) {
        expenseByConsultant[entry.consultant_id] = 0;
      }

      const assignment =
        projectAssignmentLookup[`${entry.consultant_id}.${entry.project_id}`];
      if (assignment) {
        const { dayRate, projectExpense } = assignment;
        expenseByConsultant[entry.consultant_id] += +projectExpense || 0;
        revenueByConsultant[entry.consultant_id] += +dayRate || 0;
      }
    });

    const records = [];
    permConsultants.forEach(consultant => {
      const revenue = revenueByConsultant[consultant.id] || 0;
      const expense = expenseByConsultant[consultant.id] || 0;
      const salary = Number(cells[`SAL-${monthLabel}`][consultant.id] || 0.0);
      const payrolltax = Number(
        cells[`PTAXP-${monthLabel}`][consultant.id] || 0.0
      );
      const bonus = Number(cells[`BON-${monthLabel}`][consultant.id] || 0.0);
      const leaveProvision = Number(
        cells[`LPROV-${monthLabel}`][consultant.id] || 0.0
      );
      const leave = Number(cells[`LEA-${monthLabel}`][consultant.id] || 0.0);
      const cost = salary + bonus + leaveProvision + payrolltax;
      const gm = revenue - cost;
      const gmp = revenue === 0 ? 0 : ((100 * gm) / revenue).toFixed(2) + "%";

      records.push({
        consultant,
        revenue,
        expense,
        salary,
        payrolltax,
        bonus,
        leaveProvision,
        leave,
        cost,
        gm,
        gmp
      });
    });

    // calculate totals
    // const total = {
    //   revenue: 0.0,
    //   expense: 0.0,
    //   salary: 0.0,
    //   payrolltax: 0.0,
    //   bonus: 0.0,
    //   leaveProvision: 0.0,
    //   leave: 0.0,
    //   total: 0.0
    // };
    // records.forEach(r => {
    //   total.revenue += r.revenue;
    //   total.expense += r.expense;
    //   total.salary += r.salary;
    //   total.payrolltax += r.payrolltax;
    //   total.bonus += r.bonus;
    //   total.leaveProvision += r.leaveProvision;
    //   total.leave += r.leave;
    //   total.total += r.total;
    // });

    const reportRows = [Header];
    records.forEach(r => {
      const dataRow = [
        r.consultant.name,
        r.revenue,
        r.expense,
        r.salary,
        r.payrolltax,
        r.bonus,
        r.leaveProvision,
        r.leave,
        r.cost,
        r.gm,
        r.gmp
      ];
      reportRows.push(dataRow);
    });

    // reportRows.push({
    //   rowStyle: "total",
    //   data: [
    //     "Total",
    //     total.salary,
    //     total.payrolltax,
    //     total.bonus,
    //     total.leaveProvision,
    //     total.leave,
    //     total.total
    //   ]
    // });

    this.state = { reportRows };
    console.log(reportRows);
  }

  render() {
    return (
      <View style={{ flex: 1 }}>
        <Table data={this.state.reportRows} />
      </View>
    );
  }
}

export default DrilldownConsultants;
