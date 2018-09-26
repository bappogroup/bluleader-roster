import React from "react";
import {
  ActivityIndicator,
  View,
  Text,
  TouchableView,
  Card
} from "bappo-components";
import Roster from "./Roster";

class RosterByProject extends React.Component {
  state = {
    loading: true,
    projects: [],
    selectedProject: null
  };

  async componentDidMount() {
    const projects = await this.props.$models.Project.findAll({ where: {} });
    this.setState({ projects, loading: false });
  }

  renderProjectCard = project => {
    return (
      <TouchableView
        onPress={() => this.setState({ selectedProject: project })}
      >
        <Card style={{ marginBottom: 3 }}>
          <Text>{project.name}</Text>
        </Card>
      </TouchableView>
    );
  };

  render() {
    // TODO: search, go back
    const { loading, projects, selectedProject } = this.state;

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    if (selectedProject)
      return <Roster {...this.props} project={selectedProject} />;

    return <View>{projects.map(this.renderProjectCard)}</View>;
  }
}

export default RosterByProject;
