import React from "react";
import {
  Button,
  Heading,
  View,
  Paragraph,
  SelectField,
  DatePicker,
  styled
} from "bappo-components";
import { leaveTypes } from "./constants";

class LeaveInput extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      projectType: null,
      dateFrom: null,
      dateTo: null,
      selectedConsultants: []
    };
  }

  componentDidMount() {}

  render() {
    return (
      <View>
        <DatePicker />
        <Button
          type="primary"
          text="Submit"
          onPress={() => console.log(this.state)}
        >
          Submit
        </Button>
      </View>
    );
  }
}

export default LeaveInput;

const Row = styled(View)``;
