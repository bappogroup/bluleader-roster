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
  Button,
  Switch
} from "bappo-components";
import { datesToArray } from "roster-utils";

const weekdays = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

/**
 * Mini Single Roster used to confirm selected dates
 * Only shows pre-selected date range
 * Clicking on a cell to select/deselect that day
 */
class MiniPreview extends React.Component {
  constructor(props) {
    super(props);
    const { formValues, dateToExistingEntryMap } = this.props;

    // Calculate previous roster entries - weeklyEntries
    const weeklyEntries = [];
    const dates = datesToArray(
      getMonday(formValues.startDate),
      getSunday(formValues.endDate),
      true
    );
    for (let i = 0; i < dates.length; i += 7) {
      weeklyEntries.push(
        dates
          .slice(i, i + 7)
          .map(date => ({ date, entry: dateToExistingEntryMap.get(date) }))
      );
    }

    // Calculate newly selected entries
    const dateToNewEntryMap = this.calculateDateToNewEntryMap();

    this.state = { weeklyEntries, dateToNewEntryMap, overridesLeave: false };
  }

  calculateDateToNewEntryMap = (_selectedDays, _overridesLeave) => {
    const {
      formValues,
      consultant,
      leaveProjectIds,
      dateToExistingEntryMap
    } = this.props;

    let selectedDays = _selectedDays;
    if (!selectedDays) {
      // Use selection from the form
      selectedDays = [];
      if (formValues.sunday) selectedDays.push(0);
      if (formValues.monday) selectedDays.push(1);
      if (formValues.tuesday) selectedDays.push(2);
      if (formValues.wednesday) selectedDays.push(3);
      if (formValues.thursday) selectedDays.push(4);
      if (formValues.friday) selectedDays.push(5);
      if (formValues.saturday) selectedDays.push(6);
    }
    let overridesLeave = _overridesLeave;
    if (overridesLeave) overridesLeave = this.state.overridesLeave;

    const newEntries = [];
    for (
      let d = moment(formValues.startDate).clone();
      d.isSameOrBefore(moment(formValues.endDate));
      d.add(1, "day")
    ) {
      let weekdayIndex = d.day();
      if (selectedDays.includes(weekdayIndex)) {
        // Only pick chosen days
        const date = d.format("YYYY-MM-DD");
        const existingEntry = dateToExistingEntryMap.get(date);
        const isLeaveEntry =
          existingEntry &&
          existingEntry.project_id &&
          leaveProjectIds.includes(existingEntry.project_id);

        if (!isLeaveEntry || overridesLeave) {
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
    return dateToNewEntryMap;
  };

  handleSelectAllWeekdays = () => {
    const selectedDays = [1, 2, 3, 4, 5];
    const dateToNewEntryMap = this.calculateDateToNewEntryMap(selectedDays);
    this.setState({ dateToNewEntryMap });
  };

  handleToggleOverridesLeaves = overridesLeave => {
    const newDateToNewEntryMap = this.calculateDateToNewEntryMap(
      null,
      overridesLeave
    );
    this.setState({ overridesLeave, dateToNewEntryMap: newDateToNewEntryMap });
  };

  submit = () => {
    const { dateToNewEntryMap } = this.state;
    // convert to new entries array then bulk update
  };

  rowKeyExtractor = row => {
    if (!row.length) return null;
    return row[0].date;
  };

  renderCell = ({ date, entry }) => {
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
            if (newEntry) newMap.set(date, null);
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

  render() {
    return (
      <Container>
        <TopButtonContainer>
          <TopButton
            text="Select all"
            type="secondary"
            onPress={this.handleSelectAllWeekdays}
          />
          <TopButton
            text="Clear"
            type="secondary"
            onPress={() => this.setState({ dateToNewEntryMap: new Map() })}
          />
        </TopButtonContainer>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ margin: 8 }}>Overrides Leaves</Text>
          <Switch
            value={this.state.overridesLeave}
            onValueChange={this.handleToggleOverridesLeaves}
          />
        </View>
        <HeaderRow>
          {weekdays.map(date => (
            <HeaderCell key={date}>{date}</HeaderCell>
          ))}
        </HeaderRow>
        <ScrollView>
          <StyledList
            data={this.state.weeklyEntries}
            extraData={this.state.dateToNewEntryMap}
            ListHeaderComponent={this.renderLoadPreviousButton}
            renderItem={this.renderRow}
            keyExtractor={this.rowKeyExtractor}
            onEndReached={this.handleLoadMore}
            onEndThreshold={0}
          />
        </ScrollView>
      </Container>
    );
  }
}

export default MiniPreview;

const Container = styled(View)`
  flex: 1;
  padding: 0px 32px 16px 16px;
  background-color: white;
`;

const TopButtonContainer = styled(View)`
  flex-direction: row;
`;

const TopButton = styled(Button)`
  margin-right: 8px;
`;

const HeaderRow = styled(View)`
  flex-direction: row;
  justify-content: center;
  height: 40px;
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

const ButtonCell = styled(TouchableView)`
  ${cellStyle} border: 1px solid #eee;
  background-color: ${props => props.backgroundColor};
`;

const CellText = styled(Text)`
  font-size: 12px;
`;
