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
import moment from "moment";
import RosterEntryForm from "roster-entry-form";
import RequestRow from "./RequestRow";

const arrToOptions = arr =>
  arr.map(element => ({ label: element.name, value: element.id }));

// TODO - infinite scroll?

class Page extends React.Component {
  // Initial filters: all open requests
  state = {
    filters: {
      status: "1",
      sortBy: "startDate"
    },
    requests: [], // requests that match current 'status' in filters
    loading: true,
    rosterForm: {
      show: false,
      title: "",
      request: null
    },
    showAllRequests: false,
    canManageResourceRequests: false
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
    const { $models, $global } = this.props;
    const [
      manager,
      probabilityArr,
      consultantArr,
      projectArr,
      userArr,
      requestArr
    ] = await Promise.all([
      $models.Manager.findOne({
        where: { user_id: $global.currentUser.id }
      }),
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

    this.setState({
      canManageResourceRequests: manager.canManageResourceRequests
    });

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
    if (!rawRequests) {
      // Requests not provided - fetch from server
      const requestQuery = {
        where: {
          status: this.state.filters.status
        },
        include: [{ as: "_conversations" }]
      };
      if (this.state.filters.status !== "1") {
        // for non-open requests, only fetch 90 days old maximum
        const threeMonthAgo = moment()
          .subtract(90, "days")
          .format("YYYY-MM-DD");
        requestQuery.where._createdAt = {
          $gte: threeMonthAgo
        };
      }
      rawRequests = await $models.Request.findAll(requestQuery);
    }

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
      // Create a new open request
      request = await $models.Request.create({
        status: "1"
      });
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
      versionNumber = +currentVersion.versionNumber + 1;
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

  handleSetRequestStatus = async (status, id) => {
    const request = this.state.requests.find(r => r.id === id);
    if (request.status !== status) {
      // Update status
      this.props.$models.Request.update(
        { status },
        {
          where: { id }
        }
      );
      // Update requests in state by removing the modified request
      this.setState(({ requests }) => ({
        requests: requests.filter(r => r.id !== id)
      }));
    }
  };

  /**
   * Filter and sort requests based on user selection
   */
  getFilteredRequests = () => {
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

    switch (filters.sortBy) {
      case "startDate":
        filteredRequests.sort((r1, r2) => {
          const currentVersionR1 = r1.versions.find(v => v.isCurrentVersion);
          const currentVersionR2 = r2.versions.find(v => v.isCurrentVersion);
          return (
            new Date(currentVersionR2.startDate) -
            new Date(currentVersionR1.startDate)
          );
        });
        break;
      case "requestDate":
        filteredRequests.sort((r1, r2) => {
          const currentVersionR1 = r1.versions.find(v => v.isCurrentVersion);
          const currentVersionR2 = r2.versions.find(v => v.isCurrentVersion);
          return (
            new Date(currentVersionR2.requestDate) -
            new Date(currentVersionR1.requestDate)
          );
        });
        break;
      default:
    }

    return filteredRequests;
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
    const { filters, requests } = this.state;
    const { filterUserOptions, filterConsultantOptions } = this.data;

    return (
      <FiltersContainer>
        <FilterContainer>
          <SelectField
            label="Status"
            clearable={false}
            options={statusOptions}
            onValueChange={async value => {
              await this.setState({ requests: [] });
              await this.setFilterValue("status", value);
              this.fetchRequests();
            }}
            value={filters.status}
          />
        </FilterContainer>
        {filterUserOptions.length > 1 && requests.length > 1 && (
          <FilterContainer>
            <SelectField
              label="Requested By"
              options={this.data.filterUserOptions}
              onValueChange={value =>
                this.setFilterValue("requestedBy_id", value)
              }
              value={filters.requestedBy_id}
            />
          </FilterContainer>
        )}
        {filterConsultantOptions.length > 1 && requests.length > 1 && (
          <FilterContainer>
            <SelectField
              label="Requested For"
              options={this.data.filterConsultantOptions}
              onValueChange={value =>
                this.setFilterValue("consultant_id", value)
              }
              value={filters.consultant_id}
            />
          </FilterContainer>
        )}
        {requests.length > 1 && (
          <FilterContainer>
            <SelectField
              label="Sort By"
              clearable={false}
              options={[
                {
                  label: "Start Date",
                  value: "startDate"
                },
                {
                  label: "Request Date",
                  value: "requestDate"
                }
              ]}
              onValueChange={value => this.setFilterValue("sortBy", value)}
              value={filters.sortBy}
            />
          </FilterContainer>
        )}
      </FiltersContainer>
    );
  };

  renderRow = ({ item, index }) => {
    const currentVersion = item.versions.find(v => v.isCurrentVersion);
    const canCancel =
      currentVersion.requestedBy_id === this.props.$global.currentUser.id;

    return (
      <RequestRow
        key={index}
        request={item}
        chat={this.props.$chat}
        canCancel={canCancel}
        canManageResourceRequests={this.state.canManageResourceRequests}
        showMenuButton={this.state.filters.status === "1"}
        handleSetRequestStatus={status =>
          this.handleSetRequestStatus(status, item.id)
        }
        showRosterForm={({
          title,
          step = 1,
          afterSubmit,
          preventDefaultSubmit
        }) =>
          this.setState({
            rosterForm: {
              show: true,
              request: item,
              title,
              step,
              afterSubmit,
              preventDefaultSubmit
            }
          })
        }
      />
    );
  };

  renderRosterForm = () => {
    const {
      show,
      title,
      request,
      step,
      afterSubmit,
      preventDefaultSubmit
    } = this.state.rosterForm;
    if (!(show && this.data.consultantOptions.length)) return null;

    const initialValues = request
      ? request.versions[request.versions.length - 1]
      : {};

    let consultant;
    if (initialValues.consultant_id) {
      consultant = this.data.consultantMap.get(initialValues.consultant_id);
    }

    return (
      <RosterEntryForm
        $models={this.props.$models}
        currentUser={this.props.$global.currentUser}
        title={title}
        onClose={() => this.setState({ rosterForm: { show: false } })}
        consultant={consultant}
        consultantOptions={this.data.consultantOptions}
        projectOptions={this.data.projectOptions}
        probabilityOptions={this.data.probabilityOptions}
        leaveProjectIds={this.data.leaveProjects.map(p => p.id)}
        onSubmit={this.handleSubmitRosterForm}
        afterSubmit={afterSubmit}
        initialValues={initialValues}
        step={step}
        preventDefaultSubmit={preventDefaultSubmit}
      />
    );
  };

  render() {
    const filteredRequests = this.getFilteredRequests();

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
                title: "New Request",
                preventDefaultSubmit: true
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
  flex-wrap: wrap;
  margin-top: 8px;
  margin-bottom: -24px;
`;

const FilterContainer = styled(View)`
  width: 250px;
  margin-right: 32px;
`;
