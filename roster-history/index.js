import React from 'react';
import { Text, styled } from 'bappo-components';

class Report extends React.Component {
  state = {
    loading: true,
    changes: [],
  };

  loadData = async () => {
    const changes = await this.props.$models.RosterChange.findAll({
      where: {},
      include: [{ as: 'project' }, { as: 'probability' }],
    });
    this.setState({
      loading: false,
      changes: changes.sort((a, b) => b.id - a.id),
    });
  };

  componentDidMount() {
    this.loadData();
  }

  render() {
    if (this.state.loading) return <div> loading </div>;
    return <Container>{this.state.changes.map(renderRow)}</Container>;
  }
}

export default Report;

const renderRow = row => {
  return (
    <Row>
      <Cell>
        {row.consultant} booked from {row.startDate} to {row.endDate}
        <SideNote>
          {weekdays[row.weekdayFrom]} to {weekdays[row.weekdayTo]}
        </SideNote>
      </Cell>
      <Cell>
        on {row.project && row.project.name}{' '}
        <SideNote>probability: {row.probability && row.probability.name}</SideNote>
      </Cell>
      <Cell>
        {' '}
        Changed by {row.changedBy} on {row.changeDate}
      </Cell>
    </Row>
  );
};

const weekdays = {};
weekdays[1] = 'Mon';
weekdays[2] = 'Tue';
weekdays[3] = 'Wed';
weekdays[4] = 'Thu';
weekdays[5] = 'Fri';
weekdays[6] = 'Sat';
weekdays[7] = 'Sun';

const Container = styled.div`
  overflow-y: scroll;
`;

const Row = styled.div`
  border: 1px solid #eee;
  border-radius: 3px;
  padding: 10px 20px;
  margin: 10px 20px;
`;

const SideNote = styled.span`
  color: #ddd;
  font-size: 10pt;
  padding-left: 10px;
`;

const Cell = styled.div``;
