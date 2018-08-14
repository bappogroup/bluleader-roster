import React from "react";
import {
  View,
  Text,
  styled,
  TouchableView,
  ScrollView,
  TextInput
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

  render() {
    return (
      <Container>
        <SearchInput
          placeholder="Search consultants"
          onValueChange={this.onSearchTermChange}
          value={this.state.searchString}
        />
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

const Row = styled(TouchableView)`
  height: 40px;
  justify-content: center;
  align-items: center;
`;

const Container = styled(View)`
  display: flex;
  flex: 1;
`;

const SearchInput = styled(TextInput)`
  border-style: solid;
  border-width: 2px;
  border-color: #ddd;
  border-radius: 3px;
  margin: 20px;
  height: 40px;
  padding-left: 20px;
`;
