import React from "react";
import {
  styled,
  Button,
  ActivityIndicator,
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableView,
  Card
} from "bappo-components";
import Roster from "./Roster";

class RosterByProject extends React.Component {
  data = {
    projects: []
  };

  state = {
    loading: true,
    filteredProjects: [],
    selectedProject: null,
    searchText: null
  };

  async componentDidMount() {
    const projects = await this.props.$models.Project.findAll({ where: {} });
    this.setState({ filteredProjects: projects, loading: false });
    this.data.projects = projects;
  }

  handleSearch = searchText => {
    const filteredProjects = this.data.projects.filter(p =>
      p.name.toLowerCase().includes(searchText.toLowerCase())
    );
    this.setState({ searchText, filteredProjects });
  };

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
    const { loading, filteredProjects, selectedProject } = this.state;

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    if (selectedProject) {
      return (
        <Container>
          <StyledButton
            text="Go back"
            type="secondary"
            onPress={() => this.setState({ selectedProject: null })}
          />
          <Roster {...this.props} project={selectedProject} />
        </Container>
      );
    }

    return (
      <ScrollView style={{ flex: 1 }}>
        <TextInput
          autoFocus
          value={this.state.searchText}
          onValueChange={this.handleSearch}
          placeholder="Search projects"
          style={{ marginTop: 10, marginBottom: 20 }}
        />
        {filteredProjects.length ? (
          filteredProjects.map(this.renderProjectCard)
        ) : (
          <Text>No projects found</Text>
        )}
      </ScrollView>
    );
  }
}

export default RosterByProject;

const Container = styled(View)`
  flex: 1;
`;

const StyledButton = styled(Button)`
  margin-bottom: 10px;
  align-self: flex-start;
`;
