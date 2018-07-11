import React from 'react';
import { ScrollView, View, Text, Button, styled } from 'bappo-components';
import Planner from './Planner';

class Projects extends React.Component {
  state = {
    loading: true,
  };

  async componentDidMount() {
    console.log(this.props);
    const projects = await this.props.$models.Project.findAll({
      where: {
        projectType: '3',
      },
      limit: 1000,
    });

    const projectIds = projects.map(p => p.id);

    const entries = await this.props.$models.ProjectForecastEntry.findAll({
      where: {
        project_id: { $in: projectIds },
      },
      limit: 1000,
    });

    const total = {};
    for (let p of projects) {
      total[p.id] = { revenue: 0.0, cost: 0.0 };
    }

    // summarize
    for (let e of entries) {
      if (e.forecastType === '2') total[e.project_id].revenue += Number(e.amount);
    }

    const results = [];
    for (let p of projects) {
      results.push({ ...p, revenue: total[p.id].revenue });
    }

    this.setState({
      results,
      loading: false,
    });
  }

  renderProject = project => {
    return (
      <Row onPress={() => this.setState({ project })}>
        <Text>
          {project.name} ({project.revenue})
        </Text>
      </Row>
    );
  };

  render() {
    if (this.state.loading) return <Text> Loading </Text>;
    if (this.state.project) return <Planner {...this.props} project={this.state.project} />;
    return <ScrollView>{this.state.results.map(this.renderProject)}</ScrollView>;
    return <Text> Hello </Text>;
  }
}

export default Projects;

const Row = styled(Button)`
  height: 40px;
  background-color: #f8f8f8;
  margin: 2px;
  text-align: center;
  justify-content: center;
  align-items: center;
`;
