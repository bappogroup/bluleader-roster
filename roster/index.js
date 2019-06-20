import React from "react";
import moment from "moment";
import {
  styled,
  ActivityIndicator,
  View,
  Text,
  TouchableView,
  Button,
  Overlay,
  Dropdown,
  SelectField,
  Separator
} from "bappo-components";
import { AutoSizer, MultiGrid } from "react-virtualized";
import { setUserPreferences, getUserPreferences } from "user-preferences";
import {
  dateFormat,
  datesToArray,
  projectAssignmentsToOptions
} from "roster-utils";
import SingleRoster from "single-roster";
import RosterEntryForm from "roster-entry-form";
import JsonToHtml from "json-to-html";
import MassUpdateModal from "./MassUpdateModal";
import FiltersModal from "./FiltersModal";

const sortModeOptions = [
  {
    label: "Name",
    value: "name"
  },
  {
    label: "Consultant Type",
    value: "consultantType"
  }
];

class Roster extends React.Component {
  // Dimensions
  CELL_DIMENSION = 60;
  CELL_DIMENSION_LARGE = 120;
  CONSULTANT_CELL_WIDTH = 160;

  data = {
    commonProjects: [], // Superset of leave projects
    leaveProjects: [],
    probabilityOptions: [],
    probabilityMap: {} // id-to-object map
  };

  constructor(props) {
    super(props);

    this.state = {
      isLoadingRows: false,
      allRowsLoaded: false,

      singleConsultantPopup: {
        show: false
      },

      costCenter: null,

      filters: {
        filterBy: "none",
        costCenter_id: null,
        costCenter_ids: [], // an array of ids if filterBy === 'multipleCostCenters'
        includeCrossTeamConsultants: false,
        project_id: null,
        project_ids: [], // an array of ids if filterBy === 'multipleProjects'
        state: null,
        weeks: "12",
        startDate: moment().startOf("week"),
        endDate: moment()
          .startOf("week")
          .add(12, "weeks"),
        consultantType: null
      },
      filterProject: null,

      sortMode: "name", // Sort consultants by name or consultantType

      displayMode: "small",
      initializing: true,

      dateRow: [],
      consultantIdToEntriesMap: {},

      consultants: [],
      projectAssignments: [],
      consultantOffset: 0,
      entryForm: {
        show: false,
        projectOptions: [],
        title: ""
      },

      showMassUpdateModal: false,
      showFiltersModal: false,
      showShareModal: false
    };
  }

  async componentDidMount() {
    // Load user preferences
    const prefs = await getUserPreferences(
      this.props.$global.currentUser.id,
      this.props.$models
    );
    let {
      filterBy,
      costCenter_id,
      costCenter_ids,
      includeCrossTeamConsultants,
      project_id,
      project_ids,
      state
    } = prefs;
    includeCrossTeamConsultants =
      filterBy === "costCenter" &&
      costCenter_id &&
      includeCrossTeamConsultants === "true";

    const filters = {
      ...this.state.filters,
      filterBy: filterBy || "none",
      costCenter_id: filterBy === "costCenter" ? costCenter_id : null,
      costCenter_ids:
        filterBy === "multipleCostCenters" && costCenter_ids
          ? costCenter_ids.split(" ")
          : [],
      includeCrossTeamConsultants,
      state,
      project_id: filterBy === "project" ? project_id : null,
      project_ids:
        filterBy === "multipleProjects" && project_ids
          ? project_ids.split(" ")
          : []
    };
    await this.setState({ filters });
    this.initialize();
  }

  // how many consultants's roster entries should be fetched in each call?
  getConsultantQuantityPerFetch = () => {
    switch (this.state.filters.weeks) {
      case "52":
        return 25;
      case "6":
      case "12":
      case "24":
      default:
        return 50;
    }
  };

  refresh = () => this.initialize();

