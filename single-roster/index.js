import React from 'react';
import { ActivityIndicator, FlatList, View, Text, Button, styled } from 'bappo-components';
import {
  dateFormat,
  datesToArray,
  getEntryFormFields,
  updateRosterEntryRecords,
  projectAssignmentsToOptions,
} from 'roster-utils';
import moment from 'moment';

const WEEKS_PER_LOAD = 20;
const weekdays = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function truncString(str, max = 18, add = '...') {
  add = add || '...';
  return typeof str === 'string' && str.length > max ? str.substring(0, max) + add : str;
}

class SingleRoster extends React.Component {
  state = {
    startDate: moment(this.props.startDate)
      .day(1)
      .startOf('day'),
    endDate: null,
    loading: false,
    weeklyEntries: [], // Array of array, containing entries of each week
    consultant: this.props.consultant,
    projectOptions: this.props.projectOptions,
    projectLookup: {}, // Find a project by id
    probabilityLookup: {}, // Find a probability by id
  };

  async componentDidMount() {
    const { consultant, projectOptions, $models } = this.props;

    if (!(consultant && projectOptions)) {
      const { recordId } = this.props.$navigation.state.params;
      const promises = [];

      promises.push($models.Consultant.findById(recordId));
      promises.push(
        $models.ProjectAssignment.findAll({
          where: {
            consultant_id: recordId,
          },
          include: [{ as: 'project' }],
          limit: 1000,
        }),
      );
      promises.push(
        $models.Project.findAll({
          where: {
            projectType: {
              $in: ['4', '5', '6'],
            },
          },
        }),
      );
      promises.push($models.Probability.findAll({}));

      await Promise.all(promises).then(
        ([currentConsultant, projectAssignments, leaveProjects, probabilities]) => {
          const currentProjectOptions = projectAssignmentsToOptions(
            projectAssignments,
            leaveProjects,
          );
          const projectLookup = {};
          projectAssignments.forEach(pa => (projectLookup[pa.project_id] = pa.project));
          const probabilityLookup = {};
          probabilities.forEach(p => (probabilityLookup[p.id] = p));

          return this.setState({
            consultant: currentConsultant,
            projectOptions: currentProjectOptions,
            projectLookup,
            probabilityLookup,
          });
        },
      );
    }

    const { startDate } = this.state;
    const endDate = startDate.clone().add(WEEKS_PER_LOAD, 'weeks');
    this.loadRosterEntries(startDate, endDate);
  }

  // fetch roster entries between two given dates and append current entry list in state
  loadRosterEntries = async (startDate, endDate, isPrevious = false) => {
    if (this.state.loading) return;
    const { consultant } = this.state;
    this.setState({ loading: true });

    const newRosterEntries = await this.props.$models.RosterEntry.findAll({
      where: {
        consultant_id: consultant.id,
        date: {
          $between: [startDate.format(dateFormat), endDate.format(dateFormat)],
        },
      },
      include: [{ as: 'project' }, { as: 'probability' }],
      limit: 10000,
    });

    const newEntries = {};
    newRosterEntries.forEach(entry => {
      newEntries[entry.date] = entry;
    });

    // Put in 'date' to empty entry cells
    for (let d = startDate.clone(); d.isBefore(endDate); d.add(1, 'day')) {
      const date = d.format(dateFormat);
      if (!newEntries[date]) newEntries[date] = { date };
    }

    // Group entries by week
    const newEntriesByDate = datesToArray(startDate, endDate).map(
      date => newEntries[date.format(dateFormat)],
    );
    const newWeeklyEntries = [];

    for (let i = 0; i < newEntriesByDate.length; i += 7) {
      newWeeklyEntries.push(newEntriesByDate.slice(i, i + 7));
    }

    this.setState(({ weeklyEntries }) => {
      const newState = {
        loading: false,
      };

      if (isPrevious) {
        newState.weeklyEntries = [...newWeeklyEntries, ...weeklyEntries];
        newState.startDate = startDate;
      } else {
        newState.weeklyEntries = [...weeklyEntries, ...newWeeklyEntries];
        newState.endDate = endDate;
      }

      return newState;
    });
  };

