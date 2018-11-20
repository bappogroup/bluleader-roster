import React from "react";
import moment from "moment";
import {
  ActivityIndicator,
  Colors,
  FlatList,
  ScrollView,
  View,
  Text,
  styled,
  TouchableView,
  Button
} from "bappo-components";

const weekdays = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dateFormat = "YYYY-MM-DD";
const defaultWeekdays = {
  0: false,
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
  6: false
}; // Mon-Fri by default

// Truncate string to 18 characters at most
function truncString(str, max = 18, add = "...") {
  if (!str) return null;

  add = add || "...";
  return typeof str === "string" && str.length > max
    ? str.substring(0, max) + add
    : str;
}

// Get nearest Monday
function getMonday(d) {
  const _d = new Date(d);
  const day = _d.getDay();
  const diff = _d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(_d.setDate(diff));
}

// Get nearest Monday
function getSunday(d) {
  const _d = new Date(d);
  const day = _d.getDay();
  const diff = _d.getDate() - day + (day === 0 ? 0 : 7); // adjust when day is sunday
  return new Date(_d.setDate(diff));
}

// Converts differences in two dates to an array
function datesToArray(start, end) {
  const list = [];
  for (
    let dt = moment.utc(start), dend = moment.utc(end);
    dt <= dend;
    dt.add(1, "d")
  ) {
    list.push(dt.format(dateFormat));
  }
  return list;
}

// Gets diff between two arrays
// function arrayDiff(a, b) {
//   return [...a.filter(x => !b.includes(x)), ...b.filter(x => !a.includes(x))];
// }

/**
 * Mini Single Roster used to confirm selected dates
 * Only shows pre-selected date range
 * Clicking on a cell to select/deselect that day
 */
class MiniPreview extends React.Component {
  constructor(props) {
    super(props);
    const { formValues, dateToExistingEntryMap, projectOptions } = this.props;

    let start, end;
    let autoSubmit = false;
    if (formValues.startDate === formValues.endDate) {
      // Only 1 day is selected - don't show preview, auto submit
      autoSubmit = true;
      start = formValues.startDate;
      end = formValues.endDate;
    } else {
      start = getMonday(formValues.startDate);
      end = getSunday(formValues.endDate);
    }

    // Calculate previous roster entries - weeklyEntries
    const weeklyEntries = [];
    const dates = datesToArray(start, end, true);
    for (let i = 0; i < dates.length; i += 7) {
      weeklyEntries.push(
        dates
          .slice(i, i + 7)
          .map(date => ({ date, entry: dateToExistingEntryMap.get(date) }))
      );
    }

    // Get already booked project options
    const bookedProjectIds = {};
    dateToExistingEntryMap.forEach(entry => {
      if (!bookedProjectIds[entry.project_id])
        bookedProjectIds[entry.project_id] = true;
    });
    const bookedProjectOptions = projectOptions.filter(
      po => bookedProjectIds[po.value]
    );

    const clickedEntry = props.dateToExistingEntryMap.get(formValues.startDate);
    const clickedIsLeave =
      clickedEntry && props.leaveProjectIds.includes(clickedEntry.project_id);

    // Calculate newly selected entries
    this.state = {
      weeklyEntries,
      submitting: false,
      autoSubmit,
      selectedWeekdays: defaultWeekdays, // id-boolean map
      selectedProjects: {}, // id-boolean map
      dateToNewEntryMap: new Map(),
      showProjects: false,
      bookedProjectOptions,
      overridesLeaves: autoSubmit || clickedIsLeave
    };
  }

  async componentDidMount() {
    await this.buildDateToNewEntryMap(null, this.state.overridesLeaves);
    if (this.state.autoSubmit) this.submit();
  }

