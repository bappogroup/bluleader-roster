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
import MassUpdateModal from "./MassUpdateModal";
import FiltersModal from "./FiltersModal";

const CONSULTANT_QUANTITY_IN_EACH_LOAD = 1;

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
  CELL_DIMENSION = 45;
  CELL_DIMENSION_LARGE = 120;
  CONSULTANT_CELL_WIDTH = 160;

  highestRowIndex = 0;
  isLoading = false;

  data = {
    commonProjects: [], // Superset of leave projects
    leaveProjects: [],
    probabilityOptions: []
  };

  constructor(props) {
    super(props);

    this.state = {
      singleConsultantPopup: {
        show: false
      },

      costCenter: null,

      filters: {
        costCenter_id: null,
        state: null,
        weeks: "12",
        startDate: moment().startOf("week"),
        endDate: moment()
          .startOf("week")
          .add(12, "weeks"),
        includeCrossTeamConsultants: false,
        consultantType: null
      },

      sortMode: "name", // Sort consultants by name or consultantType

      mode: "small",
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
      showFiltersModal: false
    };
  }

  async componentDidMount() {
    // Load user preferences
    const prefs = await getUserPreferences(
      this.props.$global.currentUser.id,
      this.props.$models
    );
    let { costCenter_id, includeCrossTeamConsultants, state } = prefs;
    includeCrossTeamConsultants = includeCrossTeamConsultants === "true";
    await this.setState({
      filters: {
        ...this.state.filters,
        costCenter_id,
        includeCrossTeamConsultants,
        state
      }
    });
    this.initialize();
  }

  refresh = () => this.initialize();

  // Initialize by fetching data
  // Queries are generated from this.state.filters
  initialize = async () => {
    const { filters, initializing } = this.state;
    const {
      costCenter_id,
      startDate,
      endDate,
      includeCrossTeamConsultants,
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

    // Fetch consultants, Projects and Probabilities (and Cost Center if specified)
    const consultantQuery = {
      active: true,
      endDate: {
        // endDate should be null or later than roster start date
        $or: [{ $eq: null }, { $gte: moment(startDate).format(dateFormat) }]
      }
    };
    if (costCenter_id) consultantQuery.costCenter_id = costCenter_id;
    if (state) consultantQuery.state = state;
    if (consultantType) consultantQuery.consultantType = consultantType;

    const promises = [
      $models.Consultant.findAll({
        where: consultantQuery
      }),
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

    if (costCenter_id)
      promises.push(
        $models.CostCenter.findById(costCenter_id, {
          include: [{ as: "profitCentre" }]
        })
      );

    let [
      consultants,
      commonProjects,
      probabilities,
      costCenter
    ] = await Promise.all(promises);

    // Get Probability options
    this.data.probabilityOptions = probabilities.reverse().map((p, index) => ({
      value: p.id,
      label: p.name,
      pos: index
    }));

    // If cross team is selected - extend external consultants to the list
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
      const otherConsultants = projectAssignments
        .map(pa => pa.consultant)
        .filter(consultant => consultant.consultantType === consultantType);
      const consultantMap = {};
      consultants.forEach(c => (consultantMap[c.id] = c));
      otherConsultants.forEach(c => {
        if (!consultantMap[c.id]) consultantMap[c.id] = c;
      });
      consultants = Object.values(consultantMap);
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
      filters,
      consultants,
      consultantOffset,
      projectAssignments,
      consultantIdToEntriesMap
    } = this.state;
    const { startDate, endDate } = filters;
    const { RosterEntry, ProjectAssignment } = this.props.$models;
    const updatedEntryMap = { ...consultantIdToEntriesMap };

    if (this.isLoading) return;
    this.isLoading = true;

    const newConsultantOffset =
      consultantOffset + CONSULTANT_QUANTITY_IN_EACH_LOAD;
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
        },
        include: [{ as: "project" }, { as: "probability" }]
      })
    );

    const [allProjectAssignments, rosterEntries] = await Promise.all(promises);

    // Put fetched roster entries into updatedEntryMap
    newConsultants.forEach(consultant => (updatedEntryMap[consultant.id] = []));
    rosterEntries.forEach(entry => {
      const entryIndex = moment(entry.date).diff(startDate, "days");
      updatedEntryMap[entry.consultant_id][entryIndex] = entry;
    });

    const newProjectAssignments = allProjectAssignments.filter(
      pa => pa.project && pa.project._deletedAt === null
    );

    this.setState(
      {
        initializing: false,
        consultantIdToEntriesMap: updatedEntryMap,
        projectAssignments: projectAssignments.concat(newProjectAssignments),
        consultantOffset: newConsultantOffset
      },
      () => {
        // Fetch data of next batch of consultants if needed
        this.isLoading = false;

        this.gridRef.recomputeGridSize();
        if (newConsultantOffset < this.highestRowIndex) {
          this.loadData();
        }
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

  setDisplayMode = mode =>
    this.setState({ mode }, () => this.gridRef.recomputeGridSize());

  cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
    const { dateRow, consultants, consultantIdToEntriesMap, mode } = this.state;

    if (rowIndex > this.highestRowIndex) {
      this.highestRowIndex = rowIndex;
    }

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
          style={style}
          backgroundColor={backgroundColor}
          onClick={() => this.handleClickConsultant(consultant)}
        >
          {consultant.name}
        </ClickLabel>
      );
    }

    // Render roster entry cell
    const entries = consultantIdToEntriesMap[consultant.id];
    if (!entries) {
      this.loadData();
    }

    const entry = entries && entries[columnIndex - 1];

    if (entry) {
      backgroundColor =
        (entry.project && entry.project.backgroundColour) ||
        (entry.probability && entry.probability.backgroundColor) ||
        "white";

      if (entry.project) {
        label =
          mode === "large"
            ? entry.project.name
            : entry.project.key || entry.project.name;
      }
      // If a project is deleted, entry.project is null
      if (mode === "small" && label.length > 0) label = label.slice(0, 6);
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
        {label}
      </Cell>
    );
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
      this.state.mode === "small"
        ? this.CELL_DIMENSION
        : this.CELL_DIMENSION_LARGE;
    return index === 0 ? 160 : columnWidth;
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

  handleSetFilters = async ({
    costCenter_id,
    startDate,
    weeks,
    includeCrossTeamConsultants,
    state,
    consultantType
  }) => {
    const endDate = moment(startDate).add(weeks, "weeks");
    await this.setState({
      filters: {
        costCenter_id,
        startDate,
        weeks,
        endDate,
        includeCrossTeamConsultants,
        state,
        consultantType
      },
      projectAssignments: [],
      showFiltersModal: false
    });

    this.highestRowIndex = 0;
    this.isLoading = false;

    this.initialize();

    setUserPreferences(this.props.$global.currentUser.id, this.props.$models, {
      costCenter_id,
      includeCrossTeamConsultants,
      state
    });
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

  render() {
    const {
      initializing,
      dateRow,
      consultants,
      costCenter,
      entryForm,
      sortMode
    } = this.state;

    if (initializing) {
      return <ActivityIndicator style={{ flex: 1 }} />;
    }

    return (
      <Container>
        <HeadingContainer>
          <Heading>
            Roster for Cost center: {(costCenter && costCenter.name) || "all"}
          </Heading>
        </HeadingContainer>
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
  ${baseStyle}
  background-color: ${props => props.backgroundColor};

  border: 1px solid #eee;

  ${props => (props.blur ? "filter: blur(3px); opacity: 0.5;" : "")};
`;
