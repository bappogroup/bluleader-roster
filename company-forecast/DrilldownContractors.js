import React from "react";
import { View } from "bappo-components";
import Table from "./table";
import moment from "moment";

const Header = [
  "Consultant",
  "T&M Revenue",
  "Travel, Accom, etc.",
  "Wage",
  "Payroll Tax",
  "Cost",
  "Gross Margin",
  "GM%"
];

class DrilldownConsultants extends React.Component {
  constructor(props) {
    super(props);

    const { contractConsultants } = props;

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
    const sortedConsultants = contractConsultants.sort((a, b) =>
      a.name > b.name ? 1 : -1
    );
    sortedConsultants.forEach(consultant => {
      const revenue = revenueByConsultant[consultant.id] || 0;
      const expense = expenseByConsultant[consultant.id] || 0;
      const payrolltax = Number(
        cells[`PTAXC-${monthLabel}`][consultant.id] || 0.0
      );
      const wage = cells[`CWAGES-${monthLabel}`][consultant.id] || 0;
      const cost = wage + expense + payrolltax;
      const gm = revenue - cost;
      const gmp = revenue === 0 ? 0 : ((100 * gm) / revenue).toFixed(2);

      records.push({
        consultant,
        revenue,
        expense,
        wage,
        payrolltax,
        cost,
        gm,
        gmp
      });
    });

    // calculate totals
    const total = {
      revenue: 0.0,
      expense: 0.0,
      wage: 0.0,
      payrolltax: 0.0,
      cost: 0.0,
      gm: 0.0
    };

    const reportRows = [Header];
    records.forEach(r => {
      total.revenue += r.revenue;
      total.expense += r.expense;
      total.salary += r.salary;
      total.wage += r.wage;
      total.payrolltax += r.payrolltax;
      total.cost += r.cost;
      total.gm += r.gm;

      const dataRow = [
        r.consultant.name,
        r.revenue,
        r.expense,
        r.wage,
        r.payrolltax,
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
        total.wage,
        total.payrolltax,
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
