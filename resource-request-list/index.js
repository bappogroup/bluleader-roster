import React from "react";
import {
  styled,
  ActivityIndicator,
  Separator,
  View,
  Heading,
  Button,
  FlatList
} from "bappo-components";
import RosterEntryForm from "roster-entry-form";
import RequestRow from "./RequestRow";

const arrToOptions = arr =>
  arr.map(element => ({ label: element.name, id: element.id }));

// TODO - infinite scroll?

class Page extends React.Component {
  state = {
    filter: null,
    requests: [],
    loading: true,
    showEntryForm: false
  };

  data = {
    probabilityOptions: [],
    consultantOptions: [],
    projectOptions: []
  };

  async componentDidMount() {
    const { $models } = this.props;
    const [probabilityArr, consultantArr, rawRequests] = await Promise.all([
      $models.Probability.findAll({}),
      $models.Consultant.findAll({}),
      $models.ResourceRequest.findAll({
        where: {},
        include: [{ as: "requestedBy" }, { as: "project" }]
      })
    ]);

    const probabilityMap = new Map();
    probabilityArr.forEach(p => probabilityMap.set(p.id, p));
    const consultantMap = new Map();
    consultantArr.forEach(c => consultantMap.set(c.id, c));
    const requests = rawRequests.map(r => ({
      ...r,
      probability: probabilityMap.get(r.probability_id),
      consultant: consultantMap.get(r.consultant_id)
    }));

    this.data = {
      probabilityOptions: arrToOptions(probabilityArr),
      consultantOptions: arrToOptions(consultantArr)
    };
    this.setState({ requests, loading: false });
  }

  handleCreateRequest = () => {};

  renderRow = ({ item, index }) => {
    return <RequestRow {...item} key={index} />;
  };

  render() {
    return (
      <Container>
        <Title>Requests</Title>
        <Separator />
        {this.state.loading ? (
          <ActivityIndicator style={{ margin: 32 }} />
        ) : (
          <FlatList data={this.state.requests} renderItem={this.renderRow} />
        )}
        <NewRequestButton
          onPress={this.handleCreateRequest}
          text="New Request"
          icon="add"
          type="primary"
        />
        {this.state.showEntryForm && (
          <RosterEntryForm
            $models={this.props.$models}
            operatorName={this.props.$global.currentUser.name}
            title="New Request"
            onClose={() => this.setState({ showEntryForm: false })}
            consultant={consultant}
            projectOptions={this.data.projectOptions}
            probabilityOptions={this.data.probabilityOptions}
            leaveProjectIds={this.data.leaveProjects.map(p => p.id)}
            dateToExistingEntryMap={entryForm.dateToExistingEntryMap}
            afterSubmit={this.afterSubmit}
          />
        )}
      </Container>
    );
  }
}

export default Page;

const Container = styled(View)`
  padding: 8px;
`;

const Title = styled(Heading)``;

const NewRequestButton = styled(Button)`
  align-self: center;
  margin-top: 16px;
`;