  // Initialize by fetching data
  // Queries are generated from this.state.filters
  initialize = async () => {
    const { filters, initializing } = this.state;
    const {
      filterBy,
      costCenter_id,
      costCenter_ids,
      includeCrossTeamConsultants,
      project_id,
      project_ids,
      startDate,
      endDate,
      state,
      consultantType
    } = filters;
    const { $models } = this.props;

    if (!initializing) await this.setState({ initializing: true });

    // Get date row as the first row of the table
    const dateRow = datesToArray(startDate, endDate).map((date, index) => {
      let labelFormat = "DD";
      if (date.day() === 1 || index === 0) labelFormat = "MMM DD";

      return {
        formattedDate: date.format(labelFormat),
        weekday: date.format("ddd"),
        isWeekend: date.day() === 6 || date.day() === 0,
        date
      };
    });
    dateRow.unshift("");

    // Fetch Projects and Probabilities (and Cost Center if specified)
    const promises = [
      $models.Project.findAll({
        where: {
          projectType: {
            $in: ["4", "5", "6", "7"]
          },
          active: true
        }
      }),
      $models.Probability.findAll({})
    ];

    // Fetch data based on filterBy type
    const consultantQuery = {
      active: true,
      endDate: {
        // endDate should be null or later than roster start date
        $or: [{ $eq: null }, { $gte: moment(startDate).format(dateFormat) }]
      }
    };
    if (state) consultantQuery.state = state;
    if (consultantType) consultantQuery.consultantType = consultantType;

    switch (filterBy) {
      // Filter by project
      case "project":
      case "multipleProjects": {
        $models.Project.findById(filters.project_id).then(filterProject =>
          this.setState({ filterProject })
        );

        const fetchConsultantsInProject = async project_id => {
          const projectIdQuery =
            filterBy === "project"
              ? project_id
              : {
                  $in: project_ids
                };
          const assignments = await $models.ProjectAssignment.findAll({
            where: {
              project_id: projectIdQuery
            },
            include: [{ as: "consultant" }]
          });
          const consultants = assignments
            .map(a => a.consultant)
            .filter(consultant => {
              if (!consultant.active) return false;
              if (
                consultant.endDate &&
                moment(consultant.endDate).isSameOrBefore(startDate)
              )
                return false;
              if (state && consultant.state !== state) return false;
              if (
                consultantType &&
                consultant.consultantType !== consultantType
              )
                return false;
              return true;
            });
          return consultants;
        };
        promises.push(fetchConsultantsInProject(project_id));
        break;
      }
      // Filter by cost center
      // Or none - show all consultants. Equivalent to all cost centers
      case "none":
      case "multipleCostCenters": {
        if (costCenter_ids && costCenter_ids.length > 0)
          consultantQuery.costCenter_id = {
            $in: costCenter_ids
          };
        promises.push(
          $models.Consultant.findAll({
            where: consultantQuery
          })
        );
        break;
      }
      case "costCenter": {
        if (costCenter_id) consultantQuery.costCenter_id = costCenter_id;

        promises.push(
          $models.Consultant.findAll({
            where: consultantQuery
          })
        );

        if (costCenter_id) {
          promises.push(
            $models.CostCenter.findById(costCenter_id, {
              include: [{ as: "profitCentre" }]
            })
          );
        }
        break;
      }
      default: {
        break;
      }
    }

    let [
      commonProjects,
      probabilities,
      consultants,
      costCenter
    ] = await Promise.all(promises);

    // Get Probability options
    this.data.probabilityOptions = probabilities.reverse().map((p, index) => ({
      value: p.id,
      label: p.name,
      pos: index
    }));
    const probabilityMap = {};
    probabilities.forEach(pro => (probabilityMap[pro.id] = pro));
    this.data.probabilityMap = probabilityMap;

    // If "cross team" and a cost center is selected - extend external consultants to the list
    if (includeCrossTeamConsultants && costCenter) {
      const projects = await $models.Project.findAll({
        where: { profitCentre_id: costCenter.profitCentre_id, active: true }
      });
      const projectIds = projects.map(p => p.id);
      const projectAssignments = await $models.ProjectAssignment.findAll({
        where: {
          project_id: { $in: projectIds }
        },
        include: [{ as: "consultant" }]
      });
      const otherConsultants = projectAssignments.map(pa => pa.consultant);

      const consultantMap = {};
      consultants.forEach(c => (consultantMap[c.id] = c));
      otherConsultants.forEach(c => {
        if (!consultantMap[c.id]) consultantMap[c.id] = c;
      });
      consultants = Object.values(consultantMap);

      if (consultantType)
        consultants = consultants.filter(
          consultant => consultant.consultantType === consultantType
        );
    }

    // Sort consultants (defaults to by name) after initial fetch
    const sortedConsultants = this.getSortedConsultants(consultants);

    this.setState(
      {
        dateRow,
        costCenter,
        consultants: sortedConsultants,
        consultantIdToEntriesMap: {},
        consultantOffset: 0
      },
      () => this.loadData()
    );

    // Save common & leave projects in this.data
    const leaveProjects = commonProjects.filter(p =>
      ["4", "5", "6"].includes(p.projectType)
    );
    this.data.commonProjects = commonProjects;
    this.data.leaveProjects = leaveProjects;
  };

