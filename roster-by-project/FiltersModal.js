import React from "react";
import moment from "moment";
import {
  styled,
  Text,
  DatePickerField,
  ModalForm,
  Form
} from "bappo-components";

function FiltersModal({ onClose, onSubmit, initialValues }) {
  return (
    <ModalForm
      visible
      title="Set Filters"
      submitButtonText="Set"
      onRequestClose={onClose}
      onSubmit={onSubmit}
      initialValues={initialValues}
    >
      <Form.Field
        name="startDate"
        label="Start Date"
        component={DatePickerField}
      />
      <Form.Field
        name="endDate"
        label="End Date"
        validate={(endDate, { startDate }) => {
          const daysDiff = moment(endDate).diff(moment(startDate), "days");
          if (daysDiff < 0) return "End Date must be same or after Start Date.";
          if (daysDiff > 730) return "Maximum date range is 2 years.";
        }}
        component={DatePickerField}
      />

      <Caption>
        You can leave Start Date and End Date empty to show all bookings for
        selected project(s).
      </Caption>
    </ModalForm>
  );
}

export default FiltersModal;

const Caption = styled(Text)`
  font-size: 12px;
  color: gray;
`;
