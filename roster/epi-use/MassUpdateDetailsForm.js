import React from "react";
import {
  styled,
  ActivityIndicator,
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
    publicHolidayId: null,
    NAProbabilityId: null,
    projectOptions: [],
    startDate: undefined,
    endDate: undefined,
    loading: true,
    isLeaveProject: true
  };

  data = {
    leaveProjects: []
  };

  async componentDidMount() {
    const { $models } = this.props;

    const stateField = $models.Consultant.fields.find(f => f.name === "state");
    const [projects, probabilities] = await Promise.all([
      $models.Project.findAll({
        where: {
          active: true
        }
      }),
      $models.Probability.findAll({})
    ]);

    const leaveProjects = projects.filter(p =>
      ["4", "5", "6"].includes(p.projectType)
    );

    this.data.leaveProjects = leaveProjects;

    const publicHolidayId = projects.find(pj => pj.name === "Public Holiday")
      .id;
    const NAProbabilityId = probabilities.find(p => p.name === "NA").id;

    this.props.setProjectName("Public Holiday");

    this.setState({
      projectOptions: projects.map(pj => ({ label: pj.name, value: pj.id })),
      probabilityOptions: probabilities.map(pr => ({
        label: pr.name,
        value: pr.id
      })),
      locationOptions: stateField.properties.options.map(op => ({
        value: op.id,
        label: op.label
      })),
      publicHolidayId,
      NAProbabilityId,
      loading: false
    });
  }

  render() {
    if (this.state.loading) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
      <Form
        style={{ flex: 1 }}
        onSubmit={this.props.onSubmit}
        initialValues={{
          project_id: this.state.publicHolidayId,
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
                      this.props.setProjectName(project.label);

                      if (
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
                        this.setState({ isLeaveProject: false });
                        changeValue("probability_id", null);
                      }
                    }
                  }}
                  validate={value => (value ? undefined : "Required")}
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