  // Fetch data for the next batch of consultants
  // Recursive calling self but no concurrent loads
  loadData = async () => {
    const {
      isLoadingRows,
      filters,
      consultants,
      consultantOffset,
      projectAssignments,
      consultantIdToEntriesMap
    } = this.state;
    const { startDate, endDate } = filters;
    const { RosterEntry, ProjectAssignment } = this.props.$models;
    const updatedEntryMap = { ...consultantIdToEntriesMap };

    if (isLoadingRows) return;

    await this.setState({ isLoadingRows: true });

    const consultantQuantity = this.getConsultantQuantityPerFetch();
    const newConsultantOffset = consultantOffset + consultantQuantity;
    // Get new consultants and filter already fetched consultants
    const newConsultants = consultants
      .slice(consultantOffset, newConsultantOffset)
      .filter(consultant => !consultantIdToEntriesMap[consultant.id]);
    const newConsultantIds = newConsultants.map(c => c.id);

    const promises = [];

    // Fetch Project Assignments
    promises.push(
      ProjectAssignment.findAll({
        where: {
          consultant_id: {
            $in: newConsultantIds
          }
        },
        include: [{ as: "project" }]
      })
    );

    // Fetch roster entries
    promises.push(
      RosterEntry.findAll({
        where: {
          date: {
            $between: [
              moment(startDate).format(dateFormat),
              moment(endDate).format(dateFormat)
            ]
          },
          consultant_id: {
            $in: newConsultantIds
          }
        }
      })
    );

    const [allProjectAssignments, _rosterEntries] = await Promise.all(promises);

    // create lookup object for projects
    const projects = {};
    for (const pa of allProjectAssignments) {
      if (pa.project && !projects[pa.project_id]) {
        projects[pa.project_id] = pa.project;
      }
    }
    this.data.commonProjects.forEach(pj => (projects[pj.id] = pj));

    // attach projects to roster entries
    const rosterEntries = _rosterEntries.map(re => {
      re.project = projects[re.project_id];
      return re;
    });

    // Put fetched roster entries into updatedEntryMap
    newConsultants.forEach(consultant => (updatedEntryMap[consultant.id] = []));
    rosterEntries.forEach(entry => {
      // populate probability
      const populatedEntry = {
        ...entry,
        probability: this.data.probabilityMap[entry.probability_id]
      };

      const entryIndex = moment(entry.date).diff(startDate, "days");
      updatedEntryMap[entry.consultant_id][entryIndex] = populatedEntry;
    });

    const newProjectAssignments = allProjectAssignments.filter(
      pa => pa.project && pa.project._deletedAt === null
    );

    this.setState(
      {
        isLoadingRows: false,
        initializing: false,
        consultantIdToEntriesMap: updatedEntryMap,
        projectAssignments: projectAssignments.concat(newProjectAssignments),
        consultantOffset: newConsultantOffset
      },
      () => {
        // Fetch data of next batch of consultants if needed
        this.gridRef.recomputeGridSize();

        // Keep fetching all data
        const { consultantOffset, consultants } = this.state;
        if (consultantOffset < consultants.length) this.loadData();
        else this.setState({ allRowsLoaded: true });
      }
    );
  };

