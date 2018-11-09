import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableView,
  styled,
  ActivityIndicator
} from "bappo-components";
import HybridButton from "hybrid-button";
import Planner from "./Planner";

class Projects extends React.Component {
  state = {
    loading: true
  };

  async componentDidMount() {
    const projects = await this.props.$models.Project.findAll({
      where: {
        projectType: "3",
        profitCentre_id: this.props.profitCentre.id
      },
      limit: 1000
    });

    const projectIds = projects.map(p => p.id);

    const entries = await this.props.$models.ProjectForecastEntry.findAll({
      where: {
        project_id: { $in: projectIds }
      },
      limit: 1000
    });

    const total = {};
    for (const p of projects) {
      total[p.id] = { revenue: 0.0, cost: 0.0 };
    }

    // summarize
    for (const e of entries) {
      if (e.forecastType === "2")
        total[e.project_id].revenue += Number(e.amount);
    }

    const results = [];
    for (const p of projects) {
      results.push({ ...p, revenue: total[p.id].revenue });
    }

    this.setState({
      results,
      loading: false
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

  closePlanner = () => {
    this.setState({ project: null });
  };

  render() {
    if (this.state.loading)
      return <ActivityIndicator style={{ marginTop: 30 }} />;
    if (this.state.project)
      return (
        <Planner
          {...this.props}
          project={this.state.project}
          onClose={this.closePlanner}
        />
      );
    if (this.state.results.length === 0) {
      return (
        <View>
          <Text>No fixed price project found.</Text>
        </View>
      );
    }

    return (
      <ScrollView>{this.state.results.map(this.renderProject)}</ScrollView>
    );
  }
}

export default Projects;

const Row = styled(HybridButton)`
  height: 40px;
  background-color: #f8f8f8;
  margin: 2px;
  text-align: center;
  justify-content: center;
  align-items: center;
`;
