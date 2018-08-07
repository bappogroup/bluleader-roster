import React from "react";
import moment from "moment";
import {
  ActivityIndicator,
  View,
  Text,
  Button,
  styled
} from "bappo-components";
import { AutoSizer, MultiGrid } from "react-virtualized";
import { setUserPreferences, getUserPreferences } from "user-preferences";
import {
  dateFormat,
  datesToArray,
  getEntryFormFields,
  updateRosterEntryRecords,
  deleteRosterEntryRecords,
  projectAssignmentsToOptions
} from "roster-utils";
import SingleRoster from "single-roster";

const dateRangeOptions = [
  {
    id: "6",
    label: "6 weeks"
  },
  {
    id: "12",
    label: "12 weeks"
  },
  {
    id: "24",
    label: "24 weeks"
  },
  {
    id: "52",
    label: "52 weeks"
  }
];

// Rows are sorted based on consultant name
class Roster extends React.Component {
  // Dimensions
  CELL_DIMENSION = 45;
  CELL_DIMENSION_LARGE = 120;
  CONSULTANT_CELL_WIDTH = 160;

  highestRowIndex = 0;
  isLoading = false;
  data = {
    projects: [],
    allConsultants: [],
    consultantMap: {},
    probabilityOptions: []
  };

  constructor(props) {
    super(props);

    this.state = {
      costCenter: null,
      weeks: "12",
      startDate: moment().startOf("week"),
      endDate: moment()
        .startOf("week")
        .add(12, "weeks"),
      initializing: true,
      mode: "small",
      entryList: [],
      consultants: [],
      projectAssignments: [],
      consultantOffset: 0,
      includeCrossTeamConsultants: false
    };
  }

  async componentDidMount() {
    const { $global, $models } = this.props;

    const [
      prefs,
      allConsultants,
      probabilities,
      commonProjects
    ] = await Promise.all([
      getUserPreferences($global.currentUser.id, $models),
      $models.Consultant.findAll({
        where: {
          active: true
        }
      }),
      $models.Probability.findAll(),
      $models.Project.findAll({
        where: {
          projectType: {
            $in: ["4", "5", "6", "7"]
          }
        }
      })
    ]);

    // Prepare base data
    const consultantMap = {};
    allConsultants.forEach(c => (consultantMap[c.id] = c));
    const probabilityMap = {};
    probabilities.forEach(p => (probabilityMap[p.id] = p));
    const probabilityOptions = probabilities.reverse().map((p, index) => ({
      id: p.id,
      label: p.name,
      pos: index
    }));
    this.data = {
      allConsultants,
      consultantMap,
      probabilityOptions,
      probabilityMap,
      commonProjects
    };

    const { costCenter_id, includeCrossTeamConsultants } = prefs;
    await this.setState({ includeCrossTeamConsultants });
    this.initialize(costCenter_id, this.state.startDate);
  }

  // Get projects in a profit centre and store in this
  getProjects = async costCenter_id => {
    // Assume cost center and profit center is one-to-one for now
    const { $models } = this.props;
    let projects;
    let costCenter;

    if (costCenter_id) {
      costCenter = await $models.CostCenter.findById(costCenter_id);
      projects = await $models.Project.findAll({
        where: {
          profitCentre_id: costCenter.profitCentre_id
        }
      });
    } else {
      projects = await $models.Project.findAll({
        where: {}
      });
    }

    await this.setState({ costCenter });
    this.data.projects = projects;
  };

  // TODO: initialize & reload with updated weeks (e.g. 52weeks)
  reload = () =>
    this.initialize(
      this.state.costCenter && this.state.costCenter.id,
      this.state.startDate
    );

  // Initial data initializing and configuration
  initialize = async (
    costCenter_id,
    startDate,
    endDate = moment(startDate).add(this.state.weeks, "weeks")
  ) => {
    const { $models } = this.props;
    await this.getProjects(costCenter_id);

    if (!this.state.initializing) await this.setState({ initializing: true });

    // Get date array, to put at first of entryList
    const dateArray = datesToArray(startDate, endDate).map(date => {
      let labelFormat = "DD";
      if (date.day() === 1) labelFormat = "MMM DD";

      return {
        formattedDate: date.format(labelFormat),
        weekday: date.format("ddd"),
        isWeekend: date.day() === 6 || date.day() === 0,
        date
      };
    });
    dateArray.unshift("");

    const consultants = costCenter_id
      ? this.data.allConsultants.filter(c => c.costCenter_id === costCenter_id)
      : this.data.allConsultants;

    consultants.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    console.log("initial count", consultants.length);

    this.setState(
      {
        entryList: [dateArray],
        consultants,
        consultantCount: consultants.length,
        consultantOffset: 0,
        startDate,
        endDate
      },
      () => this.loadData()
    );
  };

