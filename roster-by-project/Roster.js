import React from "react";
import moment from "moment";
import {
  ActivityIndicator,
  View,
  Text,
  styled,
  Button
} from "bappo-components";
import { AutoSizer, MultiGrid } from "react-virtualized";

// Format a date into ISO string e.g. 2018-01-01
// Take out all timezone info
function formatDate(d) {
  const date = new Date(d);
  return (
    date.getFullYear() +
    "-" +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + date.getDate()).slice(-2)
  );
}

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
  CELL_DIMENSION = 45;
  CELL_DIMENSION_LARGE = 120;
  CONSULTANT_CELL_WIDTH = 160;

  entryList = [];
  projectMap = {};

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      consultants: [],
      error: null,
      mode: this.props.projects.length > 1 ? "large" : "small"
    };
  }

  async componentDidMount() {
    const { $models, projects } = this.props;
    const rosterEntries = await $models.RosterEntry.findAll({
      where: {
        project_id: {
          $in: projects.map(p => p.id)
        }
      },
      include: [{ as: "consultant" }]
    });

    if (!rosterEntries.length)
      return this.setState({
        error: "No roster record found for project(s)",
        loading: false
      });

    let startDate = new Date("2100-01-01");
    let endDate = new Date("2000-01-01");
    const consultants = [];

    rosterEntries.forEach(entry => {
      // Get start & end date from roster entries
      const date = new Date(entry.date);
      if (date < startDate) startDate = date;
      if (date > endDate) endDate = date;

      // Get all related consultants
      if (!consultants.find(c => c.id === entry.consultant_id))
        consultants.push(entry.consultant);
    });

    consultants.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    // Get date array, to put at first of entryList
    const dateArray = datesToArray(
      formatDate(startDate),
      formatDate(endDate)
    ).map((date, index) => {
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
    const tempMap = {};
    consultantIds.forEach(cid => {
      tempMap[cid] = [];
    });
    rosterEntries.forEach(entry => {
      const entryIndex = moment(entry.date).diff(formatDate(startDate), "days");
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

    this.entryList = entryList.concat(newEntryList);

    // Build projectId - projectName lookup
    const projectMap = {};
    projects.forEach(p => (projectMap[p.id] = p.name));
    this.projectMap = projectMap;

    this.setState({ loading: false, consultants });
  }

  columnWidthGetter = ({ index }) => {
    const columnWidth =
      this.state.mode === "small"
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

      return (
        <Label key={key} style={style} backgroundColor={backgroundColor}>
          {consultantName}
        </Label>
      );
    }

    // Render roster entry cell
    if (entry) {
      label = this.projectMap[entry.project_id];
      if (this.props.projects.length === 1) label = label.slice(0, 3);
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
        {label}
      </Cell>
    );
  };

  setDisplayMode = mode =>
    this.setState({ mode }, () => this.gridRef.recomputeGridSize());

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
        <Header>
          <Text>Cell size:</Text>
          <Button
            text="large"
            onPress={() => this.setDisplayMode("large")}
            type="tertiary"
          />
          <Button
            text="small"
            onPress={() => this.setDisplayMode("small")}
            type="tertiary"
          />
        </Header>
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
      </Container>
    );
  }
}

export default RosterByProject;

const Container = styled(View)`
  flex: 1;
  margin-bottom: 35px;
`;

const baseStyle = `
  margin-left: 2px;
  margin-right: 2px;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  font-size: 12px;
`;

const Label = styled(View)`
  ${baseStyle};
  color: ${props => props.color || "black"};
`;

const Cell = styled(View)`
  ${baseStyle} background-color: ${props =>
  props.isWeekend ? "white" : props.backgroundColor};

  border: 1px solid #eee;

  ${props => (props.blur ? "filter: blur(3px); opacity: 0.5;" : "")};
`;

const Header = styled(View)`
  flex-direction: row;
  align-items: center;
`;
