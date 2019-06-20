import React from "react";
import {
  View,
  Text,
  styled,
  TouchableView,
  ScrollView,
  TextInput,
  Dropdown
} from "bappo-components";

class Consultants extends React.Component {
  state = {
    consultants: [],
    shortlist: [],
    searchString: ""
  };

  getData = async () => {
    const consultants = await this.props.$models.Consultant.findAll({
      limit: 1000,
      where: {
        active: true
      }
    });
    this.setState({ consultants, shortlist: consultants });
  };

  componentDidMount() {
    this.getData();
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextState === this.state) return false;
    return true;
  }

  refreshList = () => {
    const searchString = this.state.searchString.toLocaleLowerCase();
    const shortlist = this.state.consultants.filter(
      c => c.name.toLowerCase().search(searchString) > -1
    );
    this.setState({ shortlist });
  };

  onSearchTermChange = v => {
    this.setState({ searchString: v });
    clearTimeout(this.timer);
    this.timer = setTimeout(this.refreshList, 300);
  };

  showRoster = consultant => {
    this.props.$navigation.navigate("SingleRosterPage", {
      recordId: consultant.id
    });
  };

  handleCreateAssignment = async assignment => {
    const { $models } = this.props;
    const existingAssignment = await $models.ProjectAssignment.findOne({
      where: {
        consultant_id: assignment.consultant_id,
        project_id: assignment.project_id
      }
    });

    // Avoid duplication and create new assignment
    if (!existingAssignment) {
      await $models.ProjectAssignment.create(assignment);
    }
  };

  render() {
    return (
      <Container>
        <Header>
          <SearchInput
            placeholder="Search consultants"
            onValueChange={this.onSearchTermChange}
            value={this.state.searchString}
          />
          <Dropdown
            icon="menu"
            actions={[
              {
                icon: "assignment-ind",
                label: "Assign a Project to a Consultant",
                onPress: () =>
                  this.props.$popup.form({
                    title: "New Assignment",
                    formKey: "ProjectAssignmentForm",
                    onSubmit: this.handleCreateAssignment
                  })
              }
            ]}
          />
        </Header>

        <ScrollView>
          {this.state.shortlist.map(c => (
            <Row onPress={() => this.showRoster(c)} key={c.id}>
              <Text>{c.name}</Text>
            </Row>
          ))}
        </ScrollView>
      </Container>
    );
  }
}

export default Consultants;

const Container = styled(View)`
  display: flex;
  flex: 1;
`;

const Header = styled(View)`
  flex-direction: row;
  margin: 16px;
  align-items: center;
`;

const Row = styled(TouchableView)`
  height: 40px;
  justify-content: center;
  align-items: center;
`;

const SearchInput = styled(TextInput)`
  flex: 1;
  height: 40px;
  border-style: solid;
  border-width: 2px;
  border-color: #ddd;
  border-radius: 3px;
  margin-right: 16px;
  padding-left: 16px;
`;
