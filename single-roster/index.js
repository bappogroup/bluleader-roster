import React from "react";
import {
  ActivityIndicator,
  FlatList,
  View,
  Text,
  styled,
  TouchableView
} from "bappo-components";
import { projectAssignmentsToOptions } from "roster-utils";
import RosterEntryForm from "roster-entry-form";
// import RosterEntryForm from "./RosterEntryForm";
import { formatDate, getMonday, addWeeks } from "./utils";

const WEEKS_PER_LOAD = 20;
const weekdays = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function truncString(str, max = 18, add = "...") {
  add = add || "...";
  return typeof str === "string" && str.length > max
    ? str.substring(0, max) + add
    : str;
}

class SingleRoster extends React.Component {
  data = {
    probabilityOptions: [],
    probabilityLookup: {}, // Find a probability by id
    projectOptions: [],
    projectLookup: {}, // Find a project by id
    projectAssignmentLookup: {},
    commonProjects: [],
    leaveProjects: []
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
      entryForm: { show: false }
    };
  }

  async componentDidMount() {
    const { consultant, projectOptions, $models, consultantId } = this.props;
    // let recordId = "2";
    let recordId;
    if (consultant) {
      recordId = consultant.id;
    } else if (consultantId) {
      recordId = consultantId;
    } else {
      ({ recordId } = this.props.$navigation.state.params);
    }

    const promises = [];

    promises.push(
      $models.ProjectAssignment.findAll({
        where: {
          consultant_id: recordId
        },
        include: [{ as: "project" }],
        limit: 1000
      })
    );
    promises.push(
      $models.Project.findAll({
        where: {
          projectType: {
            $in: ["4", "5", "6", "7"]
          }
        }
      })
    );
    promises.push($models.Probability.findAll({}));

    if (!consultant) {
      promises.push($models.Consultant.findById(recordId));
    }

    const [
      projectAssignments,
      commonProjects,
      probabilities,
      currentConsultant
    ] = await Promise.all(promises);
    const currentProjectOptions = projectAssignmentsToOptions(
      projectAssignments,
      commonProjects
    );
    const projectLookup = {};
    projectAssignments.forEach(
      pa => (projectLookup[pa.project_id] = pa.project)
    );
    commonProjects.forEach(p => (projectLookup[p.id] = p));
    const probabilityLookup = {};
    probabilities.forEach(p => (probabilityLookup[p.id] = p));

    this.data.commonProjects = commonProjects;
    const leaveProjects = commonProjects.filter(p =>
      ["4", "5", "6"].includes(p.projectType)
    );
    this.data.leaveProjects = leaveProjects;
    this.data.probabilityOptions = probabilities.reverse().map((p, index) => ({
      value: p.id,
      label: p.name,
      pos: index
    }));
    this.data.probabilityLookup = probabilityLookup;
    this.data.projectLookup = projectLookup;
    this.data.projectOptions = projectOptions || currentProjectOptions;

    await this.setState({
      consultant: consultant || currentConsultant
    });

    await this.loadRosterEntries(this.state.startDate, this.state.endDate);
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
          $between: [formatDate(startDate), formatDate(endDate)]
        }
      },
      limit: 10000
    });

    const newEntries = {};
    const newEntriesArr = [];
    newRosterEntries.forEach(entry => {
      newEntries[entry.date] = entry;
    });

    // Put 'date' in empty entry cells
    for (
      let d = new Date(startDate.getTime());
      d < endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const date = formatDate(d);
      newEntriesArr.push(newEntries[date] || { date });
    }

    // Group entries by week
    const newWeeklyEntries = [];
    for (let i = 0; i < newEntriesArr.length; i += 7) {
      newWeeklyEntries.push(newEntriesArr.slice(i, i + 7));
    }

    await this.setState(({ weeklyEntries }) => {
      const newState = { loading: false, firstLoaded: true };

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
    const dateToExistingEntryMap = new Map();
    this.state.weeklyEntries.forEach(weekdays => {
      weekdays.forEach(entry => {
        if (entry && entry.project_id) {
          dateToExistingEntryMap.set(entry.date, {
            ...entry,
            project: this.data.projectLookup[entry.project_id]
          });
        }
      });
    });

    this.setState({
      entryForm: {
        show: true,
        title: `${this.state.consultant.name}'s Rosters`,
        initialValues: {
          ...entry,
          consultant_id: this.state.consultant.id,
          startDate: entry.date,
          endDate: entry.date
        },
        dateToExistingEntryMap
      }
    });
  };

  handleLoadMore = () => {
    const { endDate, firstLoaded } = this.state;
    if (!firstLoaded) return;
    this.loadRosterEntries(endDate, addWeeks(endDate, WEEKS_PER_LOAD));
  };

  closeEntryForm = () =>
    this.setState(({ entryForm }) => ({
      entryForm: {
        ...entryForm,
        show: false
      }
    }));

  rowKeyExtractor = row => {
    if (!row.length) return null;
    return row[0].date;
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

  renderCell = entry => {
    const { readOnly } = this.props;

    let backgroundColor = "#f8f8f8";
    const project = this.data.projectLookup[entry.project_id];
    let projectName = project && project.name;
    if (projectName) projectName = truncString(projectName);

    // background color priority: from project > from probability > white
    if (entry.probability_id) {
      const probability = this.data.probabilityLookup[entry.probability_id];
      ({ backgroundColor } = probability);
    }

    if (project && project.backgroundColour) {
      backgroundColor = project.backgroundColour;
    }

    if (readOnly) {
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
      <TouchableView
        onPress={() =>
          this.loadRosterEntries(
            addWeeks(this.state.startDate, -10),
            this.state.startDate,
            true
          )
        }
      >
        <Text>load previous</Text>
      </TouchableView>
    </ButtonRow>
  );

  afterSubmit = async () => {
    // Reload entries
    await this.setState({ weeklyEntries: [] }, () =>
      this.loadRosterEntries(this.state.startDate, this.state.endDate)
    );

    if (typeof this.props.onUpdate === "function") this.props.onUpdate();
    this.closeEntryForm();
  };

  render() {
    const { consultant, weeklyEntries, firstLoaded, entryForm } = this.state;
    if (!(consultant && firstLoaded)) {
      return <ActivityIndicator style={{ flex: 1 }} />;
    }

    return (
      <Container>
        {entryForm.show && (
          <RosterEntryForm
            $models={this.props.$models}
            operatorName={this.props.$global.currentUser.name}
            title={entryForm.title}
            onClose={this.closeEntryForm}
            consultant={consultant}
            projectOptions={this.data.projectOptions}
            probabilityOptions={this.data.probabilityOptions}
            leaveProjectIds={this.data.leaveProjects.map(p => p.id)}
            dateToExistingEntryMap={entryForm.dateToExistingEntryMap}
            afterSubmit={this.afterSubmit}
            initialValues={entryForm.initialValues}
          />
        )}
        <HeaderRow>
          {weekdays.map(date => (
            <HeaderCell key={date}>{date}</HeaderCell>
          ))}
        </HeaderRow>
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
  padding-right: 20px;
  background-color: white;
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

const ButtonCell = styled(TouchableView)`
  ${cellStyle} border: 1px solid #eee;
  background-color: ${props => props.backgroundColor};
`;

const TextCell = styled(View)`
  ${cellStyle} border: 1px solid #eee;
  background-color: ${props => props.backgroundColor};
`;

const CellText = styled(Text)`
  font-size: 12px;
`;
