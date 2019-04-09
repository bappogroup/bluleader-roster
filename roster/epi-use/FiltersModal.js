import React from "react";
import {
  SelectField,
  DatePickerField,
  SwitchField,
  ModalForm,
  Form
} from "bappo-components";

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

const toOptions = arr => arr.map(i => ({ label: i.name, value: i.id }));

class FiltersModal extends React.Component {
  state = {
    costCenters: [],
    loading: true
  };

  async componentDidMount() {
    const { $models } = this.props;

    const costCenters = await $models.CostCenter.findAll({});
    this.setState({
      costCenters,
      loading: false
    });
  }

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
        <Form.Field
          name="costCenter_id"
          label="Cost Center"
          component={SelectField}
          props={{
            isLoading: this.state.loading,
            options: toOptions(this.state.costCenters)
          }}
        />
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
        <Form.Field
          name="startDate"
          label="From"
          component={DatePickerField}
          validate={value => (value ? undefined : "Required")}
        />
        <Form.Field
          name="weeks"
          label="Date Range"
          component={SelectField}
          props={{
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
        <Form.Field
          name="includeCrossTeamConsultants"
          label="Include cross-team consultants"
          component={SwitchField}
        />
      </ModalForm>
    );
  }
}

export default FiltersModal;
