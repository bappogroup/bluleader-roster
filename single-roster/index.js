import React from 'react';
import { ActivityIndicator, FlatList, View, Text, Button, styled } from 'bappo-components';
import {
  getEntryFormFields,
  updateRosterEntryRecords,
  projectAssignmentsToOptions,
} from 'roster-utils';
import { formatDate, getMonday, addWeeks, getWeeksDifference } from './utils';

const WEEKS_PER_LOAD = 20;
const weekdays = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function truncString(str, max = 18, add = '...') {
  add = add || '...';
  return typeof str === 'string' && str.length > max ? str.substring(0, max) + add : str;
}

class SingleRoster extends React.Component {
  data = {
    probabilityOptions: [],
    probabilityLookup: {}, // Find a probability by id
    projectOptions: [],
    projectLookup: {}, // Find a project by id
    projectAssignmentLookup: {},
  };

  constructor(props) {
    super(props);

    const startDate = getMonday(new Date());
    const endDate = addWeeks(startDate, WEEKS_PER_LOAD);

    this.state = {
      startDate,
      endDate,
      firstLoaded: false,
      loading: false,
      weeklyEntries: [], // Array of array, containing entries of each week
      consultant: null,
    };
  }

  async componentDidMount() {
    const { consultant, projectOptions, $models, consultantId } = this.props;
    let recordId;
    if (consultant) {
      recordId = consultant.id;
    } else if (consultantId) {
      recordId = consultantId;
    } else {
      recordId = this.props.$navigation.state.params.recordId;
    }

    const promises = [];

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

    if (!consultant) {
      promises.push($models.Consultant.findById(recordId));
    }

    const [projectAssignments, leaveProjects, probabilities, currentConsultant] = await Promise.all(
      promises,
    );
    const currentProjectOptions = projectAssignmentsToOptions(projectAssignments, leaveProjects);
    const projectLookup = {};
    projectAssignments.forEach(pa => (projectLookup[pa.project_id] = pa.project));
    const probabilityLookup = {};
    probabilities.forEach(p => (probabilityLookup[p.id] = p));

    this.data.probabilityOptions = probabilities.map((p, index) => ({
      id: p.id,
      label: p.name,
      pos: index,
    }));
    this.data.probabilityLookup = probabilityLookup;
    this.data.projectLookup = projectLookup;
    this.data.projectOptions = projectOptions || currentProjectOptions;

    await this.setState({
      consultant: consultant || currentConsultant,
    });

    await this.loadRosterEntries(this.state.startDate, this.state.endDate);
    this.setState({ firstLoaded: true });
  }

  // fetch roster entries between two given dates and append current entry list in state
  loadRosterEntries = async (startDate, endDate, isPrevious = false) => {
    if (this.state.loading) return;
    const { consultant } = this.state;
    await this.setState({ loading: true });

    const newRosterEntries = await this.props.$models.RosterEntry.findAll({
      where: {
        consultant_id: consultant.id,
        date: {
          $between: [formatDate(startDate), formatDate(endDate)],
        },
      },
      include: [{ as: 'project' }, { as: 'probability' }],
      limit: 10000,
    });

    const newEntries = {};
    const newEntriesArr = [];
    newRosterEntries.forEach(entry => {
      newEntries[entry.date] = entry;
    });

    // Put in 'date' to empty entry cells
    for (let d = new Date(startDate.getTime()); d < endDate; d.setDate(d.getDate() + 1)) {
      const date = formatDate(d);
      newEntriesArr.push(newEntries[date] || { date });
    }

    // Group entries by week
    const newWeeklyEntries = [];
    for (let i = 0; i < newEntriesArr.length; i += 7) {
      newWeeklyEntries.push(newEntriesArr.slice(i, i + 7));
    }

    await this.setState(({ weeklyEntries }) => {
      const newState = { loading: false };

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
      fields: getEntryFormFields(this.data.projectOptions, this.data.probabilityOptions),
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
    const { consultant, startDate } = this.state;
    const { probabilityLookup, projectLookup } = this.data;

    const updatedRecords = await updateRosterEntryRecords({
      data,
      consultant,
      operatorName: this.props.$global.currentUser.name,
      $models: this.props.$models,
    });

    // Update records in state
    const newWeeklyEntries = this.state.weeklyEntries.slice();
    updatedRecords.forEach(entry => {
      const entryDate = new Date(entry.date);
      const weekIndex = getWeeksDifference(entryDate, startDate);
      let dayIndex = entryDate.getDay();
      if (dayIndex === 0) dayIndex = 7;
      dayIndex -= 1;

      const project = projectLookup[entry.project_id];
      const probability = probabilityLookup[entry.probability_id];

      newWeeklyEntries[weekIndex][dayIndex] = {
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
    const { endDate, firstLoaded } = this.state;
    if (!firstLoaded) return;
    this.loadRosterEntries(endDate, addWeeks(endDate, WEEKS_PER_LOAD));
  };

  rowKeyExtractor = row => {
    if (!row.length) return null;
    return row[0].date;
  };

  renderRow = ({ item }) => {
    if (!item.length) return null;

    const mondayDate = new Date(item[0].date).toLocaleDateString().substring(0, 5);

    return (
      <Row>
        <HeaderCell>{mondayDate}</HeaderCell>
        {item.map(this.renderCell)}
      </Row>
    );
  };

  renderCell = entry => {
    let backgroundColor = '#f8f8f8';
    if (entry && entry.probability) {
      backgroundColor = entry.project.backgroundColour || entry.probability.backgroundColor;
    }

    let projectName = entry && entry.project && entry.project.name;
    if (projectName) projectName = truncString(projectName);

    if (this.props.readOnly) {
      return (
        <TextCell key={entry.date} backgroundColor={backgroundColor}>
          <CellText>{projectName}</CellText>
        </TextCell>
      );
    }

    return (
      <ButtonCell
        key={entry.date}
        onPress={() => this.openEntryForm(entry)}
        backgroundColor={backgroundColor}
      >
        <CellText>{projectName}</CellText>
      </ButtonCell>
    );
  };

  renderLoadPreviousButton = () => (
    <ButtonRow>
      <LoadPreviousButton
        onPress={() =>
          this.loadRosterEntries(addWeeks(this.state.startDate, -10), this.state.startDate, true)
        }
      >
        <Text>load previous</Text>
      </LoadPreviousButton>
    </ButtonRow>
  );

  render() {
    const { consultant, weeklyEntries, firstLoaded } = this.state;
    if (!(consultant && firstLoaded)) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
      <Container>
        <Text>{this.state.longString}</Text>
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

const ButtonCell = styled(Button)`
  ${cellStyle} border: 1px solid #eee;
  background-color: ${props => props.backgroundColor};
`;

const TextCell = styled(View)`
  ${cellStyle} border: 1px solid #eee;
  background-color: ${props => props.backgroundColor};
`;

// TODO: alternate for outline
const LoadPreviousButton = styled(Button)``;

const CellText = styled(Text)`
  font-size: 12px;
`;
