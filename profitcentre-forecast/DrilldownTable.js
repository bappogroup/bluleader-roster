import React from "react";
import { ScrollView, View, Text, styled } from "bappo-components";
import Table from "bappo-table";

const ProjectHeader = ["Projects", "Revenue", "Cost", "Margin"];
const PeopleHeader = ["Consultant", "Cost Recovery", "Cost", "Margin"];

class Drilldown extends React.Component {
  constructor(props) {
    super(props);
    console.log(props);
    const { cells } = props.mainReportData;
    const monthLabel = props.report.params.month.label;
    const { projects, consultants } = props.rawData;

    // Project table
    const projectRows = [ProjectHeader];
    projects.forEach(project => {
      const revenue =
        cells[`T&M Project Revenue-${monthLabel}`][project.id] || 0;
      const cost = cells[`Project Cost-${monthLabel}`][project.id] || 0;
      const margin = revenue - cost;
      projectRows.push([project.name, revenue, cost, margin]);
    });

    const totalProjectRevenue =
      cells[`T&M Project Revenue-${monthLabel}`].value;
    const totalProjectCost = cells[`Project Cost-${monthLabel}`].value;
    const totalProjectMargin = totalProjectRevenue - totalProjectCost;
    projectRows.push({
      rowStyle: "total",
      data: ["Total", totalProjectRevenue, totalProjectCost, totalProjectMargin]
    });
    projectRows.push([]);

    // People table
    const peopleRows = [PeopleHeader];
    consultants.forEach(consultant => {
      const recovery =
        cells[`People Cost Recovery-${monthLabel}`][consultant.id] || 0;
      let cost;
      switch (consultant.consultantType) {
        case "1":
          cost =
            cells[`Consultant Cost(permanent)-${monthLabel}`][consultant.id] ||
            0;
          break;
        case "2":
          cost =
            cells[`Consultant Cost(contractor)-${monthLabel}`][consultant.id] ||
            0;
          break;
        default:
      }
      const margin = recovery - cost;
      peopleRows.push([consultant.name, recovery, cost, margin]);
    });

    const totalConsultantRecovery =
      cells[`People Cost Recovery-${monthLabel}`].value;
    const totalConsultantCost =
      cells[`Consultant Cost(permanent)-${monthLabel}`].value +
      cells[`Consultant Cost(contractor)-${monthLabel}`].value;
    const totalConsultantMargin = totalConsultantRecovery - totalConsultantCost;
    peopleRows.push({
      rowStyle: "total",
      data: [
        "Total",
        totalConsultantRecovery,
        totalConsultantCost,
        totalConsultantMargin
      ]
    });
    peopleRows.push([]);

    const overheads = cells[`Overheads-${monthLabel}`];
    const netProfit =
      totalProjectMargin + totalConsultantMargin - overheads.value;

    this.state = { projectRows, peopleRows, overheads, netProfit };
  }

  renderCell = data => (
    <Cell>
      <Text>{data}</Text>
    </Cell>
  );

  renderOverheads = () => {
    const { overheads } = this.state;

    return (
      <OverheadsContainer>
        <Row style={{ backgroundColor: "#888" }}>
          <Text style={{ color: "white" }}>Overheads</Text>
        </Row>
        {Object.entries(overheads).map(([name, value]) => {
          if (name === "value") return null;
          return (
            <Row>
              <Text>
                {name}: {value}
              </Text>
            </Row>
          );
        })}
        <Row>
          <Text>Total: {overheads.value}</Text>
        </Row>
      </OverheadsContainer>
    );
  };

  render() {
    return (
      <ScrollView>
        <Table data={this.state.projectRows} renderCell={this.renderCell} />
        <Table data={this.state.peopleRows} renderCell={this.renderCell} />
        {this.renderOverheads()}
        <Row>
          <Subtitle>Net Profit: {this.state.netProfit}</Subtitle>
        </Row>
      </ScrollView>
    );
  }
}

export default Drilldown;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: 1;
`;

const OverheadsContainer = styled(View)``;

const Row = styled(View)`
  margin-left: 15px;
  padding-left: 20px;
  height: 50px;
  justify-content: center;
`;

const Subtitle = styled(Text)`
  font-size: 18px;
  font-weight: bold;
`;
