import React from "react";
import { View, Text } from "bappo-components";
import Table from "./table";
import moment from "moment";
import Button from "hybrid-button";

const Header = [
  "Consultant",
  "T&M Revenue",
  "Travel, Accom, etc",
  "Salary",
  "Payroll Tax",
  "Bonus",
  "Leave Provision",
  "Leave",
  "Total Cost",
  "Margin",
  "Margin%"
];

class DrilldownConsultants extends React.Component {
  constructor(props) {
    super(props);

    const { permConsultants } = props;
    const monthLabel = props.report.params.month.label;
    const { cells } = props.mainReportData;
    const { rosterEntries, projectAssignmentLookup } = props.rawData;
    const begin = props.report.params.month.firstDay.format("YYYY-MM-DD");
    const end = moment(begin)
      .endOf("month")
      .format("YYYY-MM-DD");

    const monthEntries = rosterEntries.filter(
      e => e.date >= begin && e.date <= end
    );

    //  Revenue lookup
    const revenueByConsultant = {};
    const expenseByConsultant = {};

    monthEntries.forEach(entry => {
      if (!revenueByConsultant[entry.consultant_id]) {
        revenueByConsultant[entry.consultant_id] = 0;
      }
      if (!expenseByConsultant[entry.consultant_id]) {
        expenseByConsultant[entry.consultant_id] = 0;
      }

      const assignment =
        projectAssignmentLookup[`${entry.consultant_id}.${entry.project_id}`];

      if (assignment && entry.project && entry.project.projectType === "2") {
        const { dayRate, projectExpense } = assignment;
        expenseByConsultant[entry.consultant_id] += +projectExpense || 0;
        revenueByConsultant[entry.consultant_id] += +dayRate || 0;
      }
    });

    const records = [];
    const sortedConsultants = permConsultants.sort(
      (a, b) => (a.name > b.name ? 1 : -1)
    );
    sortedConsultants.forEach(consultant => {
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
      const cost =
        salary + expense + bonus + leaveProvision + leave + payrolltax;
      const gm = revenue - cost;
      const gmp = revenue === 0 ? "-" : ((100 * gm) / revenue).toFixed(2);

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
    const total = {
      revenue: 0.0,
      expense: 0.0,
      salary: 0.0,
      payrolltax: 0.0,
      bonus: 0.0,
      leaveProvision: 0.0,
      leave: 0.0,
      cost: 0.0,
      gm: 0.0
    };

    const reportRows = [Header];
    records.forEach(r => {
      total.revenue += r.revenue;
      total.expense += r.expense;
      total.salary += r.salary;
      total.payrolltax += r.payrolltax;
      total.bonus += r.bonus;
      total.leaveProvision += r.leaveProvision;
      total.leave += r.leave;
      total.cost += r.cost;
      total.gm += r.gm;

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

      reportRows.push({
        onPress: () => {
          this.props.openReport({
            name: `OneConsultant`,
            component: "DrilldownOneConsultant",
            params: {
              consultant: r.consultant,
              month: props.report.params.month
            }
          });
        },
        data: dataRow
      });
    });

    reportRows.push({
      rowStyle: "total",
      data: [
        "Total",
        total.revenue,
        total.expense,
        total.salary,
        total.payrolltax,
        total.bonus,
        total.leaveProvision,
        total.leave,
        total.cost,
        total.gm,
        "-"
      ]
    });

    this.state = { reportRows };
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
