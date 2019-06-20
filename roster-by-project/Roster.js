import React from "react";
import moment from "moment";
import {
  ActivityIndicator,
  View,
  Text,
  styled,
  Button,
  Dropdown
} from "bappo-components";
import { AutoSizer, MultiGrid } from "react-virtualized";
import JsonToHtml from "json-to-html";
import FiltersModal from "./FiltersModal";

const dateFormat = "YYYY-MM-DD";

const datesToArray = (from, to, toStringDate) => {
  const list = [];
  let day = moment(from).clone();
  const _to = moment(to);

  do {
    list.push(toStringDate ? day.format("YYYY-MM-DD") : day);
    day = day.clone().add(1, "d");
  } while (day <= _to);
  return list;
};

class RosterByProject extends React.Component {
  // Dimensions
  CELL_DIMENSION = 60;
  CELL_DIMENSION_LARGE = 120;
  CONSULTANT_CELL_WIDTH = 160;

  entryList = [];
  projectMap = {};
  probabilityMap = {};

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      consultants: [],
      leaveProjects: [],
      error: null,

      displayMode: "small",
      showBackgroundColor: true,
      showEmptyRows: false,

      // Filters
      filters: {
        startDate: moment().startOf("week"),
        endDate: moment()
          .startOf("week")
          .add(12, "weeks")
      },

