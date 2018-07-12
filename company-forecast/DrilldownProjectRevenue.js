import React from 'react';
import { View, Text, styled } from 'bappo-components';
import Table from 'bappo-table';

const Header = ['Profit Centre', 'Project', 'Revenue'];

class DrilldownProjectRevenue extends React.Component {
  constructor(props) {
    super(props);

    const reportRows = [Header];

    const { projects, profitCentres } = props.rawData;
    const monthLabel = props.report.params.month.label;
    const { cells } = props.mainReportData;
    const { projectType, forecastElementKey } = props;
    let total = 0;

    // Sort projects by profit centre
    projects.sort((a, b) => a.profitCentre_id - b.profitCentre_id);
    const projectByPc = {};
    projects.forEach(project => {
      if (!projectByPc[project.profitCentre_id]) projectByPc[project.profitCentre_id] = [];
      if (project.projectType === projectType) projectByPc[project.profitCentre_id].push(project);
    });

    Object.entries(projectByPc).forEach(([pcId, projectsInPc]) => {
      let pcTotal = 0;
      const pcName = profitCentres.find(pc => pc.id === pcId).name;
      projectsInPc.forEach(project => {
        const projectRevenue = cells[`${forecastElementKey}-${monthLabel}`][project.id]
          ? +cells[`${forecastElementKey}-${monthLabel}`][project.id]
          : 0;
        reportRows.push([pcName, project.name, projectRevenue]);
        pcTotal += projectRevenue;
      });
      total += pcTotal;

      if (pcTotal !== 0) {
        reportRows.push({
          rowStyle: 'total',
          data: ['Subtotal', '', pcTotal],
        });
        reportRows.push([]);
      }
    });

    reportRows.push({
      rowStyle: 'total',
      data: ['Total', '', total],
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

export default DrilldownProjectRevenue;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: 1;
`;
