import React from "react";
import {
  styled,
  View,
  Text,
  Button,
  Icon,
  Modal,
  Separator,
  TouchableView,
  ScrollView
} from "bappo-components";
import moment from "moment";
import update from "immutability-helper";
import MassUpdateDetailsForm from "./MassUpdateDetailsForm";

const dateFormat = "YYYY-MM-DD";

class MassUpdateModal extends React.Component {
  /**
   * Tri-step form:
   * 1. Select project, date, location etc
   * 2. Select consultants
   * 3. Show summary
   */
  state = {
    step: 1,
    project_id: undefined,
    projectName: undefined,
    probability_id: undefined,
    startDate: undefined,
    endDate: undefined,
    state: undefined,
    consultants: [],
    consultantsInThisState: [],
    consultantMap: {}, // id-to-bool
    submitting: false
  };

  async componentDidMount() {
    const consultants = (await this.props.$models.Consultant.findAll({
      where: {
        active: true
      }
    })).sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    this.setState({ consultants });
  }

  /**
   * Bulk created roster entries
   */
  handleSubmit = async () => {
    const {
      startDate,
      endDate,
      consultantMap,
      project_id,
      probability_id
    } = this.state;
    const { $models } = this.props;

    const selectedConsultantIds = [];
    const selectedDates = [];

    Object.entries(consultantMap).forEach(
      ([consultant_id, selected]) =>
        selected && selectedConsultantIds.push(consultant_id)
    );

    const rosterEntries = [];
    const end = moment(endDate);
    for (
      let d = moment(startDate).clone();
      d.isSameOrBefore(end);
      d.add(1, "day")
    ) {
      // Pick weekdays only
      if ([1, 2, 3, 4, 5].includes(d.weekday())) {
        const date = d.format(dateFormat);
        selectedDates.push(date);
      }
    }

    if (selectedConsultantIds.length > 0 && selectedDates.length > 0) {
      this.setState({ submitting: true });

      // 1. Remove existing entries
      await $models.RosterEntry.destroy({
        where: {
          consultant_id: {
            $in: selectedConsultantIds
          },
          date: {
            $in: selectedDates
          }
        }
      });

      if (project_id) {
        // 2. Create new entries
        // Generate new roster entries
        selectedDates.forEach(date =>
          selectedConsultantIds.forEach(consultant_id =>
            rosterEntries.push({
              consultant_id,
              date,
              probability_id,
              project_id
            })
          )
        );
        await $models.RosterEntry.bulkCreate(rosterEntries);
      }
      // 3. Create Roster Change logs
      $models.RosterChange.create({
        changedBy: this.props.$global.currentUser.name,
        changeDate: moment().format(dateFormat),
        startDate,
        endDate,
        project_id,
        probability_id,
        includedDates: selectedDates.join(", "),
        includedConsultantIds: selectedConsultantIds.join(", ")
      });

      if (typeof this.props.afterSubmit) await this.props.afterSubmit();
    }

    this.props.onClose();
  };

  renderConsultants = () => {
    const { consultantsInThisState } = this.state;

    if (!consultantsInThisState.length)
      return (
        <View style={{ flex: 1, padding: 32 }}>
          <Text>No consultant found.</Text>
          <Button text="Cancel" type="tertiary" onPress={this.props.onClose} />
        </View>
      );

    return (
      <View style={{ flex: 1 }}>
        <ConsultantButtonGroup>
          <Button
            text="Select All"
            type="tertiary"
            onPress={() => {
              const consultantMap = {};
              consultantsInThisState.forEach(c => (consultantMap[c.id] = true));
              this.setState({ consultantMap });
            }}
            style={{ marginRight: 8 }}
          />
          <Button
            text="Clear"
            type="tertiary"
            onPress={() => this.setState({ consultantMap: {} })}
          />
        </ConsultantButtonGroup>
        <ContentContainer>
          {consultantsInThisState.map(consultant => (
            <ConsultantRow
              onPress={() =>
                this.setState(
                  update(this.state, {
                    consultantMap: {
                      [consultant.id]: {
                        $apply: function(x) {
                          return !x;
                        }
                      }
                    }
                  })
                )
              }
            >
              <Icon
                name={
                  this.state.consultantMap[consultant.id]
                    ? "check-box"
                    : "check-box-outline-blank"
                }
                style={{ marginRight: 16 }}
              />
              <Text>{consultant.name}</Text>
            </ConsultantRow>
          ))}
        </ContentContainer>
        <ButtonGroup>
          <Button
            text="Cancel"
            type="tertiary"
            onPress={this.props.onClose}
            style={{ marginRight: 8 }}
          />
          <Button
            text="Next"
            type="secondary"
            onPress={() => this.setState({ step: 3 })}
          />
        </ButtonGroup>
      </View>
    );
  };

