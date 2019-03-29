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
import RosterEntryForm from "./RosterEntryForm";
import RequestRow from "./RequestRow";

const arrToOptions = arr =>
  arr.map(element => ({ label: element.name, value: element.id }));

// TODO - infinite scroll?
// TODO - show existing entries when creating a request?

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
    projectOptions: [],
    leaveProjects: []
  };

  async componentDidMount() {
    const { $models } = this.props;
    const [
      probabilityArr,
      consultantArr,
      projectArr,
      rawRequests
    ] = await Promise.all([
      $models.Probability.findAll({}),
      $models.Consultant.findAll({}),
      $models.Project.findAll({}),
      $models.ResourceRequest.findAll({
        where: {},
        include: [{ as: "requestedBy" }]
      })
    ]);

    const probabilityMap = new Map();
    probabilityArr.forEach(p => probabilityMap.set(p.id, p));
    const consultantMap = new Map();
    consultantArr.forEach(c => consultantMap.set(c.id, c));
    const projectMap = new Map();
    projectArr.forEach(p => projectMap.set(p.id, p));
    const leaveProjects = projectArr.filter(p =>
      ["4", "5", "6"].includes(p.projectType)
    );
    const requests = rawRequests.map(r => ({
      ...r,
      probability: probabilityMap.get(r.probability_id),
      consultant: consultantMap.get(r.consultant_id),
      project: projectMap.get(r.project_id)
    }));

    this.data = {
      probabilityOptions: arrToOptions(probabilityArr),
      consultantOptions: arrToOptions(consultantArr),
      projectOptions: arrToOptions(projectArr),
      leaveProjects: leaveProjects
    };
    this.setState({ requests, loading: false });
  }

  handleSubmit = values =>
    this.props.$models.ResourceRequest.create({
      startDate: values.startDate,
      endDate: values.endDate,
      comments: values.comments,
      skillsRequired: values.skillsRequired,
      consultant_id: values.consultant_id,
      project_id: values.project_id,
      requestedBy_id: values.userId,
      probability_id: values.probability_id,
      requestDate: values.changeDate
    });

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
          <View>
            <FlatList data={this.state.requests} renderItem={this.renderRow} />
            <NewRequestButton
              onPress={() => this.setState({ showEntryForm: true })}
              text="New Request"
              icon="add"
              type="primary"
            />
          </View>
        )}
        {this.state.showEntryForm && (
          <RosterEntryForm
            $models={this.props.$models}
            currentUser={this.props.$global.currentUser}
            title="New Request"
            onClose={() => this.setState({ showEntryForm: false })}
            consultantOptions={this.data.consultantOptions}
            projectOptions={this.data.projectOptions}
            probabilityOptions={this.data.probabilityOptions}
            leaveProjectIds={this.data.leaveProjects.map(p => p.id)}
            dateToExistingEntryMap={new Map()}
            onSubmit={this.handleSubmit}
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
