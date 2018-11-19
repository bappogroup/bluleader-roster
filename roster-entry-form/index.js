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
      submitValues: {}
    };
  }

  renderFilterForm = () => {
    const {
      projectOptions = [],
      probabilityOptions,
      initialValues,
      leaveProjectIds
    } = this.props;

    const _initialValues = Object.assign(
      {},
      initialValues,
      this.state.submitValues
    );

    return (
      <Form
        style={{ flex: 1 }}
        initialValues={_initialValues}
        onSubmit={submitValues => this.setState({ submitValues, step: 2 })}
      >
        {({ getFieldValue, actions: { changeValue } }) => {
          const startDate = getFieldValue("startDate");
          const project_id = getFieldValue("project_id");

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
                      if (!id) {
                        // to remove entries
                        changeValue(
                          "probability_id",
                          this.state.NAProbabilityValue
                        );
                      } else if (leaveProjectIds.includes(id)) {
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
                {project_id && !this.state.isLeaveProject && (
                  <Form.Field
                    name="probability_id"
                    label="Probability"
                    component={SelectField}
                    props={{ options: probabilityOptions }}
                    validate={value => (value ? undefined : "Required")}
                  />
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
      <MiniPreview
        $models={this.props.$models}
        projectOptions={this.props.projectOptions}
        operatorName={this.props.operatorName}
        formValues={submitValues}
        consultant={this.props.consultant}
        leaveProjectIds={this.props.leaveProjectIds}
        dateToExistingEntryMap={this.props.dateToExistingEntryMap}
        goBack={() => this.setState({ step: 1 })}
        afterSubmit={this.props.afterSubmit}
      />
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
        const { project_id, startDate, endDate } = this.state.submitValues;
        if (project_id) {
          // add/update entries
          const selectedProject = this.props.projectOptions.find(
            p => p.value === this.state.submitValues.project_id
          );
          title = `${this.props.consultant.name} will be booked for ${
            selectedProject.label
          }, on these days:`;
        } else {
          // remove entries
          title = `Removing schedules for ${
            this.props.consultant.name
          }, on these days:`;
        }

        if (startDate === endDate) title = "Manage Roster";
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
