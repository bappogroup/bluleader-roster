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
  Separator,
  Icon
} from "bappo-components";
import Roster from "./Roster";

class RosterByProject extends React.Component {
  data = {
    projects: []
  };

  state = {
    loading: true,
    filteredProjects: [],
    searchText: null,
    selectedProjects: [],
    showRoster: false
  };

  async componentDidMount() {
    let projects = await this.props.$models.Project.findAll({
      where: {
        active: true
      },
      include: [{ as: "customer" }, { as: "profitCentre" }]
    });
    projects = projects.map(p => {
      p.searchString = `
        ${p.profitCentre && p.profitCentre.name} 
        ${p.customer && p.customer.name} 
        ${p.name} 
      `;
      return p;
    });

    this.setState({
      filteredProjects: projects.sort(function(a, b) {
        // Sort alphabetically
        const nameA = a.searchString.toLowerCase(),
          nameB = b.searchString.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      }),
      loading: false
      // selectedProjects: projects, // REMOVE - ONLY FOR DEBUG
      // showRoster: true // REMOVE - ONLY FOR DEBUG
    });
    this.data.projects = projects;
  }

  handleSearch = searchText => {
    const filteredProjects = this.data.projects.filter(p =>
      p.searchString.toLowerCase().includes(searchText.toLowerCase())
    );
    this.setState({ searchText, filteredProjects });
  };

  renderProjectCard = project => {
    const pIndex = this.state.selectedProjects.findIndex(
      p => p.id === project.id
    );

    const backgroundColor = pIndex === -1 ? "white" : "#ddd";

    return (
      <TouchableView
        onPress={() =>
          this.setState(state => {
            const newSelectedProjects = state.selectedProjects.slice();
            if (pIndex === -1) newSelectedProjects.push(project);
            else newSelectedProjects.splice(pIndex, 1);

            return {
              ...state,
              selectedProjects: newSelectedProjects
            };
          })
        }
      >
        <Row style={{ marginBottom: 3, backgroundColor }}>
          <View style={{ width: 200 }}>
            <Text numberOfLines={1}>
              {project && project.profitCentre && project.profitCentre.name}
            </Text>
          </View>
          <View style={{ width: 200 }}>
            <Text numberOfLines={1}>
              {project && project.customer && project.customer.name}
            </Text>
          </View>
          <View style={{ width: 300 }}>
            <Text numberOfLines={1}>{project && project.name}</Text>
          </View>
        </Row>
      </TouchableView>
    );
  };

  render() {
    const {
      loading,
      filteredProjects,
      selectedProjects,
      showRoster
    } = this.state;

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    if (showRoster) {
      const projectNames = selectedProjects.map(p => p.name).join(", ");

      return (
        <Container>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <StyledButton
              text="Go back"
              type="tertiary"
              onPress={() =>
                this.setState({
                  selectedProject: null,
                  selectedProjects: [],
                  showRoster: false
                })
              }
            />
            <Heading>Roster for Projects: {projectNames}</Heading>
          </View>

          <Separator />
          <Roster {...this.props} projects={selectedProjects} />
        </Container>
      );
    }

    return (
      <ListContainer>
        <SearchRow>
          <Icon name="search" style={{ marginRight: 8 }} />
          <TextInput
            autoFocus
            value={this.state.searchText}
            onValueChange={this.handleSearch}
            placeholder="Search projects"
            style={{ marginTop: 10, marginBottom: 10 }}
          />
        </SearchRow>
        <ProjectList style={{ flex: 1, padding: 16 }}>
          {filteredProjects.length ? (
            filteredProjects.map(this.renderProjectCard)
          ) : (
            <Text>No projects found</Text>
          )}
        </ProjectList>
        <ButtonRow>
          {selectedProjects.length > 0 && (
            <Button
              text="Run"
              onPress={() => this.setState({ showRoster: true })}
            />
          )}
        </ButtonRow>
      </ListContainer>
    );
  }
}

export default RosterByProject;

const ListContainer = styled(View)`
  background-color: #f8f8f8;
  flex: 1;
  padding-top: 10px;
`;

const ProjectList = styled(ScrollView)``;

const Container = styled(View)`
  background-color: #f8f8f8;
  flex: 1;
  padding: 16px 8px 0 16px;
`;

const SearchRow = styled(View)`
  flex-direction: row;
  align-items: center;
  background-color: white;
  margin: 5px 16px;
  border: 1px solid #eee;
`;

const StyledButton = styled(Button)`
  margin-right: 8px;
`;

const Row = styled(View)`
  height: 40px;
  flex-direction: row;
  padding-left: 16px;
  align-items: center;
  border-radius: 2px;
  box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.1);
  margin: 5px 0;
  &:hover {
    box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.2);
  }
`;

const ButtonRow = styled(View)`
  margin: 10px 16px;
`;

const Heading = styled(Text)`
  font-size: 18px;
`;