  /**
   * Sort consultants based on this.state.sortMode
   */
  getSortedConsultants = consultants => {
    const sortedConsultants = consultants.slice();

    switch (this.state.sortMode) {
      case "consultantType": {
        sortedConsultants.sort((a, b) => a.consultantType - b.consultantType);
        break;
      }
      case "name":
      default: {
        sortedConsultants.sort((a, b) => {
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
          return 0;
        });
      }
    }

    return sortedConsultants;
  };

  handleSortModeChange = async sortMode => {
    await this.setState({ sortMode });
    const consultants = this.getSortedConsultants(this.state.consultants);
    this.setState({ consultants });
    this.gridRef.recomputeGridSize();
  };

  getConsultantAssignments = consultantId => {
    const hisProjectAssignments = this.state.projectAssignments.filter(
      pa => pa.consultant_id === consultantId
    );

    return projectAssignmentsToOptions(
      hisProjectAssignments,
      this.data.commonProjects
    );
  };

  setDisplayMode = displayMode =>
    this.setState({ displayMode }, () => this.gridRef.recomputeGridSize());

  cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
    const { dateRow, consultants, consultantIdToEntriesMap } = this.state;

    const consultant = consultants[rowIndex - 1];
    const date = dateRow[columnIndex];
    let backgroundColor = "#f8f8f8"; // Defaults to gray for weekdays
    let label = "";

    if (rowIndex === 0) {
      // Render date label cell

      let color = "black";
      if (date.isWeekend) color = "lightgrey";
      return (
        <Label key={key} style={style} color={color}>
          <div>{date.weekday}</div>
          <div>{date.formattedDate}</div>
        </Label>
      );
    } else if (columnIndex === 0) {
      // Change background color to white if external consultant
      backgroundColor = "#fafafa";
      if (
        this.state.costCenter &&
        consultant.costCenter_id !== this.state.costCenter.id
      )
        backgroundColor = "white";

      return (
        <ClickLabel
          key={key}
          style={{
            ...style,
            alignItems: "flex-start",
            marginLeft: 16
          }}
          backgroundColor={backgroundColor}
          onClick={() => this.handleClickConsultant(consultant)}
        >
          {consultant.name}
        </ClickLabel>
      );
    }

    // Render roster entry cell
    const entries = consultantIdToEntriesMap[consultant.id];
    const entry = entries && entries[columnIndex - 1];

    if (entry) {
      backgroundColor = this.getBackgroundColorByEntry(entry);

      label = this.getProjectLabelByEntry(entry);
    }

    // Apply weekend cell style
    if (date.isWeekend) backgroundColor = "white";

