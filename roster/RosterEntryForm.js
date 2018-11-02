import React from "react";
import { ModalForm, Form, DatePicker } from "bappo-components";

const RosterEntryForm = ({}) => {
  return (
    <ModalForm title="title">
      <Form.Field name="date" label="Date" component={DatePicker} />
    </ModalForm>
  );
};

export default RosterEntryForm;
