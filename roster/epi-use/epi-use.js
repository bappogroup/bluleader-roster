import React from "react";
import moment from "moment";
import {
  ActivityIndicator,
  View,
  Text,
  TouchableView,
  styled,
  Button,
  Overlay,
  Dropdown
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

/**
 * Epi-use's Roster
 * Exclusive features:
 * 1. locations
 */

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

      mode: "small",
      initializing: true,

      entryList: [],

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

    // Get date array, to put at first of entryList
    const dateArray = datesToArray(startDate, endDate).map((date, index) => {
      let labelFormat = "DD";
      if (date.day() === 1 || index === 0) labelFormat = "MMM DD";

      return {
        formattedDate: date.format(labelFormat),
        weekday: date.format("ddd"),
        isWeekend: date.day() === 6 || date.day() === 0,
        date
      };
    });
    dateArray.unshift("");

    const consultantQuery = {
      active: true
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

    this.data.probabilityOptions = probabilities.reverse().map((p, index) => ({
      value: p.id,
      label: p.name,
      pos: index
    }));

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
    }

    consultants.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    this.setState(
      {
        entryList: [dateArray],
        costCenter,
        consultants,
        consultantCount: consultants.length,
        consultantOffset: 0
      },
      () => this.loadData()
    );

    const leaveProjects = commonProjects.filter(p =>
      ["4", "5", "6"].includes(p.projectType)
    );
    this.data.commonProjects = commonProjects;
    this.data.leaveProjects = leaveProjects;
  };

  loadData = async () => {
    const {
      filters,
      consultants,
      consultantOffset,
      projectAssignments,
      entryList
    } = this.state;
    const { startDate, endDate } = filters;
    const { RosterEntry, ProjectAssignment } = this.props.$models;

    if (this.isLoading) return;
    this.isLoading = true;

    const newConsultantOffset = consultantOffset + 10;
    const newConsultants = consultants.slice(
      consultantOffset,
      newConsultantOffset
    );

    // Build map between id and consultant
    const consultantMap = {};
    newConsultants.forEach(c => {
      consultantMap[c.id] = c;
    });
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
        include: [{ as: "project" }],
        limit: 1000
      })
    );

    // Fetch roster entries
    promises.push(
      RosterEntry.findAll({
        where: {
          date: {
            $between: [startDate.format(dateFormat), endDate.format(dateFormat)]
          },
          consultant_id: {
            $in: newConsultantIds
          }
        },
        include: [{ as: "project" }, { as: "probability" }],
        limit: 1000
      }).then(rosterEntries => {
        const tempMap = {};
        newConsultantIds.forEach(cid => {
          tempMap[cid] = [];
        });

        rosterEntries.forEach(entry => {
          const entryIndex = moment(entry.date).diff(startDate, "days");
          tempMap[entry.consultant_id][entryIndex] = entry;
        });

        // Insert consultant name at first of roster entry array
        const newEntryList = Object.entries(tempMap).map(([key, value]) => {
          const consultant = consultantMap[key];
          return [consultant].concat(value);
        });

        // Sorting based on consultant name
        newEntryList.sort((a, b) => {
          if (a[0].name < b[0].name) return -1;
          if (a[0].name > b[0].name) return 1;
          return 0;
        });

        return newEntryList;
      })
    );

    const [allProjectAssignments, newEntryList] = await Promise.all(promises);

    const newProjectAssignments = allProjectAssignments.filter(
      pa => pa.project && pa.project._deletedAt === null
    );

    this.setState(
      {
        initializing: false,
        entryList: entryList.concat(newEntryList),
        projectAssignments: projectAssignments.concat(newProjectAssignments),
        consultantOffset: newConsultantOffset
      },
      () => {
        // Fetch data of next 10 consultants if needed
        this.isLoading = false;

        this.gridRef.recomputeGridSize();
        if (newConsultantOffset < this.highestRowIndex) {
          this.loadData();
        }
      }
    );
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
    const { entryList, mode } = this.state;

    if (rowIndex > this.highestRowIndex) {
      this.highestRowIndex = rowIndex;
    }

    if (!entryList[rowIndex]) {
      this.loadData();
    }

    const entry = entryList[rowIndex] && entryList[rowIndex][columnIndex];

    let backgroundColor = "#f8f8f8";
    let label;

    if (rowIndex === 0) {
      // Render date label cell
      let color = "black";
      if (entry.isWeekend) color = "lightgrey";
      return (
        <Label
          key={key}
          style={style}
          backgroundColor={backgroundColor}
          color={color}
        >
          <div>{entry.weekday}</div>
          <div>{entry.formattedDate}</div>
        </Label>
      );
    } else if (columnIndex === 0) {
      // Render consultant label cell
      const consultantName =
        (entry && entry.name) || this.state.consultants[rowIndex - 1].name;

      // Change background color if external consultant
      backgroundColor = "white";
      if (
        this.state.costCenter &&
        entry &&
        entry.costCenter_id !== this.state.costCenter.id
      )
        backgroundColor = "#f8f8f8";

      return (
        <ClickLabel
          key={key}
          style={style}
          backgroundColor={backgroundColor}
          onClick={() => this.handleClickConsultant(entry)}
        >
          {consultantName}
        </ClickLabel>
      );
    }

    // Render roster entry cell
    if (entry) {
      backgroundColor =
        entry.project.backgroundColour ||
        (entry.probability && entry.probability.backgroundColor) ||
        "white";
      label =
        mode === "large"
          ? entry.project.name
          : entry.project.key || entry.project.name;
      if (mode === "small" && label.length > 0) label = label.slice(0, 6);
    }

    // Apply weekend cell style
    const { isWeekend } = this.state.entryList[0][columnIndex];

    return (
      <Cell
        key={key}
        style={style}
        backgroundColor={backgroundColor}
        isWeekend={isWeekend}
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
    const { consultants, entryList } = this.state;
    const consultant = consultants[rowIndex - 1];
    const date = entryList[0][columnIndex].date.format(dateFormat);
    const projectOptions = this.getConsultantAssignments(consultant.id);

    // All roster entries of this consultant
    const rosterEntries = entryList[rowIndex];
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
    const { filters, consultants } = this.state;
    const { startDate, endDate } = filters;

    const rosterEntries = await this.props.$models.RosterEntry.findAll({
      where: {
        date: {
          $between: [startDate.format(dateFormat), endDate.format(dateFormat)]
        },
        consultant_id
      },
      include: [{ as: "project" }, { as: "probability" }],
      limit: 1000
    });

    const rowIndex = consultants.findIndex(c => c.id === consultant_id);
    const consultant = consultants[rowIndex];

    const newEntriesArr = [];
    rosterEntries.forEach(entry => {
      const entryIndex = moment(entry.date).diff(startDate, "days");
      newEntriesArr[entryIndex] = entry;
    });
    newEntriesArr.unshift(consultant);

    this.setState(
      ({ entryList }) => {
        const newEntryList = entryList.slice();
        newEntryList[rowIndex + 1] = newEntriesArr;
        return { entryList: newEntryList, initializing: false };
      },
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
      consultantCount,
      costCenter,
      entryList,
      entryForm
    } = this.state;

    if (initializing) {
      return <ActivityIndicator style={{ flex: 1 }} />;
    }

    return (
      <Container>
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
        <HeaderContainer>
          <HeaderSubContainer>
            <Heading>
              Cost center: {(costCenter && costCenter.name) || "all"}
            </Heading>
            <Button
              icon="filter-list"
              text="Filters"
              onPress={() => this.setState({ showFiltersModal: true })}
              type="secondary"
            />
          </HeaderSubContainer>
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
            icon="more-horiz"
          />
        </HeaderContainer>
        <BodyContainer>
          <AutoSizer>
            {({ height, width }) => (
              <MultiGrid
                width={width}
                height={height}
                fixedColumnCount={1}
                fixedRowCount={1}
                cellRenderer={this.cellRenderer}
                columnCount={entryList[0].length}
                columnWidth={this.columnWidthGetter}
                rowCount={consultantCount + 1}
                rowHeight={this.CELL_DIMENSION}
                ref={ref => (this.gridRef = ref)}
              />
            )}
          </AutoSizer>
        </BodyContainer>
        {this.state.showMassUpdateModal && this.renderMassUpdateModal()}
        {this.state.showFiltersModal && this.renderFiltersModal()}
      </Container>
    );
  }
}

export default Roster;

const Container = styled(View)`
  flex: 1;
  flex-direction: column;
`;

const HeaderContainer = styled(View)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin: 20px;
`;

const HeaderSubContainer = styled(View)`
  flex-direction: row;
  align-items: center;
`;

const Heading = styled(Text)`
  font-size: 18px;
  margin-right: 10px;
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
  ${baseStyle} background-color: ${props =>
  props.isWeekend ? "white" : props.backgroundColor};

  border: 1px solid #eee;

  ${props => (props.blur ? "filter: blur(3px); opacity: 0.5;" : "")};
`;