  // Calculate and update dateToNewEntryMap and selectedWeekdays in state
  // Re-calculate from scratch
  // Params are optional - can get from state instead
  buildDateToNewEntryMap = (_selectedWeekdays, overridesLeaves = false) => {
    const {
      formValues,
      consultant,
      leaveProjectIds,
      dateToExistingEntryMap
    } = this.props;

    const selectedWeekdays = _selectedWeekdays || this.state.selectedWeekdays;

    const newEntries = [];
    for (
      let d = moment(formValues.startDate).clone();
      d.isSameOrBefore(moment(formValues.endDate));
      d.add(1, "day")
    ) {
      let weekdayIndex = d.day();
      if (selectedWeekdays[weekdayIndex]) {
        // Only pick chosen days
        const date = d.format(dateFormat);
        const existingEntry = dateToExistingEntryMap.get(date);
        const isLeaveEntry =
          existingEntry &&
          existingEntry.project_id &&
          leaveProjectIds.includes(existingEntry.project_id);

        if (!isLeaveEntry || overridesLeaves) {
          newEntries.push({
            date,
            consultant_id: consultant.id,
            project_id: formValues.project_id,
            probability_id: formValues.probability_id
          });
        }
      }
    }

    const dateToNewEntryMap = new Map();
    newEntries.forEach(e => dateToNewEntryMap.set(e.date, e));
    return this.setState({
      selectedWeekdays,
      dateToNewEntryMap
    });
  };

  handleSelectAllWeekdays = () =>
    this.buildDateToNewEntryMap(defaultWeekdays, false);

  handleClear = () =>
    this.setState({
      dateToNewEntryMap: new Map(),
      selectedWeekdays: { 1: false, 2: false, 3: false, 4: false, 5: false },
      selectedProjects: {}
    });

  /**
   * Select all empty cells
   */
  handleSelectEmpty = () => {
    const { dateToNewEntryMap } = this.state;

    const newDateToNewEntryMap = new Map(dateToNewEntryMap);

    for (
      let d = moment(this.props.formValues.startDate).clone();
      d.isSameOrBefore(moment(this.props.formValues.endDate));
      d.add(1, "day")
    ) {
      const date = d.format(dateFormat);
      const weekdayIndex = d.day();
      const existingEntry = this.props.dateToExistingEntryMap.get(date);
      if (!existingEntry && weekdayIndex !== 0 && weekdayIndex !== 6) {
        newDateToNewEntryMap.set(date, {
          date,
          consultant_id: this.props.consultant.id,
          project_id: this.props.formValues.project_id,
          probability_id: this.props.formValues.probability_id
        });
      }
    }

    return this.setState({ dateToNewEntryMap: newDateToNewEntryMap });
  };

  /**
   * Select/deselect all appearances of a weekday in the range
   */
  handleSelectHeader = index => {
    const { selectedWeekdays, dateToNewEntryMap } = this.state;
    const selected = !selectedWeekdays[index];

    const newSelectedWeekdays = {
      ...selectedWeekdays,
      [index]: selected
    };
    const newDateToNewEntryMap = new Map(dateToNewEntryMap);

    for (
      let d = moment(this.props.formValues.startDate).clone();
      d.isSameOrBefore(moment(this.props.formValues.endDate));
      d.add(1, "day")
    ) {
      const date = d.format(dateFormat);

      const existingEntry = this.props.dateToExistingEntryMap.get(date);
      const isLeaveEntry =
        existingEntry &&
        existingEntry.project_id &&
        this.props.leaveProjectIds.includes(existingEntry.project_id);

      if (d.day() === index && !isLeaveEntry) {
        // Only select non-leave entries
        if (selected) {
          // Weekday selected
          newDateToNewEntryMap.set(date, {
            date,
            consultant_id: this.props.consultant.id,
            project_id: this.props.formValues.project_id,
            probability_id: this.props.formValues.probability_id
          });
        } else {
          // Weekday deselected
          newDateToNewEntryMap.delete(date);
        }
      }
    }

    return this.setState({
      selectedWeekdays: newSelectedWeekdays,
      dateToNewEntryMap: newDateToNewEntryMap
    });
  };