    return (
      <Cell
        key={key}
        style={style}
        backgroundColor={backgroundColor}
        onPress={() => this.openEntryForm(rowIndex, columnIndex, entry)}
      >
        <CenteredText>{label}</CenteredText>
      </Cell>
    );
  };

  getProjectLabelByEntry = entry => {
    let label = "";
    if (entry.project) {
      label =
        this.state.displayMode === "large"
          ? entry.project.name
          : entry.project.key || entry.project.name;
    }
    // If a project is deleted, entry.project is null
    if (this.state.displayMode === "small" && label.length > 0)
      label = label.slice(0, 7);
    return label;
  };

  getBackgroundColorByEntry = entry => {
    const backgroundColor =
      (entry.project && entry.project.backgroundColour) ||
      (entry.probability && entry.probability.backgroundColor);
    return backgroundColor;
  };

  handleClickConsultant = consultant => {
    this.setState({
      singleConsultantPopup: {
        show: true,
        consultant
      }
    });
  };

  openEntryForm = async (rowIndex, columnIndex, entry) => {
    const { consultants, consultantIdToEntriesMap, dateRow } = this.state;
    const consultant = consultants[rowIndex - 1];
    const date = dateRow[columnIndex].date.format(dateFormat);
    const projectOptions = this.getConsultantAssignments(consultant.id);

    // All roster entries of this consultant
    const rosterEntries = consultantIdToEntriesMap[consultant.id];
    const dateToExistingEntryMap = new Map();
    rosterEntries.forEach(entry => {
      if (entry && entry.date) {
        dateToExistingEntryMap.set(entry.date, entry);
      }
    });

    this.setState({
      entryForm: {
        show: true,
        title: `${consultant.name}'s Rosters`,
        projectOptions,
        initialValues: {
          ...entry,
          startDate: date,
          endDate: date
        },
        consultant,
        dateToExistingEntryMap
      }
    });
  };

  reloadConsultantData = async consultant_id => {
    const { filters, consultants, consultantIdToEntriesMap } = this.state;
    const { startDate, endDate } = filters;

    const rosterEntries = await this.props.$models.RosterEntry.findAll({
      where: {
        date: {
          $between: [
            moment(startDate).format(dateFormat),
            moment(endDate).format(dateFormat)
          ]
        },
        consultant_id
      },
      include: [{ as: "project" }, { as: "probability" }]
    });

    // Put roster entries in updatedEntryMap
    const updatedEntryMap = { ...consultantIdToEntriesMap };
    updatedEntryMap[consultant_id] = [];
    rosterEntries.forEach(entry => {
      const entryIndex = moment(entry.date).diff(startDate, "days");
      updatedEntryMap[consultant_id][entryIndex] = entry;
    });

    // Reload the row in the table
    const rowIndex = consultants.findIndex(c => c.id === consultant_id) + 1;

    this.setState(
      { consultantIdToEntriesMap: updatedEntryMap, initializing: false },
      () => this.gridRef.recomputeGridSize({ rowIndex })
    );
  };

  columnWidthGetter = ({ index }) => {
    const columnWidth =
      this.state.displayMode === "small"
        ? this.CELL_DIMENSION
        : this.CELL_DIMENSION_LARGE;
    return index === 0 ? this.CONSULTANT_CELL_WIDTH : columnWidth;
  };

  closeEntryForm = () =>
    this.setState(({ entryForm }) => ({
      entryForm: {
        ...entryForm,
        show: false
      }
    }));

  renderSingleRoster = () => {
    const { show, consultant } = this.state.singleConsultantPopup;
    if (!show) return null;

    return (
      <Overlay
        visible
        showCloseButton
        closeButtonStyle={{ color: "black" }}
        onClose={() =>
          this.setState({ singleConsultantPopup: { show: false } })
        }
      >
        <SingleRoster
          {...this.props}
          consultant={consultant}
          projectOptions={this.getConsultantAssignments(consultant.id)}
          onUpdate={() => this.reloadConsultantData(consultant.id)}
        />
      </Overlay>
    );
  };

  renderMassUpdateModal = () => (
    <MassUpdateModal
      $models={this.props.$models}
      $global={this.props.$global}
      onClose={() => this.setState({ showMassUpdateModal: false })}
      afterSubmit={this.refresh}
      preloadedData={{
        projects: this.data.commonProjects,
        probabilityOptions: this.data.probabilityOptions
      }}
    />
  );

  /**
   * Prepare data to share as HTML
   */
  prepareDataToShare = () => {
    const {
      dateRow,
      consultantIdToEntriesMap,
      consultants,
      sortMode
    } = this.state;

    const header = [
      {
        text: ""
      }
    ];
    dateRow.forEach(({ date, isWeekend }) => {
      if (!date) return;

      const formattedDate = date.format("MMM D");
      header.push({
        text: formattedDate,
        color: isWeekend ? "lightgrey" : "black"
      });
    });

    const rows = [];

    Object.entries(consultantIdToEntriesMap).forEach(
      ([consultantId, entryArr]) => {
        // entryArr is roster entries row for one consultant
        const consultant = consultants.find(c => c.id === consultantId);
        const row = {
          consultant: consultant, // temp property for sorting
          "": {
            text: consultant.name
          }
        };
        entryArr.forEach(rosterEntry => {
          const formattedDate = moment(rosterEntry.date).format("MMM D");
          const projectLabel = this.getProjectLabelByEntry(rosterEntry);
          const backgroundColor = this.getBackgroundColorByEntry(rosterEntry);
          row[formattedDate] = {
            text: projectLabel,
            backgroundColor
          };
        });
        rows.push(row);
      }
    );

    // Sort rows according to current sortMode
    switch (sortMode) {
      case "consultantType": {
        rows.sort(
          (a, b) => a.consultant.consultantType - b.consultant.consultantType
        );
        break;
      }
      case "name":
      default: {
        rows.sort((a, b) => {
          if (a.consultant.name < b.consultant.name) return -1;
          if (a.consultant.name > b.consultant.name) return 1;
          return 0;
        });
      }
    }

    rows.forEach(row => delete row.consultant);

    return {
      header,
      rows
    };
  };

  renderShareModal = () => {
    const { header, rows } = this.prepareDataToShare();
    return (
      <JsonToHtml
        onRequestClose={() => this.setState({ showShareModal: false })}
        header={header}
        rows={rows}
        isLoading={!this.state.allRowsLoaded}
      />
    );
  };

  handleSetFilters = async ({
    filterBy,
    costCenter_id,
    costCenter_ids,
    includeCrossTeamConsultants,
    project_id,
    project_ids,
    startDate,
    weeks,
    state,
    consultantType
  }) => {
    const endDate = moment(startDate).add(weeks, "weeks");
    const costCenterIdStr = costCenter_ids && costCenter_ids.join(" ");
    const projectIdStr = project_ids && project_ids.join(" ");
    await this.setState({
      filters: {
        filterBy,
        costCenter_id,
        costCenter_ids,
        includeCrossTeamConsultants,
        project_id,
        project_ids,
        startDate,
        weeks,
        endDate,
        state,
        consultantType
      },
      projectAssignments: [],
      showFiltersModal: false,
      isLoadingRows: false
    });

    this.initialize();

    setUserPreferences(this.props.$global.currentUser.id, this.props.$models, {
      filterBy,
      costCenter_id,
      costCenter_ids: costCenterIdStr,
      includeCrossTeamConsultants,
      project_id,
      project_ids: projectIdStr,
      state
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
      const newAssignment = await $models.ProjectAssignment.create(assignment);
      const project = await $models.Project.findById(assignment.project_id);
      newAssignment.project = project;
      // Append to state
      this.setState(({ projectAssignments }) => ({
        projectAssignments: [...projectAssignments, newAssignment]
      }));
    }
  };

  renderFiltersModal = () => (
    <FiltersModal
      $models={this.props.$models}
      $global={this.props.$global}
      onClose={() => this.setState({ showFiltersModal: false })}
      onSubmit={this.handleSetFilters}
      initialValues={this.state.filters}
    />
  );

  renderHeading = () => {
    const { filters, costCenter, filterProject, isLoadingRows } = this.state;
    let title = "";

    switch (filters.filterBy) {
      case "costCenter":
        title = `Roster for Cost Center: ${(costCenter && costCenter.name) ||
          "all"}`;
        break;
      case "project":
        title = `Roster for Project: ${
          filterProject ? filterProject.name : ""
        }`;
        break;
      case "none":
        title = "Roster for All Consultants";
        break;
      case "multipleCostCenters":
        title = "Roster for multiple Cost Centers";
        break;
      case "multipleProjects":
        title = "Roster for multiple projects";
        break;
      default:
        title = "Roster";
    }

    return (
      <HeadingContainer>
        <Heading>{title}</Heading>
        {isLoadingRows && <ActivityIndicator style={{ marginLeft: 16 }} />}
      </HeadingContainer>
    );
  };

  render() {
    const {
      initializing,
      dateRow,
      consultants,
      entryForm,
      sortMode
    } = this.state;

    if (initializing) {
      return <ActivityIndicator style={{ flex: 1 }} />;
    }

    return (
      <Container>
        {this.renderHeading()}
        <StyledSeparator />
        <MenuContainer>
          <Button
            icon="filter-list"
            text="Filters"
            onPress={() => this.setState({ showFiltersModal: true })}
            type="secondary"
            style={{ height: 40 }}
          />
          <SelectFieldContainer>
            <SelectField
              label="Sort By"
              clearable={false}
              options={sortModeOptions}
              value={sortMode}
              onValueChange={this.handleSortModeChange}
              reserveErrorSpace={false}
            />
          </SelectFieldContainer>
          <Dropdown
            actions={[
              {
                icon: "refresh",
                label: "Refresh",
                onPress: this.refresh
              },
              {
                icon: "share",
                label: "Share as HTML",
                onPress: () => this.setState({ showShareModal: true })
              },
              {
                icon: "assignment-ind",
                label: "Assign a Project to a Consultant",
                onPress: () =>
                  this.props.$popup.form({
                    title: "New Assignment",
                    formKey: "ProjectAssignmentForm",
                    onSubmit: this.handleCreateAssignment
                  })
              },
              {
                icon: "filter-9-plus",
                label: "Mass Update",
                onPress: () => this.setState({ showMassUpdateModal: true })
              },
              {
                icon: "zoom-in",
                label: "Cell Size: Large",
                onPress: () => this.setDisplayMode("large")
              },
              {
                icon: "zoom-out",
                label: "Cell Size: Small",
                onPress: () => this.setDisplayMode("small")
              }
            ]}
            icon="menu"
          />
        </MenuContainer>
        <BodyContainer>
          <AutoSizer>
            {({ height, width }) => (
              <MultiGrid
                width={width}
                height={height}
                fixedColumnCount={1}
                fixedRowCount={1}
                cellRenderer={this.cellRenderer}
                columnCount={dateRow.length}
                columnWidth={this.columnWidthGetter}
                rowCount={consultants.length + 1}
                rowHeight={this.CELL_DIMENSION}
                ref={ref => (this.gridRef = ref)}
              />
            )}
          </AutoSizer>
        </BodyContainer>
        {this.renderSingleRoster()}
        {entryForm.show && (
          <RosterEntryForm
            $models={this.props.$models}
            currentUser={this.props.$global.currentUser}
            title={entryForm.title}
            onClose={this.closeEntryForm}
            consultant={entryForm.consultant}
            projectOptions={entryForm.projectOptions}
            probabilityOptions={this.data.probabilityOptions}
            dateToExistingEntryMap={entryForm.dateToExistingEntryMap}
            leaveProjectIds={this.data.leaveProjects.map(p => p.id)}
            afterSubmit={async () => {
              await this.reloadConsultantData(entryForm.consultant.id);
              this.closeEntryForm();
            }}
            initialValues={entryForm.initialValues}
          />
        )}
        {this.state.showMassUpdateModal && this.renderMassUpdateModal()}
        {this.state.showFiltersModal && this.renderFiltersModal()}
        {this.state.showShareModal && this.renderShareModal()}
      </Container>
    );
  }
}

