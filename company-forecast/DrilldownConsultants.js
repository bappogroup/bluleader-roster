import React from "react";
import { View } from "bappo-components";
import Table from "./table";
import moment from "moment";

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
  convertRecordToRow = r => {
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

    return {
      onPress: () => {
        this.props.openReport({
          name: `OneConsultant`,
          component: "DrilldownOneConsultant",
          params: {
            consultant: r.consultant,
            month: this.props.report.params.month
          }
        });
      },
      data: dataRow
    };
  };

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

    const sortedConsultants = permConsultants.sort((a, b) =>
      a.name > b.name ? 1 : -1
    );

    let records = [];
    let adminRecords = [];
    let normalRecords = [];

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

      const record = {
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
      };

      records.push(record);
      if (
        consultant.costCenter &&
        consultant.costCenter.name === "Administration"
      ) {
        adminRecords.push(record);
      } else {
        normalRecords.push(record);
      }
    });

    // const adminTotal = calcTotals(adminRecords);
    // const consultantTotal = calcTotals(normalRecords);
    // const grandTotal = calcTotals(records);

    // Create Report Rows
    const reportRows = [Header];
    normalRecords.forEach(record => {
      reportRows.push(this.convertRecordToRow(record));
    });
    reportRows.push(calcTotals(normalRecords, "Consultants Total"), []);

    adminRecords.forEach(record => {
      reportRows.push(this.convertRecordToRow(record));
    });
    reportRows.push(calcTotals(adminRecords, "Admin Total"), []);
    reportRows.push(calcTotals(records, "Total"));

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

const calcTotals = (rows, name) => {
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

  rows.forEach(r => {
    total.revenue += r.revenue;
    total.expense += r.expense;
    total.salary += r.salary;
    total.payrolltax += r.payrolltax;
    total.bonus += r.bonus;
    total.leaveProvision += r.leaveProvision;
    total.leave += r.leave;
    total.cost += r.cost;
    total.gm += r.gm;
  });

  return {
    rowStyle: "total",
    data: [
      name,
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
  };
};
