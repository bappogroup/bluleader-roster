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

const weekdays = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dateFormat = "YYYY-MM-DD";

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

    let autoSubmit = false;
    let overridesLeave = false;
    if (formValues.startDate === formValues.endDate) {
      // Only 1 day is selected - don't show preview, auto submit
      autoSubmit = true;
      overridesLeave = true;
    }

    // Calculate newly selected entries
    this.state = {
      weeklyEntries,
      overridesLeave,
      submitting: false,
      autoSubmit
    };
    const dateToNewEntryMap = this.calculateDateToNewEntryMap();
    this.state.dateToNewEntryMap = dateToNewEntryMap;

    if (autoSubmit) this.submit();
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
    if (typeof overridesLeave === "undefined")
      overridesLeave = this.state.overridesLeave;

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
              onPress={() => this.setState({ dateToNewEntryMap: new Map() })}
            />
          </TopButtonContainer>
          <LeaveSwitchContainer>
            <Text style={{ marginRight: 8 }}>Overrides Leaves</Text>
            <Switch
              value={this.state.overridesLeave}
              onValueChange={this.handleToggleOverridesLeaves}
            />
          </LeaveSwitchContainer>
          <HeaderRow>
            {weekdays.map(date => (
              <HeaderCell key={date}>{date}</HeaderCell>
            ))}
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

const LeaveSwitchContainer = styled(View)`
  margin: 8px 0;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const ButtonGroup = styled(View)`
  background-color: rgb(241, 241, 240);
  padding: 16px 32px;
  align-items: center;
  flex-direction: row;
  justify-content: flex-end;
`;