export default Roster;

const Container = styled(View)`
  flex: 1;
  background-color: #fafafa;
  flex-direction: column;
`;

const HeadingContainer = styled(View)`
  margin-top: 16px;
  margin-bottom: 16px;
  padding-left: 32px;
  padding-right: 32px;
  flex-direction: row;
  align-items: center;
`;

const StyledSeparator = styled(Separator)`
  margin: 0 32px;
`;

const Heading = styled(Text)`
  font-size: 18px;
`;

const MenuContainer = styled(View)`
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  margin-left: 32px;
`;

const SelectFieldContainer = styled(View)`
  width: 200px;
  margin-left: 16px;
  margin-bottom: 20px;
  margin-right: 8px;
`;

const BodyContainer = styled.div`
  flex: 1;
  margin-right: 15px;
  margin-bottom: 15px;
`;

const baseStyle = `
  margin-left: 2px;
  margin-right: 2px;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  font-size: 12px;
`;

const Label = styled.div`
  ${baseStyle};
  display: flex;
  flex-direction: column;
  color: ${props => props.color || "black"};
`;

const ClickLabel = styled(Label)`
  &:hover {
    cursor: pointer;
    opacity: 0.7;
  }
  background-color: ${props => props.backgroundColor};
`;

const Cell = styled(TouchableView)`
  ${baseStyle} background-color: ${props => props.backgroundColor};

  border: 1px solid #eee;

  ${props => (props.blur ? "filter: blur(3px); opacity: 0.5;" : "")};
`;

const CenteredText = styled(Text)`
  text-align: center;
`;
