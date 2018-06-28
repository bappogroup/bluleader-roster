import React from 'react';
import { View, Text, styled } from 'bappo-components';
import Table from 'bappo-table';

const Header = ['Consultant', 'Date', 'Revenue', 'Cost', 'Expense'];

class DrilldownProjectTm extends React.Component {
  constructor(props) {
    super(props);
    const reportRows = [Header];
    const { month, resourceId: projectId } = props.report.params;

    let totalRevenue = 0;
    let totalCost = 0;
    let totalExpense = 0;

    // Filter roster entries of this project, this month
    const { rosterEntriesByProject, projectAssignmentLookup } = props.rawData;
    rosterEntriesByProject.forEach(entry => {
      if (entry.project_id === projectId && month.monthNumber === new Date(entry.date).getMonth()) {
        const { dayRate, projectExpense } = projectAssignmentLookup[
          `${entry.consultant_id}.${entry.project_id}`
        ];
        const revenue = +dayRate;
        const cost = +entry.consultant.internalRate;
        const expense = +projectExpense;
        totalRevenue += revenue;
        totalCost += cost;
        totalExpense += expense;
        const row = [entry.consultant.name, entry.date, revenue, cost, expense];
        reportRows.push(row);
      }
    });

    const margin = totalRevenue - totalCost - totalExpense;

    reportRows.push({
      rowStyle: 'total',
      data: ['Total', '', totalRevenue, totalCost, totalExpense],
    });

    this.state = { reportRows, margin };
  }

  renderCell = data => (
    <Cell>
      <Text>{data}</Text>
    </Cell>
  );

  render() {
    const { reportRows, margin } = this.state;

    return (
      <View style={{ flex: 1 }}>
        <Table data={reportRows} renderCell={this.renderCell} />
        <MarginContainer>
          <Text>Margin: {margin}</Text>
        </MarginContainer>
      </View>
    );
  }
}

export default DrilldownProjectTm;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: 1;
`;

const MarginContainer = styled(View)`
  magin-left: 30px;
  margin-bottom: 30px;
`;
