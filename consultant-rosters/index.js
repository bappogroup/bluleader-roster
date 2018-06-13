import React from 'react';
import { View, Text, styled, Button } from 'bappo-components';
import SingleRoster from 'single-roster';

class Consultants extends React.Component {
  state = {
    consultants: [],
    consultant: null,
  };

  getData = async () => {
    const consultants = await this.props.$models.Consultant.findAll({
      limit: 10,
    });
    this.setState({ consultants });
  };

  componentDidMount() {
    this.getData();
  }

  renderRoster = () => {
    if (!this.state.consultant) {
      return (
        <View>
          <Text> will go here </Text>
        </View>
      );
    }
    return <SingleRoster {...this.props} consultantId={this.state.consultant.id} />;
  };

  render() {
    return (
      <View>
        <View>
          {this.state.consultants.map(c => (
            <Button onPress={() => this.setState({ consultant: c })}>
              <Text>{c.name}</Text>
            </Button>
          ))}
        </View>
        {this.renderRoster()}
      </View>
    );
  }
}

export default Consultants;