  /**
   * Select/deselect all appearances of a project in the range
   */
  handleSelectProject = projectId => {
    const { dateToNewEntryMap, selectedProjects } = this.state;
    const selected = !selectedProjects[projectId];

    const newSelectedProjects = {
      ...selectedProjects,
      [projectId]: selected
    };
    const newDateToNewEntryMap = new Map(dateToNewEntryMap);

    for (
      let d = moment(this.props.formValues.startDate).clone();
      d.isSameOrBefore(moment(this.props.formValues.endDate));
      d.add(1, "day")
    ) {
      const date = d.format(dateFormat);
      const existingEntry = this.props.dateToExistingEntryMap.get(date);
      if (existingEntry && existingEntry.project_id === projectId) {
        if (selected) {
          // Project selected
          newDateToNewEntryMap.set(date, {
            date,
            consultant_id: this.props.consultant.id,
            project_id: this.props.formValues.project_id,
            probability_id: this.props.formValues.probability_id
          });
        } else {
          // Project deselected
          newDateToNewEntryMap.delete(date);
        }
      }
    }

    return this.setState({
      selectedProjects: newSelectedProjects,
      dateToNewEntryMap: newDateToNewEntryMap
    });
  };

  submit = async () => {
    this.setState({ submitting: true });
    const { dateToNewEntryMap } = this.state;
    const {
      $models,
      consultant,
      afterSubmit,
      formValues,
      operatorName
    } = this.props;

    const pendingEntries = [];
    const pendingDates = [];
    let datesString = "";
    dateToNewEntryMap.forEach((entry, date) => {
      pendingEntries.push(entry);
      pendingDates.push(date);
      datesString += `${date}, `;
    });

    if (datesString.endsWith(", "))
      datesString = datesString.substr(0, datesString.length - 2);

    if (pendingEntries.length !== 0) {
      // Create Roster Change Logs
      $models.RosterChange.create({
        changedBy: operatorName,
        changeDate: moment().format(dateFormat),
        comment: formValues.comment,
        consultant: consultant.name,
        startDate: formValues.startDate,
        endDate: formValues.endDate,
        project_id: formValues.project_id,
        probability_id: formValues.probability_id,
        includedDates: datesString
      });

      // 1. Remove existing entries on chosen dates
      await $models.RosterEntry.destroy({
        where: {
          consultant_id: consultant.id,
          date: {
            $in: pendingDates
          }
        }
      });

      // 2. Create/Update entries
      if (formValues.project_id) {
        await $models.RosterEntry.bulkCreate(pendingEntries);
      }
    }

    typeof afterSubmit === "function" && afterSubmit();
  };

  rowKeyExtractor = row => {
    if (!row.length) return null;
    return row[0].date;
  };

  renderCell = ({ date, entry }) => {
    const { formValues } = this.props;
    const dateMoment = moment(date);
    if (
      date &&
      (dateMoment.isBefore(moment(formValues.startDate)) ||
        dateMoment.isAfter(moment(formValues.endDate)))
    )
      return (
        <DummyCell key={date}>
          <Text>--</Text>
        </DummyCell>
      );

    const projectName = truncString(
      entry && entry.project && (entry.project.key || entry.project.name)
    );

    const newEntry = this.state.dateToNewEntryMap.get(date);
    const backgroundColor = newEntry ? Colors.ORANGE : "#f8f8f8";

    return (
      <ButtonCell
        key={date}
        onPress={() =>
          this.setState(({ dateToNewEntryMap }) => {
            const newMap = new Map(dateToNewEntryMap);
            if (newEntry) newMap.delete(date);
            else {
              newMap.set(date, {
                date,
                consultant_id: this.props.consultant.id,
                project_id: this.props.formValues.project_id,
                probability_id: this.props.formValues.probability_id
              });
            }

            return { dateToNewEntryMap: newMap };
          })
        }
        backgroundColor={backgroundColor}
      >
        <CellText>{projectName}</CellText>
      </ButtonCell>
    );
  };

