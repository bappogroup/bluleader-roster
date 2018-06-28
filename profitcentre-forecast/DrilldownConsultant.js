import React from 'react';
import { View, Text, styled } from 'bappo-components';
import Table from 'bappo-table';
import { getDaysInMonth } from 'forecast-utils';

const Header = ['Date', 'Day', 'Project', 'Cost Recovery'];

class DrilldownConsultant extends React.Component {
  constructor(props) {
    super(props);
    const dateRows = [Header];
    const { month, resourceId: consultantId } = props.report.params;
    const days = getDaysInMonth(month.firstDay);

    const { rosterEntryLookupByConsultant } = props.rawData;
    let totalRecovery = 0;
    let workingDays = 0;

    days.forEach(dayObj => {
      const { date, displayDate, day } = dayObj;
      const entry = rosterEntryLookupByConsultant[`${consultantId}-${date}`];
      let projectName;
      let costRecovery;
      if (entry) {
        projectName = entry.project.key || entry.project.name;
        costRecovery = entry.consultant.internalRate;
        totalRecovery += +costRecovery;
        workingDays++;
      }
      dateRows.push([displayDate, day, projectName, costRecovery]);
    });

    dateRows.push({
      rowStyle: 'total',
      data: [`${workingDays} working days`, '', '', totalRecovery],
    });

    this.state = { dateRows };
  }

  renderCell = data => (
    <Cell>
      <Text>{data}</Text>
    </Cell>
  );

  render() {
    return <Table data={this.state.dateRows} renderCell={this.renderCell} />;
  }
}

export default DrilldownConsultant;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: 1;
`;
