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
  Card,
  Switch
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
    searchText: null,
    isMultiple: false,
    selectedProjects: [],
    showMultiple: false
  };

  async componentDidMount() {
    const projects = await this.props.$models.Project.findAll({
      where: {
        active: true
      }
    });
    this.setState({
      filteredProjects: projects.sort(function(a, b) {
        // Sort alphabetically
        const nameA = a.name.toLowerCase(),
          nameB = b.name.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      }),
      loading: false
    });
    this.data.projects = projects;
  }

  handleSearch = searchText => {
    const filteredProjects = this.data.projects.filter(p =>
      p.name.toLowerCase().includes(searchText.toLowerCase())
    );
    this.setState({ searchText, filteredProjects });
  };

  renderProjectCard = project => {
    const pIndex = this.state.selectedProjects.findIndex(
      p => p.id === project.id
    );

    const backgroundColor = pIndex === -1 ? null : "lightgray";

    return (
      <TouchableView
        onPress={() => {
          if (this.state.isMultiple)
            this.setState(state => {
              const newSelectedProjects = state.selectedProjects.slice();
              if (pIndex === -1) newSelectedProjects.push(project);
              else newSelectedProjects.splice(pIndex, 1);

              return {
                ...state,
                selectedProjects: newSelectedProjects
              };
            });
          else this.setState({ selectedProject: project });
        }}
      >
        <Card style={{ marginBottom: 3, backgroundColor }}>
          <Text>{project.name}</Text>
        </Card>
      </TouchableView>
    );
  };

  render() {
    const {
      loading,
      filteredProjects,
      selectedProject,
      selectedProjects,
      showMultiple
    } = this.state;

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    let rosterProjects = [];

    if (showMultiple) {
      rosterProjects = selectedProjects;
    } else if (selectedProject) {
      rosterProjects = [selectedProject];
    }

    if (rosterProjects.length > 0) {
      return (
        <Container>
          <StyledButton
            text="Go back"
            type="secondary"
            onPress={() =>
              this.setState({
                selectedProject: null,
                selectedProjects: [],
                showMultiple: false
              })
            }
          />
          <Roster {...this.props} projects={rosterProjects} />
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
          style={{ marginTop: 10, marginBottom: 10 }}
        />
        <ToggleContainer>
          <Switch
            value={this.state.isMultiple}
            onValueChange={() =>
              this.setState(state => ({
                ...state,
                isMultiple: !state.isMultiple,
                selectedProjects: []
              }))
            }
          />
          <Text style={{ marginLeft: 8, marginRight: 32 }}>
            Select multiple projects
          </Text>
          {selectedProjects.length > 0 && (
            <Button
              type="secondary"
              text="Go"
              onPress={() => this.setState({ showMultiple: true })}
            />
          )}
        </ToggleContainer>
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

const ToggleContainer = styled(View)`
  flex-direction: row;
  align-items: center;
  margin: 8px 0;
`;
