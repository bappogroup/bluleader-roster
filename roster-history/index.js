import React from "react";
import { Text, View, ScrollView, styled } from "bappo-components";
import DatePreview from "date-preview";

class Report extends React.Component {
  state = {
    loading: true,
    changes: []
  };

  loadData = async () => {
    const changes = await this.props.$models.RosterChange.findAll({
      where: {},
      include: [{ as: "project" }, { as: "probability" }],
      limit: 1000
    });
    this.setState({
      loading: false,
      changes: changes.sort((a, b) => b.id - a.id)
    });
  };

  componentDidMount() {
    this.loadData();
  }

  render() {
    if (this.state.loading)
      return (
        <View>
          <Text>Loading...</Text>
        </View>
      );
    return <ScrollView>{this.state.changes.map(renderRow)}</ScrollView>;
  }
}

export default Report;

const renderRow = row => (
  <Row>
    <Cell>
      <Label>{row.consultant}</Label>
      <Text>
        booked from {row.startDate} to {row.endDate}
      </Text>
    </Cell>
    <Text>including:</Text>
    <DatePreview datesString={row.includedDates} />
    <Cell>
      <Text>on {row.project && row.project.name}</Text>
      <SideNote>
        probability: {row.probability && row.probability.name}
      </SideNote>
    </Cell>
    <Cell>
      <Text>
        Changed by {row.changedBy} on {row.changeDate}
      </Text>
    </Cell>
  </Row>
);

const Row = styled(View)`
  border: 1px solid #eee;
  border-radius: 3px;
  padding: 10px 20px;
  margin: 10px 20px;
`;

const SideNote = styled(Text)`
  color: #ddd;
  padding-left: 10px;
`;

const Cell = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
`;

const Label = styled(Text)`
  font-weight: bold;
  padding-right: 10px;
`;
