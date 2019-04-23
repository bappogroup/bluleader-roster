import React from "react";
import {
  styled,
  Text,
  SelectField,
  DatePickerField,
  SwitchField,
  ModalForm,
  Form
} from "bappo-components";

const filterByOptions = [
  {
    value: "none",
    label: "None (All Consultants)"
  },
  {
    value: "costCenter",
    label: "Cost Center"
  },
  {
    value: "project",
    label: "Project"
  }
];

const dateRangeOptions = [
  {
    value: "6",
    label: "6 weeks"
  },
  {
    value: "12",
    label: "12 weeks"
  },
  {
    value: "24",
    label: "24 weeks"
  },
  {
    value: "52",
    label: "52 weeks"
  }
];

const consultantTypeOptions = [
  {
    value: "1",
    label: "Permanent"
  },
  {
    value: "2",
    label: "Contractor"
  },
  {
    value: "3",
    label: "Casual"
  }
];

// Workaround - decide which app by appId from pathname
// Only show location to epi-use
const isEpiUse = [
  "5b831cd1a7de8a09c5138eea",
  "5c9c44715e0de00010860040"
].includes(window.location.pathname.split("/")[2]);

const toOptions = arr => arr.map(i => ({ label: i.name, value: i.id }));

class FiltersModal extends React.Component {
  state = {
    costCenters: [],
    projects: [],
    loadingCostCenters: true,
    loadingProjects: false
  };

  async componentDidMount() {
    const { $models, initialValues } = this.props;

    const costCenters = await $models.CostCenter.findAll({});
    this.setState({
      costCenters,
      loadingCostCenters: false
    });

    if (initialValues.filterBy === "project") await this.fetchProjects();
  }

  fetchProjects = async () => {
    // Fetch all projects
    this.setState({ loadingProjects: true });
    const projects = await this.props.$models.Project.findAll({
      where: { active: true }
    });
    this.setState({ projects, loadingProjects: false });
  };

  render() {
    return (
      <ModalForm
        visible
        title="Set Filters"
        submitButtonText="Set"
        onRequestClose={this.props.onClose}
        onSubmit={this.props.onSubmit}
        initialValues={this.props.initialValues}
      >
        {({ getFieldValue, actions: { changeValue } }) => {
          const filterBy = getFieldValue("filterBy");
          const costCenter_id = getFieldValue("costCenter_id");

          return (
            <React.Fragment>
              <Form.Field
                name="filterBy"
                label="Filter By"
                component={SelectField}
                props={{
                  clearable: false,
                  options: filterByOptions,
                  onValueChange: async filterBy => {
                    switch (filterBy) {
                      case "project": {
                        changeValue("costCenter_id", null);
                        if (this.state.projects.length === 0)
                          this.fetchProjects();
                        break;
                      }
                      case "none": {
                        changeValue("costCenter_id", null);
                        changeValue("project_id", null);
                        break;
                      }
                      case "costCenter": {
                        changeValue("project_id", null);
                        break;
                      }
                      default:
                    }
                  }
                }}
              />
              {filterBy === "costCenter" && (
                <React.Fragment>
                  <Form.Field
                    name="costCenter_id"
                    label="Cost Center"
                    component={SelectField}
                    props={{
                      isLoading: this.state.loadingCostCenters,
                      options: toOptions(this.state.costCenters)
                    }}
                  />
                  {costCenter_id && !isEpiUse && (
                    <Form.Field
                      name="includeCrossTeamConsultants"
                      label="Include cross-team consultants"
                      component={SwitchField}
                    />
                  )}
                </React.Fragment>
              )}
              {filterBy === "project" && (
                <Form.Field
                  name="project_id"
                  label="Project"
                  component={SelectField}
                  props={{
                    isLoading: this.state.loadingProjects,
                    options: toOptions(this.state.projects)
                  }}
                />
              )}

              {isEpiUse && (
                <Form.Field
                  name="state"
                  label="Location"
                  component={SelectField}
                  props={{
                    options: this.props.$models.Consultant.fields
                      .find(f => f.name === "state")
                      .properties.options.map(l => ({
                        value: l.id,
                        label: l.label
                      }))
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
                name="weeks"
                label="Date Range"
                validate={value => (value ? undefined : "Required")}
                component={SelectField}
                props={{
                  clearable: false,
                  options: dateRangeOptions
                }}
              />
              <Form.Field
                name="consultantType"
                label="Consultant Type"
                component={SelectField}
                props={{
                  options: consultantTypeOptions
                }}
              />

              <Caption>
                Cost Center, Project and Consultant Type can be left blank to
                fetch all
              </Caption>
            </React.Fragment>
          );
        }}
      </ModalForm>
    );
  }
}

export default FiltersModal;

const Caption = styled(Text)`
  font-size: 12px;
  color: gray;
`;
