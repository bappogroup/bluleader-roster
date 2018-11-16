import React from "react";
import moment from "moment";
import {
  styled,
  Colors,
  Modal,
  Form,
  TextField,
  SelectField,
  DatePickerField,
  SwitchField,
  ScrollView,
  View,
  Text,
  Button,
  Separator
} from "bappo-components";
import MiniPreview from "./MiniPreview";

class RosterEntryForm extends React.Component {
  constructor(props) {
    super(props);
    const isLeaveProject = props.leaveProjectIds.includes(
      props.initialValues.project_id
    );
    const NAProbabilityValue = props.probabilityOptions.find(
      p => p.label === "NA"
    ).value;

    this.state = {
      step: 1,
      isLeaveProject,
      NAProbabilityValue,
      submitting: false,
      submitValues: {}
    };
  }

  submit = () => {
    this.setState({ submitting: true });
    const values = { ...this.state.submitValues };
    if (this.state.isLeaveProject) values.shouldOverrideLeaves = true;
    return this.props.onSubmit(values).then(() => this.props.onClose());
  };

  renderFilterForm = () => {
    const {
      projectOptions = [],
      probabilityOptions,
      initialValues,
      leaveProjectIds
    } = this.props;

    return (
      <Form
        style={{ flex: 1 }}
        initialValues={{
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
          ...initialValues
        }}
        onSubmit={submitValues => this.setState({ submitValues, step: 2 })}
      >
        {({ getFieldValue, actions: { changeValue } }) => {
          const startDate = getFieldValue("startDate");
          const endDate = getFieldValue("endDate");
          const showWeekdays = new Array(7).fill(false);

          if (startDate && endDate) {
            const start = moment(startDate);
            const end = moment(endDate);
            let day = start.clone();

            // Loop the duration to check which weekdays are included
            for (let i = 1; i < 8 && day.isSameOrBefore(end); i++) {
              showWeekdays[day.weekday()] = true;
              day = start.clone().add(i, "days");
            }
          }

          return (
            <React.Fragment>
              <FormFieldsContainer>
                <Form.Field
                  name="project_id"
                  label="Project"
                  component={SelectField}
                  props={{
                    options: projectOptions,
                    onValueChange: id => {
                      if (leaveProjectIds.includes(id)) {
                        this.setState({ isLeaveProject: true });
                        // Set probability to NA for leave projects
                        changeValue(
                          "probability_id",
                          this.state.NAProbabilityValue
                        );
                      } else {
                        this.setState({ isLeaveProject: false });
                      }
                    }
                  }}
                />
                <Form.Field
                  name="startDate"
                  label="From"
                  component={DatePickerField}
                />
                <Form.Field
                  name="endDate"
                  label="Until"
                  component={DatePickerField}
                  validate={end =>
                    moment(end).isSameOrAfter(moment(startDate))
                      ? undefined
                      : "Invalid date range"
                  }
                />
                {showWeekdays[1] && (
                  <Form.Field
                    name="monday"
                    label="Mon"
                    component={SwitchField}
                  />
                )}
                {showWeekdays[2] && (
                  <Form.Field
                    name="tuesday"
                    label="Tue"
                    component={SwitchField}
                  />
                )}
                {showWeekdays[3] && (
                  <Form.Field
                    name="wednesday"
                    label="Wed"
                    component={SwitchField}
                  />
                )}
                {showWeekdays[4] && (
                  <Form.Field
                    name="thursday"
                    label="Thu"
                    component={SwitchField}
                  />
                )}
                {showWeekdays[5] && (
                  <Form.Field
                    name="friday"
                    label="Fri"
                    component={SwitchField}
                  />
                )}
                {showWeekdays[6] && (
                  <Form.Field
                    name="saturday"
                    label="Sat"
                    component={SwitchField}
                  />
                )}
                {showWeekdays[0] && (
                  <Form.Field
                    name="sunday"
                    label="Sun"
                    component={SwitchField}
                  />
                )}
                {!this.state.isLeaveProject && (
                  <React.Fragment>
                    <Form.Field
                      name="probability_id"
                      label="Probability"
                      component={SelectField}
                      props={{ options: probabilityOptions }}
                      validate={value => (value ? undefined : "Required")}
                    />
                    {/* <Form.Field
                    name="shouldOverrideLeaves"
                    label="Overwrites Leave"
                    component={SwitchField}
                  /> */}
                  </React.Fragment>
                )}
                <Form.Field
                  name="comment"
                  label="Comment"
                  component={TextField}
                  props={{
                    multiline: true
                  }}
                />
              </FormFieldsContainer>

              <ButtonGroup>
                <Button
                  text="Cancel"
                  type="tertiary"
                  onPress={this.props.onClose}
                />
                <SubmitButton>
                  <Text style={{ color: Colors.BLUE }}>Preview</Text>
                </SubmitButton>
              </ButtonGroup>
            </React.Fragment>
          );
        }}
      </Form>
    );
  };

  renderPreview = () => {
    const { submitValues } = this.state;

    return (
      <View style={{ flex: 1 }}>
        <MiniPreview
          formValues={submitValues}
          consultant={this.props.consultant}
          leaveProjectIds={this.props.leaveProjectIds}
          dateToExistingEntryMap={this.props.dateToExistingEntryMap}
          onClickDate={date => console.log("update date", date)}
        />
        <ButtonGroup style={{ marginTop: 16 }}>
          <Button
            type="secondary"
            text="Back"
            onPress={() => this.setState({ step: 1 })}
          />
          <Button
            style={{ marginLeft: 16 }}
            type="primary"
            text="Submit"
            onPress={this.submit}
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
        body = this.renderFilterForm();
        title = "Manage Roster";
        break;
      case 2:
        body = this.renderPreview();
        const selectedProject = this.props.projectOptions.find(
          p => p.value === this.state.submitValues.project_id
        );
        title = `${this.props.consultant.name} will do ${
          selectedProject.label
        }, on these days:`;
        break;
      default:
    }

    return (
      <Modal visible onRequestClose={this.props.onClose}>
        <HeadingContainer>
          <Heading>{title}</Heading>
        </HeadingContainer>
        <Separator style={{ marginTop: 0 }} />
        {body}
      </Modal>
    );
  }
}

export default RosterEntryForm;

// background-color: rgb(241, 241, 240);

const HeadingContainer = styled(View)`
  padding: 16px;
  align-items: center;
  justify-content: center;
`;

const FormFieldsContainer = styled(ScrollView)`
  flex: 1;
  padding: 16px 32px;
`;

const Heading = styled(Text)`
  font-size: 18px;
`;

const ButtonGroup = styled(View)`
  background-color: rgb(241, 241, 240);
  padding: 16px 32px;
  align-items: center;
  flex-direction: row;
  justify-content: flex-end;
`;

const SubmitButton = styled(Form.SubmitButton)`
  margin-left: 4px;
`;