  renderSummary = () => {
    const { consultantMap, projectName, startDate, endDate } = this.state;
    let consultantNames = "";
    Object.entries(consultantMap).forEach(([id, selected]) => {
      if (selected) {
        const newName = this.state.consultants.find(c => c.id === id).name;
        consultantNames = `${consultantNames}, ${newName}`;
      }
    });
    consultantNames = consultantNames.slice(2);
    return (
      <View style={{ flex: 1 }}>
        <ContentContainer>
          <Text>The following consultants:</Text>
          <View style={{ margin: "16px 0px" }}>
            <Text>{consultantNames}</Text>
          </View>
          {projectName ? (
            <Text>will be booked on {projectName}</Text>
          ) : (
            <Text>will have no schedule</Text>
          )}
          <Text>
            from {startDate} to {endDate}
          </Text>
          <Text />
        </ContentContainer>
        <ButtonGroup>
          <Button
            text="Cancel"
            type="tertiary"
            onPress={this.props.onClose}
            style={{ marginRight: 8 }}
          />
          <Button
            text="Submit"
            type="primary"
            onPress={this.handleSubmit}
            loading={this.state.submitting}
          />
        </ButtonGroup>
      </View>
    );
  };

  render() {
    let body;
    let title;

    switch (this.state.step) {
      case 1:
        title = "Mass Update";
        body = (
          <MassUpdateDetailsForm
            $models={this.props.$models}
            preloadedData={this.props.preloadedData}
            onSubmit={formValues => {
              // Filter consultants and select all
              const consultantsInThisState = formValues.state
                ? this.state.consultants.filter(
                    c => c.state === formValues.state
                  )
                : this.state.consultants;
              const consultantMap = {};
              consultantsInThisState.forEach(c => (consultantMap[c.id] = true));
              return this.setState({
                ...formValues,
                consultantMap,
                consultantsInThisState,
                step: 2
              });
            }}
            onClose={this.props.onClose}
            setProjectName={projectName => this.setState({ projectName })}
          />
        );
        break;
      case 2:
        title = "Select Consultants";
        body = this.renderConsultants();
        break;
      case 3:
        title = "Summary";
        body = this.renderSummary();
        break;
      default:
    }

    return (
      <Modal visible onRequestClose={() => {}}>
        <HeadingContainer>
          <Heading>{title}</Heading>
        </HeadingContainer>
        <Separator style={{ marginTop: 0 }} />
        {body}
      </Modal>
    );
  }
}

export default MassUpdateModal;

const HeadingContainer = styled(View)`
  padding: 16px;
  align-items: center;
  justify-content: center;
`;

const Heading = styled(Text)`
  font-size: 18px;
`;

const ContentContainer = styled(ScrollView)`
  flex: 1;
  padding: 8px 16px 16px 16px;
`;

const ConsultantRow = styled(TouchableView)`
  flex-direction: row;
  align-items: center;
  margin: 8px 0;
`;

const ButtonGroup = styled(View)`
  background-color: rgb(241, 241, 240);
  padding: 16px 32px;
  align-items: center;
  flex-direction: row;
  justify-content: flex-end;
`;

const ConsultantButtonGroup = styled(View)`
  padding: 8px 0;
  align-items: center;
  flex-direction: row;
  justify-content: flex-start;
`;