      showFiltersModal: false,
      showShareModal: false
    };
  }

  async componentDidMount() {
    const { $models } = this.props;

    await Promise.all([
      $models.Probability.findAll().then(probabilities => {
        probabilities.forEach(pr => (this.probabilityMap[pr.id] = pr));
      }),

      $models.Project.findAll({
        where: {
          projectType: {
            $in: ["4", "5", "6", "7"]
          },
          active: true
        }
      }).then(leaveProjects => this.setState({ leaveProjects }))
    ]);

    this.initialize();
  }

  initialize = async () => {
    this.setState({ loading: true });

    const { $models, projects } = this.props;
    let { startDate, endDate } = this.state.filters;
    const consultants = [];

    const rosterEntryQuery = {
      where: {
        project_id: {
          $in: projects.map(p => p.id)
        }
      },
      include: [{ as: "consultant" }]
    };

    if (startDate && endDate) {
      rosterEntryQuery.where.date = {
        $between: [
          moment(startDate).format(dateFormat),
          moment(endDate).format(dateFormat)
        ]
      };
    }

    const rosterEntries = await $models.RosterEntry.findAll(rosterEntryQuery);

    if (this.state.showEmptyRows) {
      const projectAssignments = await $models.ProjectAssignment.findAll({
        where: {
          project_id: {
            $in: projects.map(p => p.id)
          }
        },
        include: [{ as: "consultant" }]
      });
      projectAssignments.forEach(pa => consultants.push(pa.consultant));
    }

    if (!rosterEntries.length)
      return this.setState({
        error: "No roster record found.",
        loading: false
      });

    if (!(startDate && endDate)) {
      // Date range is not specified - get start & end date from all roster entries
      startDate = new Date("2100-01-01");
      endDate = new Date("2000-01-01");
      rosterEntries.forEach(entry => {
        const date = new Date(entry.date);
        if (date < startDate) startDate = date;
        if (date > endDate) endDate = date;
      });
    }

    rosterEntries.forEach(entry => {
      // Hide consultants who don't have bookings
      const isLeaveProject = this.state.leaveProjects.find(
        p => p.id === entry.project_id
      );
      // Get all related consultants
      if (
        !isLeaveProject &&
        !consultants.find(c => c.id === entry.consultant_id)
      )
        consultants.push(entry.consultant);
    });

    consultants.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

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

    const entryList = [dateArray];

    // Insert roster entries into entryList
    const consultantMap = {};
    consultants.forEach(c => {
      consultantMap[c.id] = c;
    });
    const consultantIds = consultants.map(c => c.id);
    const tempMap = {}; // consultantID-to-rosterEntryArray
    consultantIds.forEach(cid => {
      tempMap[cid] = [];
    });
    rosterEntries.forEach(entry => {
      const entryIndex = moment(entry.date).diff(startDate, "days");
      if (tempMap[entry.consultant_id]) {
        tempMap[entry.consultant_id][entryIndex] = entry;
      }
    });

    // Insert consultant name at first of roster entry array
    const newEntryList = Object.entries(tempMap).map(
      ([consultantId, entryArr]) => {
        const consultant = consultantMap[consultantId];
        return [consultant].concat(entryArr);
      }
    );

    // Sorting based on consultant name
    newEntryList.sort((a, b) => {
      if (a[0].name < b[0].name) return -1;
      if (a[0].name > b[0].name) return 1;
      return 0;
    });

    this.entryList = entryList.concat(newEntryList);

    // Build projectId - project key or name lookup
    const projectMap = {};
    projects.forEach(p => {
      projectMap[p.id] = {
        name: p.name,
        key: p.key
      };
    });
    this.projectMap = projectMap;

    this.setState({ loading: false, consultants });
  };

  refresh = () => this.initialize();

  columnWidthGetter = ({ index }) => {
    const columnWidth =
      this.state.displayMode === "small"
        ? this.CELL_DIMENSION
        : this.CELL_DIMENSION_LARGE;
    return index === 0 ? 160 : columnWidth;
  };

  cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
    const entry =
      this.entryList[rowIndex] && this.entryList[rowIndex][columnIndex];

    let backgroundColor = "#f8f8f8";
    let label;

    if (rowIndex === 0) {
      // Render date label cell
      let color = "black";
      if (entry.isWeekend) color = "lightgrey";
      return (
        <Label key={key} style={style} backgroundColor={backgroundColor}>
          <DateLabel style={{ color }}>{entry.weekday}</DateLabel>
          <DateLabel style={{ color }}>{entry.formattedDate}</DateLabel>
        </Label>
      );
    } else if (columnIndex === 0) {
      // Render consultant label cell
      const consultantName =
        (entry && entry.name) || this.state.consultants[rowIndex - 1].name;

      return (
        <ConsultantLabel key={key} style={style}>
          <Text>{consultantName}</Text>
        </ConsultantLabel>
      );
    }

    // Render roster entry cell
    if (entry) {
      label = this.getProjectLabelByEntry(entry);

      // Get background color
      if (this.state.showBackgroundColor) {
        const probability = this.probabilityMap[entry.probability_id];
        if (probability) backgroundColor = probability.backgroundColor;
      }
    }

    // Apply weekend cell style
    const { isWeekend } = this.entryList[0][columnIndex];

    return (
      <Cell
        key={key}
        style={style}
        backgroundColor={backgroundColor}
        isWeekend={isWeekend}
      >
        <CenteredText>{label}</CenteredText>
      </Cell>
    );
  };

  getProjectLabelByEntry = entry => {
    const project = this.projectMap[entry.project_id];

    let label = "";
    if (project) {
      label =
        this.state.displayMode === "large"
          ? project.name
          : project.key || project.name;
    }
    // If a project is deleted, entry.project is null
    if (this.state.displayMode === "small" && label.length > 0)
      label = label.slice(0, 7);
    return label;
  };

  handleSetFilters = async ({ startDate, endDate }) => {
    await this.setState({
      filters: {
        startDate,
        endDate
      },
      showFiltersModal: false
    });

    this.initialize();
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
      await $models.ProjectAssignment.create(assignment);
    }
  };

  setDisplayMode = displayMode =>
    this.setState({ displayMode }, () => this.gridRef.recomputeGridSize());

  /**
   * Prepare data to share as HTML
   */
  prepareDataToShare = () => {
    const header = [
      {
        text: ""
      }
    ];

    this.entryList[0].forEach(({ date, isWeekend }) => {
      if (!date) return;

      const formattedDate = date.format("MMM D");
      header.push({
        text: formattedDate,
        color: isWeekend ? "lightgrey" : "black"
      });
    });

    const rows = this.entryList.slice(1).map(row => {
      const result = {
        "": {
          text: row[0].name
        }
      };
      row.slice(1).forEach(entry => {
        const date = moment(entry.date);
        const formattedDate = date.format("MMM D");

        result[formattedDate] = {
          text: this.getProjectLabelByEntry(entry)
        };

        if (this.state.showBackgroundColor) {
          // Get cell background color based on probability
          const probability = this.probabilityMap[entry.probability_id];
          const backgroundColor = probability
            ? probability.backgroundColor
            : "#f8f8f8";
          result[formattedDate].backgroundColor = backgroundColor;
        }
      });

      return result;
    });

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
      />
    );
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
    const { error, loading } = this.state;

    if (error)
      return (
        <Container>
          <Text style={{ margin: 20 }}>{error}</Text>
        </Container>
      );

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
      <Container>
        <MenuContainer>
          <Button
            icon="filter-list"
            text="Filters"
            onPress={() => this.setState({ showFiltersModal: true })}
            type="secondary"
            style={{ height: 40, marginRight: 16 }}
          />
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
                icon: "zoom-in",
                label: "Cell Size: Large",
                onPress: () => this.setDisplayMode("large")
              },
              {
                icon: "zoom-out",
                label: "Cell Size: Small",
                onPress: () => this.setDisplayMode("small")
              },
              {
                icon: "format-color-reset",
                label: this.state.showBackgroundColor
                  ? "Hide Cell Color"
                  : "Show Cell Color",
                onPress: () => {
                  this.setState(
                    ({ showBackgroundColor }) => ({
                      showBackgroundColor: !showBackgroundColor
                    }),
                    () => this.gridRef.recomputeGridSize()
                  );
                }
              },
              {
                icon: "remove-red-eye",
                label: this.state.showEmptyRows
                  ? "Hide Empty Rows"
                  : "Show Empty Rows",
                onPress: () => {
                  this.setState(
                    ({ showEmptyRows }) => ({
                      showEmptyRows: !showEmptyRows
                    }),
                    () => this.refresh()
                  );
                }
              }
            ]}
            icon="menu"
          />
        </MenuContainer>
        <AutoSizer>
          {({ height, width }) => (
            <MultiGrid
              width={width}
              height={height}
              fixedColumnCount={1}
              fixedRowCount={1}
              cellRenderer={this.cellRenderer}
              columnCount={this.entryList[0].length}
              columnWidth={this.columnWidthGetter}
              rowCount={this.state.consultants.length + 1}
              rowHeight={this.CELL_DIMENSION}
              ref={ref => (this.gridRef = ref)}
            />
          )}
        </AutoSizer>
        {this.state.showFiltersModal && this.renderFiltersModal()}
        {this.state.showShareModal && this.renderShareModal()}
      </Container>
    );
  }
}

export default RosterByProject;

const Container = styled(View)`
  flex: 1
  margin-bottom: 35px
`;

const baseStyle = `
  margin-left: 2px
  margin-right: 2px
  justify-content: center
  align-items: center
  box-sizing: border-box
  font-size: 12px
`;

const Label = styled(View)`
  ${baseStyle}
`;

const ConsultantLabel = styled(View)`
  ${baseStyle}
  align-items: flex-start;
`;

const Cell = styled(View)`
  ${baseStyle} background-color: ${props =>
  props.isWeekend ? "white" : props.backgroundColor}

  border: 1px solid #eee

  ${props => (props.blur ? "filter: blur(3px) opacity: 0.5" : "")}
`;

const CenteredText = styled(Text)`
  text-align: center;
`;

const DateLabel = styled(Text)`
  font-size: 12px;
`;

/**
 * Top Menu
 */
const MenuContainer = styled(View)`
  flex-direction: row
  justify-content: flex-start
  align-items: center
`;

/**
 * Top Menu Ends
 */
