import React from "react";
import {
  styled,
  ActivityIndicator,
  Separator,
  View,
  Heading,
  Button,
  FlatList,
  SelectField
} from "bappo-components";
// import RosterEntryForm from "roster-entry-form";
import RosterEntryForm from "./RosterEntryForm";
import RequestRow from "./RequestRow";

const arrToOptions = arr =>
  arr.map(element => ({ label: element.name, value: element.id }));

// TODO - infinite scroll?

class Page extends React.Component {
  // Initial filters: all open requests
  state = {
    filters: {
      status: "1"
    },
    requests: [],
    loading: true,
    rosterForm: {
      show: false,
      title: "",
      request: null
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
    leaveProjects: [],
    filterUserOptions: [],
    filterConsultantOptions: []
  };

  async componentDidMount() {
    const { $models } = this.props;
    const [
      probabilityArr,
      consultantArr,
      projectArr,
      userArr,
      requestArr
    ] = await Promise.all([
      $models.Probability.findAll({}),
      $models.Consultant.findAll({}),
      $models.Project.findAll({}),
      $models.User.findAll({}),
      $models.Request.findAll({
        where: {
          status: this.state.filters.status
        },
        include: [{ as: "_conversations" }]
      })
    ]);

    // Build id-to-entity maps for relationships
    const probabilityMap = new Map();
    probabilityArr.forEach(p => probabilityMap.set(p.id, p));
    const consultantMap = new Map();
    consultantArr.forEach(c => consultantMap.set(c.id, c));
    const projectMap = new Map();
    projectArr.forEach(p => projectMap.set(p.id, p));
    const userMap = new Map();
    userArr.forEach(u => userMap.set(u.id, u));
    const leaveProjects = projectArr.filter(p =>
      ["4", "5", "6"].includes(p.projectType)
    );

    this.data = {
      ...this.data,
      probabilityMap,
      consultantMap,
      userMap,
      projectMap,
      leaveProjects,
      probabilityOptions: arrToOptions(probabilityArr),
      consultantOptions: arrToOptions(consultantArr),
      projectOptions: arrToOptions(projectArr),
      userOptions: arrToOptions(userArr)
    };

    this.fetchRequests(requestArr);
  }

  // Fetch requets & versions and put in state
  // If rawRequests are passed, only fetch versions
  fetchRequests = async requestArr => {
    this.setState({ loading: true });

    const { $models } = this.props;

    // Fetch requests
    let rawRequests = requestArr;
    if (!rawRequests)
      rawRequests = await $models.Request.findAll({
        where: {
          status: this.state.filters.status
        },
        include: [{ as: "_conversations" }]
      });

    // Fetch all versions for requests
    const rawVersions = await $models.RequestVersion.findAll({
      where: {
        request_id: { $in: rawRequests.map(rr => rr.id) }
      }
    });

    // Populate versions with relationships
    const versions = rawVersions
      .map(rcv => this.getPopulatedVersion(rcv))
      .sort((a, b) => a.name - b.name);

    // Get user & consultant options in filters
    const filterUserOptions = [];
    const filterConsultantOptions = [];
    rawVersions.forEach(rv => {
      const user = this.data.userMap.get(rv.requestedBy_id);
      if (!filterUserOptions.find(o => o.value === user.id))
        filterUserOptions.push({ value: user.id, label: user.name });
      const consultant = this.data.consultantMap.get(rv.consultant_id);
      if (!filterConsultantOptions.find(o => o.value === consultant.id))
        filterConsultantOptions.push({
          value: consultant.id,
          label: consultant.name
        });
    });
    this.data.filterUserOptions = filterUserOptions;
    this.data.filterConsultantOptions = filterConsultantOptions;

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
    project: this.data.projectMap.get(rawVersion.project_id),
    requestedBy: this.data.userMap.get(rawVersion.requestedBy_id)
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

  setFilterValue = (key, value) =>
    this.setState(({ filters }) => ({
      filters: {
        ...filters,
        [key]: value
      }
    }));

  renderFilters = () => {
    const statusField = this.props.$models.Request.fields.find(
      f => f.name === "status"
    );
    const statusOptions = statusField.properties.options.map(op => ({
      label: op.label,
      value: op.id
    }));
    const { filters } = this.state;
    const { filterUserOptions, filterConsultantOptions } = this.data;

    return (
      <FiltersContainer>
        <View style={{ width: 150, marginRight: 32 }}>
          <SelectField
            label="Status"
            options={statusOptions}
            onValueChange={async value => {
              await this.setState({ requests: [] });
              await this.setFilterValue("status", value);
              this.fetchRequests();
            }}
            value={filters.status}
          />
        </View>
        {filterUserOptions.length > 1 && (
          <View style={{ width: 250, marginRight: 32 }}>
            <SelectField
              label="Requested By"
              options={this.data.filterUserOptions}
              onValueChange={value =>
                this.setFilterValue("requestedBy_id", value)
              }
              value={filters.requestedBy_id}
            />
          </View>
        )}
        {filterConsultantOptions.length > 1 && (
          <View style={{ width: 250 }}>
            <SelectField
              label="Requested For"
              options={this.data.filterConsultantOptions}
              onValueChange={value =>
                this.setFilterValue("consultant_id", value)
              }
              value={filters.consultant_id}
            />
          </View>
        )}
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
        onSubmit={this.handleSubmitRosterForm}
        initialValues={initialValues}
      />
    );
  };

  render() {
    const { requests, filters } = this.state;
    const { consultant_id, requestedBy_id } = filters;

    const filteredRequests = requests
      .filter(req => {
        if (
          consultant_id &&
          !req.versions.find(v => v.consultant_id === consultant_id)
        )
          return false;
        return true;
      })
      .filter(req => {
        if (
          requestedBy_id &&
          !req.versions.find(v => v.requestedBy_id === requestedBy_id)
        )
          return false;
        return true;
      });

    return (
      <Container>
        <Heading>Requests</Heading>
        {this.renderFilters()}
        <Separator />
        {this.state.loading && <ActivityIndicator style={{ margin: 16 }} />}
        <FlatList data={filteredRequests} renderItem={this.renderRow} />
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
  padding: 16px;
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
