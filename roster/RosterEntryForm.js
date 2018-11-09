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

const RosterEntryForm = ({
  title = "Manage Roster",
  projectOptions = [],
  probabilityOptions,
  onClose,
  onSubmit,
  initialValues
}) => {
  return (
    <ModalForm
      title={title}
      onRequestClose={onClose}
      onSubmit={onSubmit}
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
      {({ getFieldValue }) => {
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
              props={{ options: projectOptions }}
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
              <Form.Field name="tuesday" label="Tue" component={SwitchField} />
            )}
            {showWeekdays[3] && (
              <Form.Field
                name="wednesday"
                label="Wed"
                component={SwitchField}
              />
            )}
            {showWeekdays[4] && (
              <Form.Field name="thursday" label="Thu" component={SwitchField} />
            )}
            {showWeekdays[5] && (
              <Form.Field name="friday" label="Fri" component={SwitchField} />
            )}
            {showWeekdays[6] && (
              <Form.Field name="saturday" label="Sat" component={SwitchField} />
            )}
            {showWeekdays[0] && (
              <Form.Field name="sunday" label="Sun" component={SwitchField} />
            )}
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
};

export default RosterEntryForm;