  loadData = async () => {
    const {
      startDate,
      endDate,
      consultants,
      consultantCount,
      consultantOffset,
      projectAssignments,
      entryList
    } = this.state;
    const { RosterEntry, ProjectAssignment } = this.props.$models;

    if (this.isLoading) return;
    this.isLoading = true;

    const newConsultantOffset = consultantOffset + 10;
    let newExternalCount = 0;

    const newConsultants = consultants.slice(
      consultantOffset,
      newConsultantOffset
    );

    // Build map between id and consultant
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

    // Build roster entry query, based on whether to include external consultant
    const rosterEntryQuery = {
      where: {
        date: {
          $between: [startDate.format(dateFormat), endDate.format(dateFormat)]
        }
      },
      include: [{ as: "project" }, { as: "probability" }],
      limit: 1000
    };

    if (this.state.includeCrossTeamConsultants) {
      rosterEntryQuery.where.$or = [
        {
          consultant_id: {
            $in: newConsultantIds
          }
        },
        {
          project_id: {
            $in: this.data.projects.map(pj => pj.id)
          }
        }
      ];
    } else {
      rosterEntryQuery.where.consultant_id = {
        $in: newConsultantIds
      };
    }

    // Fetch roster entries
    promises.push(
      RosterEntry.findAll(rosterEntryQuery).then(rosterEntries => {
        const tempMap = {};
        newConsultantIds.forEach(cid => {
          tempMap[cid] = [];
        });

        rosterEntries.forEach(entry => {
          const entryIndex = moment(entry.date).diff(startDate, "days");
          if (!tempMap[entry.consultant_id]) {
            // Entry of an external consultant
            newExternalCount += 1;
            tempMap[entry.consultant_id] = [];
          }
          tempMap[entry.consultant_id][entryIndex] = entry;
        });

        // Insert consultant name at first of roster entry array
        const newEntryList = Object.entries(tempMap).map(([key, value]) => {
          const consultant = this.data.consultantMap[key];
          return [consultant, ...value];
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

    const [newProjectAssignments, newEntryList] = await Promise.all(promises);

    if (newExternalCount > 0) {
      console.log("ext count", newExternalCount);
      console.log(entryList, newEntryList);
    }
    this.setState(
      {
        initializing: false,
        entryList: entryList.concat(newEntryList),
        projectAssignments: projectAssignments.concat(newProjectAssignments),
        consultantOffset: newConsultantOffset,
        consultantCount: consultantCount + newExternalCount
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
    const { projectAssignments } = this.state;
    const hisProjectAssignments = projectAssignments.filter(
      pa => pa.consultant_id === consultantId
    );

    return projectAssignmentsToOptions(
      hisProjectAssignments,
      this.data.commonProjects
    );
  };

  // Bring up a popup asking which cost centre and start time
  setFilters = async () => {
    const { $models, $popup } = this.props;

    const costCenters = await $models.CostCenter.findAll({
      limit: 1000
    });
    const costCenterOptions = costCenters.map(cc => ({
      id: cc.id,
      label: cc.name
    }));

    $popup.form({
      fields: [
        {
          name: "costCenterId",
          label: "Cost Center",
          type: "FixedList",
          properties: {
            options: costCenterOptions
          }
        },
        {
          name: "startDate",
          label: "Start Date",
          type: "Date",
          properties: {}
        },
        {
          name: "weeks",
          label: "Date Range",
          type: "FixedList",
          properties: {
            options: dateRangeOptions
          }
        },
        {
          name: "includeCrossTeamConsultants",
          type: "Checkbox",
          label:
            "Include external consultants working on projects of this practice"
        }
      ],
      initialValues: {
        costCenterId: this.state.costCenter && this.state.costCenter.id,
        startDate: this.state.startDate || moment().format(dateFormat),
        weeks: this.state.weeks,
        includeCrossTeamConsultants: this.state.includeCrossTeamConsultants
      },
      onSubmit: async ({
        costCenterId,
        startDate,
        weeks,
        includeCrossTeamConsultants
      }) => {
        const endDate = moment(startDate).add(weeks, "weeks");
        this.setState({
          weeks,
          projectAssignments: [],
          includeCrossTeamConsultants
        });
        this.highestRowIndex = 0;
        this.isLoading = false;
        this.initialize(costCenterId, moment(startDate), endDate);

        setUserPreferences(this.props.$global.currentUser.id, $models, {
          costCenter_id: costCenterId,
          includeCrossTeamConsultants
        });
      }
    });
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
      // Render consultant label cell, entry is consultant, but can be undefined - for future load
      const consultantName =
        (entry && entry.name) ||
        (this.state.consultants[rowIndex - 1] &&
          this.state.consultants[rowIndex - 1].name);
      const labelStyle = Object.assign({}, style, {
        width: this.CONSULTANT_CELL_WIDTH
      });

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
          style={labelStyle}
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
        this.data.probabilityMap[entry.probability_id].backgroundColor;
      label =
        mode === "large"
          ? entry.project.name
          : entry.project.key || entry.project.name;
      if (mode === "small" && label.length > 3) label = label.slice(0, 3);
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
    const projectOptions = this.getConsultantAssignments(consultant.id);

    this.props.$popup.open(
      <SingleRoster
        {...this.props}
        consultant={consultant}
        projectOptions={projectOptions}
        onUpdate={() => this.reloadConsultantData(consultant.id)}
      />,
      {
        style: {
          width: Infinity,
          height: Infinity
        },
        title: `${consultant.name}'s Roster`,
        headerLeftTitle: "Back"
      }
    );
  };

  openEntryForm = async (rowIndex, columnIndex, entry) => {
    const { entryList } = this.state;
    const consultant = entryList[rowIndex][0];
    const date = entryList[0][columnIndex].date.format(dateFormat);
    let projectOptions = this.getConsultantAssignments(consultant.id);
    if (projectOptions.length === this.data.commonProjects.length) {
      // no real assignments, likely to be an external consultants
      const pas = await this.props.$models.ProjectAssignment.findAll({
        where: { consultant_id: consultant.id },
        include: [{ as: "project" }]
      });
      projectOptions = projectAssignmentsToOptions(
        pas,
        this.data.commonProjects
      );
    }

    this.props.$popup.form({
      objectKey: "RosterEntry",
      fields: getEntryFormFields(projectOptions, this.data.probabilityOptions),
      title: `${consultant.name}, ${date}`,
      initialValues: {
        ...entry,
        consultant_id: consultant.id,
        startDate: date,
        endDate: date,
        weekdayFrom: "1",
        weekdayTo: "5"
      },
      onSubmit: this.updateRosterEntry
    });
  };

  updateRosterEntry = async data => {
    const consultant = this.data.allConsultants.find(
      c => c.id === data.consultant_id
    );

    const payload = {
      data,
      consultant,
      operatorName: this.props.$global.currentUser.name,
      $models: this.props.$models
    };

    if (data.project_id) await updateRosterEntryRecords(payload);
    else await deleteRosterEntryRecords(payload);

    await this.reloadConsultantData(data.consultant_id);
  };

  reloadConsultantData = async consultant_id => {
    const { startDate, endDate, consultants } = this.state;

    const rosterEntries = await this.props.$models.RosterEntry.findAll({
      where: {
        date: {
          $between: [startDate.format(dateFormat), endDate.format(dateFormat)]
        },
        consultant_id
      },
      include: [{ as: "project" }],
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

  render() {
    const {
      initializing,
      consultantCount,
      costCenter,
      entryList,
      mode
    } = this.state;

    if (initializing) {
      return <ActivityIndicator style={{ flex: 1 }} />;
    }

    const columnWidth =
      mode === "small" ? this.CELL_DIMENSION : this.CELL_DIMENSION_LARGE;
    const marginLeft =
      mode === "small"
        ? this.CONSULTANT_CELL_WIDTH - this.CELL_DIMENSION
        : this.CELL_DIMENSION;

    return (
      <Container>
        <HeaderContainer>
          <HeaderSubContainer>
            <Heading>
              Cost center: {(costCenter && costCenter.name) || "all"}
            </Heading>
            <TextButton onPress={this.setFilters}>filters</TextButton>
            <TextButton onPress={this.reload}>reload</TextButton>
          </HeaderSubContainer>
          <HeaderSubContainer>
            <Heading>Cell size:</Heading>
            <TextButton onPress={() => this.setDisplayMode("large")}>
              large
            </TextButton>
            <TextButton onPress={() => this.setDisplayMode("small")}>
              small
            </TextButton>
          </HeaderSubContainer>
        </HeaderContainer>
        <AutoSizer>
          {({ height, width }) => (
            <MultiGrid
              width={width}
              height={height - this.CELL_DIMENSION - 30}
              fixedColumnCount={1}
              fixedRowCount={1}
              cellRenderer={this.cellRenderer}
              columnCount={entryList[0].length}
              columnWidth={columnWidth}
              rowCount={consultantCount + 1}
              rowHeight={this.CELL_DIMENSION}
              styleTopLeftGrid={{ width: this.CONSULTANT_CELL_WIDTH }}
              styleBottomLeftGrid={{ width: this.CONSULTANT_CELL_WIDTH }}
              styleTopRightGrid={{ marginLeft }}
              styleBottomRightGrid={{ marginLeft, overflow: "scroll" }}
              ref={ref => {
                this.gridRef = ref;
              }}
            />
          )}
        </AutoSizer>
      </Container>
    );
  }
}

export default Roster;

const Container = styled(View)`
  flex: 1;
  flex-direction: column;
`;

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin: 20px;
`;

const HeaderSubContainer = styled.div`
  display: flex;
`;

const Heading = styled(Text)`
  font-size: 18px;
`;

const TextButton = styled(Button)`
  color: grey;
  margin-left: 10px;
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

const Cell = styled(Button)`
  ${baseStyle} 
  background-color: ${props =>
    props.isWeekend ? "white" : props.backgroundColor};
   
  border: 1px solid #eee;
   
  ${props => (props.blur ? "filter: blur(3px); opacity: 0.5;" : "")};
`;
