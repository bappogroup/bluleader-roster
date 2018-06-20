import React from 'react';
import { ActivityIndicator, View, Text, styled } from 'bappo-components';
import SingleRoster from 'single-roster';

class MyRoster extends React.Component {
  state = {
    loading: true,
    consultant: null,
    error: null,
  };

  async componentDidMount() {
    const { $models } = this.props;
    const consultant = (await $models.Consultant.findAll({
      where: {
        user_id: this.props.$global.currentUser.id,
      },
    }))[0];

    if (!consultant) {
      this.setState({
        loading: false,
        error: 'You are not linked to a consultant. Please contact your manager.',
      });
    } else {
      this.setState({ loading: false, consultant });
    }
  }

  render() {
    const { loading, error, consultant } = this.state;
    if (error) {
      return (
        <Container>
          <Text>{error}</Text>
        </Container>
      );
    }

    if (loading) {
      return (
        <Container>
          <ActivityIndicator />
        </Container>
      );
    }

    return <SingleRoster {...this.props} consultant={consultant} readOnly />;
  }
}

export default MyRoster;

const Container = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;