  renderRow = ({ item }) => {
    if (!item.length) return null;

    const mondayDate = new Date(item[0].date)
      .toLocaleDateString()
      .substring(0, 5);

    return (
      <Row>
        <HeaderCell>{mondayDate}</HeaderCell>
        {item.map(this.renderCell)}
      </Row>
    );
  };

  renderProjectButtons = () => {
    return (
      <View>
        <Text style={{ padding: 8 }}>Projects:</Text>
        <TopButtonContainer>
          {this.state.bookedProjectOptions.map(po => (
            <TopButton
              key={po.value}
              text={po.label}
              type="secondary"
              onPress={() => this.handleSelectProject(po.value)}
            />
          ))}
        </TopButtonContainer>
      </View>
    );
  };

  render() {
    if (this.state.autoSubmit)
      return <ActivityIndicator style={{ margin: 30 }} />;

    return (
      <Container>
        <BodyContainer>
          <TopButtonContainer>
            <TopButton
              text="Select all"
              type="secondary"
              onPress={this.handleSelectAllWeekdays}
            />
            <TopButton
              text="Clear"
              type="secondary"
              onPress={this.handleClear}
            />
            <TopButton
              text="Select free days"
              type="secondary"
              onPress={this.handleSelectEmpty}
            />
            <TopButton
              text="By Project"
              type="secondary"
              onPress={() =>
                this.setState(({ showProjects }) => ({
                  showProjects: !showProjects
                }))
              }
            />
          </TopButtonContainer>
          {this.state.showProjects && this.renderProjectButtons()}
          <HeaderRow>
            {weekdays.map((date, index) =>
              date ? (
                <TouchableView
                  key={date}
                  style={{ flex: 1 }}
                  onPress={() =>
                    this.handleSelectHeader(index === 7 ? 0 : index)
                  }
                >
                  <HeaderCell key={date}>{date}</HeaderCell>
                </TouchableView>
              ) : (
                <HeaderCell key={`header-${index}`} />
              )
            )}
          </HeaderRow>
          <ScrollView>
            <StyledList
              data={this.state.weeklyEntries}
              extraData={this.state.dateToNewEntryMap}
              renderItem={this.renderRow}
              keyExtractor={this.rowKeyExtractor}
            />
          </ScrollView>
        </BodyContainer>

        <ButtonGroup style={{ marginTop: 16 }}>
          <Button type="secondary" text="Back" onPress={this.props.goBack} />
          <Button
            style={{ marginLeft: 16 }}
            type="primary"
            text="Submit"
            onPress={this.submit}
            loading={this.state.submitting}
          />
        </ButtonGroup>
      </Container>
    );
  }
}

export default MiniPreview;

const Container = styled(View)`
  flex: 1;
  background-color: white;
`;

const BodyContainer = styled(View)`
  flex: 1;
  padding: 8px 16px;
`;

const TopButtonContainer = styled(View)`
  flex-direction: row;
  align-items: center;
  padding: 8px;
  flex-wrap: wrap;
`;

const TopButton = styled(Button)`
  margin-right: 8px;
  margin-bottom: 8px;
`;

const HeaderRow = styled(View)`
  flex-direction: row;
  justify-content: center;
  height: 40px;
  margin-top: 8px;
`;

const cellStyle = `
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const HeaderCell = styled(Text)`
  ${cellStyle};
  text-align: center;
  align-self: center;
`;

// Style in MS Edge
const StyledList = styled(FlatList)`
  & > div > div {
    height: 40px;
  }
`;

const Row = styled(View)`
  flex-direction: row;
  height: 40px;
`;

const DummyCell = styled(View)`
  ${cellStyle} border: 1px solid white;
`;

const ButtonCell = styled(TouchableView)`
  ${cellStyle} border: 1px solid #eee;
  background-color: ${props => props.backgroundColor};
`;

const CellText = styled(Text)`
  font-size: 12px;
`;

const ButtonGroup = styled(View)`
  background-color: rgb(241, 241, 240);
  padding: 16px 32px;
  align-items: center;
  flex-direction: row;
  justify-content: flex-end;
`;
