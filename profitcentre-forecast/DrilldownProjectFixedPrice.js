import React from 'react';
import { View, Text, styled } from 'bappo-components';
import Table from 'bappo-table';

const Header = ['Consultant', 'Date', 'Cost', 'Expense'];

class DrilldownProjectTm extends React.Component {
  constructor(props) {
    super(props);
    const { month, resourceId: projectId } = props.report.params;

    // Revenue
    const totalRevenue =
      props.mainReportData.cells[`Fixed Price Project Revenue-${month.label}`][projectId] || 0;

    // Consultant table
    const reportRows = [Header];
    let totalCost = 0;
    let totalExpense = 0;

    const { rosterEntriesByProject, projectAssignmentLookup } = props.rawData;
    rosterEntriesByProject.forEach(entry => {
      if (entry.project_id === projectId && month.monthNumber === new Date(entry.date).getMonth()) {
        const cost = +entry.consultant.internalRate;
        const expense = +projectAssignmentLookup[`${entry.consultant_id}.${entry.project_id}`]
          .projectExpense;
        // const margin = 0 - cost - expense;
        totalCost += cost;
        totalExpense += expense;
        reportRows.push([entry.consultant.name, entry.date, cost, expense]);
      }
    });

    reportRows.push({
      rowStyle: 'total',
      data: ['Total', '', totalCost, totalExpense],
    });

    const totalMargin = totalRevenue - totalCost - totalExpense;

    this.state = { totalRevenue, totalMargin, reportRows };
  }

  renderCell = data => (
    <Cell>
      <Text>{data}</Text>
    </Cell>
  );

  render() {
    const { totalRevenue, totalMargin, reportRows } = this.state;

    return (
      <View style={{ flex: 1 }}>
        <Table data={reportRows} renderCell={this.renderCell} />
        <View style={{ flex: 1, margin: 20 }}>
          <Text>Revenue: {totalRevenue}</Text>
          <Text>Margin: {totalMargin}</Text>
        </View>
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

// const Title = styled(Text)``;
