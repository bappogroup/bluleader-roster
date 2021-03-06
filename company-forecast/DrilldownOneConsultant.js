import React from "react";
import { View, Text, styled } from "bappo-components";
import Table from "./table";
import moment from "moment";

const Header = ["Date", "", "Project", "T&M Revenue", "Travel, Accom, etc"];

class DrilldownOneConsultant extends React.Component {
  constructor(props) {
    super(props);

    const consultant = props.report.params.consultant;
    const month = props.report.params.month;
    const { cells } = props.mainReportData;
    const { rosterEntries, projectAssignmentLookup } = props.rawData;
    const begin = props.report.params.month.firstDay.format("YYYY-MM-DD");
    const end = moment(begin)
      .endOf("month")
      .format("YYYY-MM-DD");

    const monthEntries = rosterEntries.filter(
      e => e.consultant_id === consultant.id && e.date >= begin && e.date <= end
    );

    //  Revenue lookup
    const entryByDate = {};

    monthEntries.forEach(entry => {
      entryByDate[entry.date] = {};
      const assignment =
        projectAssignmentLookup[`${entry.consultant_id}.${entry.project_id}`];
      if (assignment && entry.project && entry.project.projectType === "2") {
        const { dayRate, projectExpense } = assignment;
        const expense = +projectExpense || 0;
        const revenue = +dayRate || 0;
        entryByDate[entry.date] = { entry, revenue, expense };
      }
      if (assignment && entry.project && entry.project.projectType === "3") {
        const { projectExpense } = assignment;
        const expense = +projectExpense || 0;
        const revenue = 0;
        entryByDate[entry.date] = { entry, revenue, expense };
      }
    });

    const reportRows = [];

    // calculate totals
    const total = {
      revenue: 0.0,
      expense: 0.0
    };

    reportRows.push(Header);

    const firstday = props.report.params.month.firstDay;
    const lastday = moment(firstday).endOf("month");
    let date = moment(firstday);
    while (date <= lastday) {
      const dat = date.format("YYYY-MM-DD");
      const e = entryByDate[dat];
      const weekday = date.format("ddd");

      if (e) {
        let project;
        if (e.entry && e.entry.project && e.entry.probability) {
          project = (
            <Project
              style={{ backgroundColor: e.entry.probability.backgroundColor }}
            >
              <Text
                style={{ color: e.entry.probability.color }}
                numberOfLines={1}
              >
                {e.entry.project.name.substring(0, 12)}
              </Text>
            </Project>
          );
        } else {
          project = "-";
        }

        reportRows.push([dat, weekday, project, e.revenue, e.expense]);
        total.revenue += ~~e.revenue;
        total.expense += ~~e.expense;
      } else {
        reportRows.push([dat, weekday, "", ""]);
      }

      date.add(1, "day");
    }

    reportRows.push({
      rowStyle: "total",
      data: ["Total", "", "", total.revenue, total.expense]
    });

    this.state = { reportRows };
  }

  render() {
    return (
      <View style={{ flex: 1 }}>
        <Table data={this.state.reportRows} fixedCols={4} />
      </View>
    );
  }
}

export default DrilldownOneConsultant;

const Project = styled(View)`
  border-radius: 3px;
  padding: 0 8px;
  width: 110px;
  justify-content: center;
  height: 25px;
  overflow: hidden;
`;
