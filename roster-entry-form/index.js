import React from "react";
import moment from "moment";
import {
  styled,
  Colors,
  Modal,
  Form,
  // TextField,
  SelectField,
  ScrollView,
  DatePickerField,
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
      props.initialValues && props.initialValues.project_id
    );
    const NAProbabilityValue = props.probabilityOptions.find(
      p => p.label === "NA"
    ).value;

    this.state = {
      step: props.step || 1,
      isLeaveProject,
      NAProbabilityValue,
      submitValues: props.initialValues
    };
  }

  renderFilterForm = () => {
    const {
      consultantOptions,
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
                {consultantOptions && (
                  <Form.Field
                    name="consultant_id"
                    label="Consultant"
                    component={SelectField}
                    props={{ options: consultantOptions }}
                    validate={value => (value ? undefined : "Required")}
                  />
                )}
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
                        changeValue("probability_id", null);
                      }
                    }
                  }}
                />
                <Form.Field
                  name="startDate"
                  label="From"
                  component={DatePickerField}
                />
                {startDate && (
                  <Form.Field
                    name="endDate"
                    label="Until"
                    component={DatePickerField}
                    validate={endDate =>
                      moment(endDate).isSameOrAfter(moment(startDate))
                        ? undefined
                        : "Invalid date range"
                    }
                  />
                )}

                {project_id && !this.state.isLeaveProject && (
                  <Form.Field
                    name="probability_id"
                    label="Probability"
                    component={SelectField}
                    props={{ options: probabilityOptions }}
                    validate={value => (value ? undefined : "Required")}
                  />
                )}
                {/* <Form.Field
                  name="comment"
                  label="Comment"
                  component={TextField}
                  props={{
                    multiline: true
                  }}
                /> */}
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

  renderPreview = () => (
    <MiniPreview
      $models={this.props.$models}
      currentUser={this.props.currentUser}
      projectOptions={this.props.projectOptions}
      formValues={this.state.submitValues}
      consultant={this.props.consultant}
      leaveProjectIds={this.props.leaveProjectIds}
      dateToExistingEntryMap={this.props.dateToExistingEntryMap}
      goBack={() => this.setState({ step: 1 })}
      onClose={this.props.onClose}
      onSubmit={this.props.onSubmit}
      afterSubmit={this.props.afterSubmit}
      preventDefaultSubmit={this.props.preventDefaultSubmit}
      includedDates={
        this.props.initialValues && this.props.initialValues.includedDates
      }
    />
  );

  render() {
    let body;
    let title;

    switch (this.state.step) {
      case 1:
        body = this.renderFilterForm();
        title = this.props.title || "Manage Roster";
        break;
      case 2:
        let consultantName =
          this.props.consultant && this.props.consultant.name;
        if (!consultantName) {
          consultantName = this.props.consultantOptions.find(
            c => c.value === this.state.submitValues.consultant_id
          ).label;
        }
        body = this.renderPreview();
        const { project_id, startDate, endDate } = this.state.submitValues;
        if (project_id) {
          // add/update entries
          const selectedProject = this.props.projectOptions.find(
            p => p.value === this.state.submitValues.project_id
          );
          title = `${consultantName} for ${
            selectedProject.label
          }, on these days:`;
        } else {
          // remove entries
          title = `Removing schedules for ${consultantName}, on these days:`;
        }

        if (startDate === endDate) title = "Manage Roster";
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

export default RosterEntryForm;

const HeadingContainer = styled(View)`
  padding: 16px;
  align-items: center;
  justify-content: center;
`;

const Heading = styled(Text)`
  font-size: 18px;
`;

const FormFieldsContainer = styled(ScrollView)`
  flex: 1;
  padding: 0 32px;
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
