import React from "react";
import moment from "moment";
import {
  ModalForm,
  Form,
  TextField,
  SelectField,
  DatePickerField,
  SwitchField
} from "bappo-components";

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
      isLeaveProject,
      NAProbabilityValue
    };
  }

  onSubmit = rawValues => {
    const values = { ...rawValues };
    if (this.state.isLeaveProject) values.shouldOverrideLeaves = true;
    return this.props.onSubmit(values);
  };

  render() {
    const {
      title = "Manage Roster",
      projectOptions = [],
      probabilityOptions,
      onClose,
      initialValues,
      leaveProjectIds
    } = this.props;

    return (
      <ModalForm
        title={title}
        onRequestClose={onClose}
        onSubmit={this.onSubmit}
        visible={true}
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
                <Form.Field name="monday" label="Mon" component={SwitchField} />
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
                <Form.Field name="friday" label="Fri" component={SwitchField} />
              )}
              {showWeekdays[6] && (
                <Form.Field
                  name="saturday"
                  label="Sat"
                  component={SwitchField}
                />
              )}
              {showWeekdays[0] && (
                <Form.Field name="sunday" label="Sun" component={SwitchField} />
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
                  <Form.Field
                    name="shouldOverrideLeaves"
                    label="Overwrites Leave"
                    component={SwitchField}
                  />
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
            </React.Fragment>
          );
        }}
      </ModalForm>
    );
  }
}

export default RosterEntryForm;
