import React from "react";
import { Text, View, ScrollView, styled } from "bappo-components";
import DatePreview from "date-preview";

class Report extends React.Component {
  state = {
    loading: true,
    changes: []
  };

  loadData = async () => {
    const { $models } = this.props;

    const [consultants, changes] = await Promise.all([
      $models.Consultant.findAll({
        where: { active: true }
      }),
      $models.RosterChange.findAll({
        where: {},
        include: [{ as: "project" }, { as: "probability" }],
        limit: 300
      })
    ]);

    const consultantMap = new Map();
    consultants.forEach(c => consultantMap.set(c.id, c));

    this.setState({
      consultantMap,
      loading: false,
      changes: changes.sort((a, b) => b.id - a.id)
    });
  };

  componentDidMount() {
    this.loadData();
  }

  renderRow = change => {
    let consultantNames = change.consultant;
    if (!consultantNames && change.includedConsultantIds) {
      const names = [];
      change.includedConsultantIds
        .split(", ")
        .forEach(id => names.push(this.state.consultantMap.get(id).name));
      consultantNames = names.join(", ");
    }

    if (!change.project)
      return (
        <Row>
          <Cell>
            <Text>
              Schedules from {change.startDate} to {change.endDate} were deleted
              for the following consultants:
            </Text>
            <View style={{ margin: "8px 0" }}>
              <Text>{consultantNames}</Text>
            </View>
          </Cell>
          <Text>including:</Text>
          <DatePreview datesString={change.includedDates} />
          <Cell>
            <Text>
              Changed by {change.changedBy} on {change.changeDate}
            </Text>
          </Cell>
        </Row>
      );

    return (
      <Row>
        <Cell>
          <Text>{consultantNames}</Text>
          <Text>
            were booked from {change.startDate} to {change.endDate}
          </Text>
        </Cell>
        <Text>including:</Text>
        <DatePreview datesString={change.includedDates} />
        <Cell style={{ flexDirection: "row" }}>
          <Text>on {change.project && change.project.name} </Text>
          <Text>
            (probability: {change.probability && change.probability.name})
          </Text>
        </Cell>
        <Cell>
          <Text>
            Changed by {change.changedBy} on {change.changeDate}
          </Text>
        </Cell>
      </Row>
    );
  };

  render() {
    if (this.state.loading)
      return (
        <View>
          <Text>Loading...</Text>
        </View>
      );
    return <ScrollView>{this.state.changes.map(this.renderRow)}</ScrollView>;
  }
}

export default Report;

const Row = styled(View)`
  border: 1px solid #eee;
  border-radius: 3px;
  padding: 10px 20px;
  margin: 10px 20px;
`;

const Cell = styled(View)`
  flex-wrap: wrap;
`;
