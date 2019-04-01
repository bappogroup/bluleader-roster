import React from "react";
import {
  styled,
  ActivityIndicator,
  Separator,
  View,
  Heading,
  Button,
  FlatList,
  SwitchField
} from "bappo-components";
import RosterEntryForm from "roster-entry-form";
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
    showNewRequestForm: false,
    showAllRequests: false
  };

  data = {
    probabilityMap: [], // id to record Map
    consultantMap: [],
    projectMap: [],
    probabilityOptions: [], // [{ value, label }]
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
      $models.Request.findAll({
        where: {},
        include: [{ as: "_conversations" }]
      })
    ]);

    // Fetch all versions for requests
    const rawVersions = await $models.RequestVersion.findAll({
      where: {
        request_id: { $in: rawRequests.map(rr => rr.id) }
      },
      include: [{ as: "requestedBy" }]
    });

    // Build id-to-entity maps for relationships
    const probabilityMap = new Map();
    probabilityArr.forEach(p => probabilityMap.set(p.id, p));
    const consultantMap = new Map();
    consultantArr.forEach(c => consultantMap.set(c.id, c));
    const projectMap = new Map();
    projectArr.forEach(p => projectMap.set(p.id, p));
    const leaveProjects = projectArr.filter(p =>
      ["4", "5", "6"].includes(p.projectType)
    );

    this.data = {
      probabilityMap,
      consultantMap,
      projectMap,
      leaveProjects,
      probabilityOptions: arrToOptions(probabilityArr),
      consultantOptions: arrToOptions(consultantArr),
      projectOptions: arrToOptions(projectArr)
    };

    // Populate versions with relationships
    const versions = rawVersions
      .map(rcv => this.getPopulatedVersion(rcv))
      .sort((a, b) => a.name - b.name);

    // Populate requests with current versions
    const requests = rawRequests.map(r => {
      const versionsForThisRequest = versions.filter(
        cv => cv.request_id === r.id
      );
      return {
        ...r,
        versions: versionsForThisRequest
      };
    });

    this.setState({ requests, loading: false });
  }

  // Populate probability, consultant and project into a raw request
  getPopulatedVersion = rawVersion => ({
    ...rawVersion,
    probability: this.data.probabilityMap.get(rawVersion.probability_id),
    consultant: this.data.consultantMap.get(rawVersion.consultant_id),
    project: this.data.projectMap.get(rawVersion.project_id)
  });

  handleSubmitNewRequest = async values => {
    const { $models } = this.props;

    // Create new request
    const createdRequest = await $models.Request.create({});

    const rawCreatedVersion = await $models.RequestVersion.create({
      startDate: values.startDate,
      endDate: values.endDate,
      comments: values.comments,
      skillsRequired: values.skillsRequired,
      consultant_id: values.consultant_id,
      project_id: values.project_id,
      requestedBy_id: values.userId,
      probability_id: values.probability_id,
      requestDate: values.changeDate,
      includedDates: values.includedDates,
      request_id: createdRequest.id,
      versionNumber: "1",
      isCurrentVersion: true
    });

    // Put the new request into local state
    const createdVersion = this.getPopulatedVersion(rawCreatedVersion);
    const user = await $models.User.findById(rawCreatedVersion.requestedBy_id);
    createdVersion.requestedBy = user;
    createdRequest.versions = [createdVersion];

    await this.setState(({ requests }) => ({
      requests: [createdRequest, ...requests]
    }));
  };

  renderFilters = () => {
    return (
      <FiltersContainer>
        <SwitchField
          label="Show all"
          onValueChange={() =>
            this.setState(({ showAllRequests }) =>
              this.setState({ showAllRequests: !showAllRequests })
            )
          }
          value={this.state.showAllRequests}
        />
      </FiltersContainer>
    );
  };

  renderRow = ({ item, index }) => (
    <RequestRow key={index} request={item} chat={this.props.$chat} />
  );

  render() {
    return (
      <Container>
        <Heading>Requests</Heading>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          {this.renderFilters()}
        </View>
        <Separator />
        {this.state.loading ? (
          <ActivityIndicator style={{ margin: 32 }} />
        ) : (
          <View>
            <FlatList data={this.state.requests} renderItem={this.renderRow} />
            <NewRequestButton
              onPress={() => this.setState({ showNewRequestForm: true })}
              text="New Request"
              icon="add"
              type="primary"
            />
          </View>
        )}
        {this.state.showNewRequestForm && (
          <RosterEntryForm
            $models={this.props.$models}
            currentUser={this.props.$global.currentUser}
            title="New Request"
            onClose={() => this.setState({ showNewRequestForm: false })}
            consultantOptions={this.data.consultantOptions}
            projectOptions={this.data.projectOptions}
            probabilityOptions={this.data.probabilityOptions}
            leaveProjectIds={this.data.leaveProjects.map(p => p.id)}
            dateToExistingEntryMap={new Map()}
            onSubmit={this.handleSubmitNewRequest}
          />
        )}
      </Container>
    );
  }
}

export default Page;

const Container = styled(View)`
  flex: 1;
  background-color: #fafafa;
  padding: 8px;
`;

const NewRequestButton = styled(Button)`
  align-self: center;
  margin-top: 16px;
`;

const FiltersContainer = styled(View)`
  flex-direction: row;
`;
