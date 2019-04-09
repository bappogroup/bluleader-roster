import React from "react";
import {
  styled,
  Form,
  Colors,
  Text,
  SelectField,
  DatePickerField,
  ScrollView,
  View,
  Button
} from "bappo-components";

class MassUpdateDetailsForm extends React.Component {
  state = {
    NAProbabilityId: null,
    projectOptions: [],
    startDate: undefined,
    endDate: undefined,
    isLeaveProject: true
  };

  data = {
    leaveProjects: []
  };

  async componentDidMount() {
    const { $models, preloadedData } = this.props;
    const { projects, probabilityOptions } = preloadedData;

    const stateField = $models.Consultant.fields.find(f => f.name === "state");

    const leaveProjects = projects.filter(p =>
      ["4", "5", "6"].includes(p.projectType)
    );

    this.data.leaveProjects = leaveProjects;

    const NAProbabilityId = probabilityOptions.find(p => p.label === "NA")
      .value;

    this.setState({
      projectOptions: projects.map(pj => ({ label: pj.name, value: pj.id })),
      probabilityOptions,
      locationOptions: stateField.properties.options.map(op => ({
        value: op.id,
        label: op.label
      })),
      NAProbabilityId
    });
  }

  render() {
    return (
      <Form
        style={{ flex: 1 }}
        onSubmit={this.props.onSubmit}
        initialValues={{
          probability_id: this.state.NAProbabilityId
        }}
      >
        {({ getFieldValue, actions: { changeValue } }) => {
          const project_id = getFieldValue("project_id");

          return (
            <React.Fragment>
              <FormFieldsContainer>
                <Form.Field
                  name="project_id"
                  label="Project"
                  component={SelectField}
                  props={{
                    options: this.state.projectOptions,
                    onValueChange: project_id => {
                      const project = this.state.projectOptions.find(
                        op => op.value === project_id
                      );
                      this.props.setProjectName(project && project.label);

                      if (!project_id) {
                        // to remove entries
                        changeValue("probability_id", null);
                      } else if (
                        this.data.leaveProjects.find(p => p.id === project_id)
                      ) {
                        // leave projects
                        this.setState({ isLeaveProject: true });
                        // Set probability to NA for leave projects
                        changeValue(
                          "probability_id",
                          this.state.NAProbabilityId
                        );
                      } else {
                        // normal prjects
                        this.setState({ isLeaveProject: false });
                        changeValue("probability_id", null);
                      }
                    }
                  }}
                />
                {project_id && !this.state.isLeaveProject && (
                  <Form.Field
                    name="probability_id"
                    label="Probability"
                    component={SelectField}
                    props={{
                      options: this.state.probabilityOptions
                    }}
                  />
                )}
                <Form.Field
                  name="startDate"
                  label="From"
                  component={DatePickerField}
                  validate={value => (value ? undefined : "Required")}
                />
                <Form.Field
                  name="endDate"
                  label="Until"
                  component={DatePickerField}
                  validate={value => (value ? undefined : "Required")}
                />
                <Form.Field
                  name="state"
                  label="Location"
                  component={SelectField}
                  props={{ options: this.state.locationOptions }}
                />
              </FormFieldsContainer>
              <ButtonGroup>
                <Button
                  text="Cancel"
                  type="tertiary"
                  onPress={this.props.onClose}
                />
                <SubmitButton>
                  <Text style={{ color: Colors.BLUE }}>Next</Text>
                </SubmitButton>
              </ButtonGroup>
            </React.Fragment>
          );
        }}
      </Form>
    );
  }
}

export default MassUpdateDetailsForm;

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
  margin-left: 8px;
`;
