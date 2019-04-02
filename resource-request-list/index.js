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
// TODO - show existing entries when creating a request

class Page extends React.Component {
  state = {
    filter: null,
    requests: [],
    loading: true,
    rosterForm: {
      show: false,
      props: {
        title: null,
        onSubmit: () => {}
      }
    },
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
    const [probabilityArr, consultantArr, projectArr] = await Promise.all([
      $models.Probability.findAll({}),
      $models.Consultant.findAll({}),
      $models.Project.findAll({})
    ]);

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

    this.fetchRequests();
  }

  // Fetch requets & versions and put in state
  fetchRequests = async () => {
    this.setState({ loading: true });

    const { $models } = this.props;
    // Fetch requests
    const rawRequests = await $models.Request.findAll({
      where: {},
      include: [{ as: "_conversations" }]
    });

    // Fetch all versions for requests
    const rawVersions = await $models.RequestVersion.findAll({
      where: {
        request_id: { $in: rawRequests.map(rr => rr.id) }
      },
      include: [{ as: "requestedBy" }]
    });

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
  };

  // Populate probability, consultant and project into a raw request
  getPopulatedVersion = rawVersion => ({
    ...rawVersion,
    probability: this.data.probabilityMap.get(rawVersion.probability_id),
    consultant: this.data.consultantMap.get(rawVersion.consultant_id),
    project: this.data.projectMap.get(rawVersion.project_id)
  });

  handleSubmitRosterForm = async values => {
    const { $models } = this.props;
    let request = this.state.rosterForm.request;
    let versionNumber;

    if (!request) {
      // Create new request
      request = await $models.Request.create({});
      versionNumber = "1";
    } else {
      // update previous 'current version'
      const currentVersion = request.versions[request.versions.length - 1];
      await $models.RequestVersion.update(
        { isCurrentVersion: false },
        {
          where: {
            id: currentVersion.id
          }
        }
      );
      versionNumber = currentVersion.versionNumber + 1;
    }

    // Create new version
    await $models.RequestVersion.create({
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
      request_id: request.id,
      versionNumber,
      isCurrentVersion: true
    });

    // Refetch updated requests
    this.fetchRequests();
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
    <RequestRow
      key={index}
      request={item}
      chat={this.props.$chat}
      showRosterForm={({ title }) =>
        this.setState({
          rosterForm: {
            show: true,
            title,
            request: item
          }
        })
      }
    />
  );

  renderRosterForm = () => {
    const { show, title, request } = this.state.rosterForm;
    if (!(show && this.data.consultantOptions.length)) return null;

    const initialValues = request
      ? request.versions[request.versions.length - 1]
      : {};

    return (
      <RosterEntryForm
        $models={this.props.$models}
        currentUser={this.props.$global.currentUser}
        title={title}
        onClose={() => this.setState({ rosterForm: { show: false } })}
        consultantOptions={this.data.consultantOptions}
        projectOptions={this.data.projectOptions}
        probabilityOptions={this.data.probabilityOptions}
        leaveProjectIds={this.data.leaveProjects.map(p => p.id)}
        dateToExistingEntryMap={new Map()}
        onSubmit={this.handleSubmitRosterForm}
        initialValues={initialValues}
      />
    );
  };

  render() {
    return (
      <Container>
        <Heading>Requests</Heading>
        {this.renderFilters()}
        <Separator />
        {this.state.loading && <ActivityIndicator style={{ margin: 16 }} />}
        <FlatList data={this.state.requests} renderItem={this.renderRow} />
        <NewRequestButton
          onPress={() =>
            this.setState({
              rosterForm: {
                show: true,
                title: "New Request"
              }
            })
          }
          text="New Request"
          icon="add"
          type="primary"
        />
        {this.renderRosterForm()}
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
  margin-top: 8px;
  margin-bottom: -24px;
`;