  openEntryForm = entry => {
    this.props.$popup.form({
      objectKey: 'RosterEntry',
      fields: getEntryFormFields(this.state.projectOptions),
      title: `${entry.date}`,
      initialValues: {
        ...entry,
        consultant_id: this.state.consultant.id,
        startDate: entry.date,
        endDate: entry.date,
        weekdayFrom: '1',
        weekdayTo: '5',
      },
      onSubmit: this.updateRosterEntry,
    });
  };

  updateRosterEntry = async data => {
    const { consultant, startDate, projectLookup, probabilityLookup } = this.state;

    const updatedRecords = await updateRosterEntryRecords({
      data,
      consultant,
      operatorName: this.props.$global.currentUser.name,
      $models: this.props.$models,
    });

    // Update records in state
    const newWeeklyEntries = this.state.weeklyEntries.slice();
    updatedRecords.forEach(entry => {
      const entryDate = moment(entry.date);
      const weekIndex = entryDate.diff(startDate, 'week');
      const dayIndex = entryDate.weekday();
      const project = projectLookup[entry.project_id];
      const probability = probabilityLookup[entry.probability_id];
      newWeeklyEntries[weekIndex][dayIndex - 1] = {
        ...entry,
        project,
        probability,
      };
    });

    this.setState({ weeklyEntries: newWeeklyEntries });

    if (typeof this.props.onUpdate === 'function') {
      this.props.onUpdate();
    }
  };

  handleLoadMore = () => {
    const { endDate } = this.state;
    this.loadRosterEntries(endDate, moment(endDate).add(WEEKS_PER_LOAD, 'weeks'));
  };

  rowKeyExtractor = row => {
    if (!row.length) return null;
    return row[0].date;
  };

  renderRow = ({ item }) => {
    if (!item.length) return null;

    const mondayDate = moment(item[0].date).format('DD/MM');

    return (
      <Row>
        <HeaderCell>{mondayDate}</HeaderCell>
        {item.map(this.renderCell)}
      </Row>
    );
  };

  renderCell = entry => {
    if (!entry) return null;

    let backgroundColor = '#f8f8f8';
    if (entry && entry.probability) {
      backgroundColor = entry.probability.backgroundColor;
    }

    let projectName = entry && entry.project && entry.project.name;
    if (projectName) projectName = truncString(projectName);

    return (
      <Cell
        key={entry.date}
        onPress={() => this.openEntryForm(entry)}
        backgroundColor={backgroundColor}
      >
        <CellText>{projectName}</CellText>
      </Cell>
    );
  };

  renderLoadPreviousButton = () => {
    const startDate = moment(this.state.startDate).add(-10, 'weeks');
    const endDate = this.state.startDate;

    return (
      <ButtonRow>
        <LoadPreviousButton onPress={() => this.loadRosterEntries(startDate, endDate, true)}>
          load previous
        </LoadPreviousButton>
      </ButtonRow>
    );
  };

  render() {
    const { consultant, weeklyEntries } = this.state;
    if (!consultant) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
      <Container>
        <HeaderRow>{weekdays.map(date => <HeaderCell key={date}>{date}</HeaderCell>)}</HeaderRow>
        <StyledList
          data={weeklyEntries}
          ListHeaderComponent={this.renderLoadPreviousButton}
          renderItem={this.renderRow}
          keyExtractor={this.rowKeyExtractor}
          onEndReached={this.handleLoadMore}
          onEndThreshold={0}
        />
      </Container>
    );
  }
}

export default SingleRoster;

const Container = styled(View)`
  flex: 1;
  margin-right: 20px;
`;

// Style in MS Edge
const StyledList = styled(FlatList)`
  & > div > div {
    height: 40px;
  }
`;

const Row = styled(View)`
  flex: 1;
  flex-direction: row;
  height: 40px;
`;

const ButtonRow = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const HeaderRow = styled(View)`
  flex-direction: row;
  text-align: center;
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

const Cell = styled(Button)`
  ${cellStyle} border: 1px solid #eee;
  background-color: ${props => props.backgroundColor};
`;

const LoadPreviousButton = styled(Button)`
  outline: none;
`;

const CellText = styled(Text)`
  font-size: 12px;
`;
