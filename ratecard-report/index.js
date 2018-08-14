import React from "react";
import { FlatList, View, Text, TouchableView, styled } from "bappo-components";
import { getRate } from "./utils";

class Roster extends React.Component {
  state = {
    loading: true,
    consultants: []
  };

  renderRow = info => {
    const consultant = info.item;
    console.log(consultant);
    return (
      <Row>
        <Cell>
          <Text>{consultant.name}</Text>
        </Cell>
        <Cell>
          <Text>{consultant.rate}</Text>
        </Cell>
      </Row>
    );
  };

  loadData = async () => {
    const { Consultant, RosterEntry, Probability } = this.props.$models;
    const _consultants = await Consultant.findAll({
      include: [{ as: "consultantEvents", include: [{ as: "costCentre" }] }],
      limit: 10000,
      where: {
        active: true
      }
    });

    const consultants = _consultants.map(c => {
      return {
        ...c,
        rate: getRate(c)
      };
    });

    this.setState({
      loading: false,
      consultants
    });
  };

  componentDidMount() {
    this.loadData();
  }

  render() {
    if (this.state.loading) {
      return (
        <View>
          <Text>Loading</Text>
        </View>
      );
    }

    return (
      <FlatList
        windowSize={1}
        data={this.state.consultants}
        renderItem={this.renderRow}
        getItemLayout={(_data, index) => ({
          length: 34,
          offset: 34 * index,
          index
        })}
      />
    );
  }
}

export default Roster;

const Row = styled(View)`
  border-bottom: 1px solid #eee;
  flex-direction: row;
  height: 30px;
  margin: 2px;
`;

const Cell = styled(View)`
  justify-content: center;
  padding-left: 10px;
  padding-right: 10px;
  width: 200px;
`;
