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

  async componentDidMount() {
    const rosterEntries = await this.props.$models.RosterEntry.findAll({
      where: {
        $or: [
          {
            consultant_id: {
              $in: ["6275"]
            }
          },
          {
            project_id: {
              $in: ["489", "487"]
            }
          }
        ]
        // date: {
        //   $between: ["2018-08-01", "2018-08-30"]
        // }
      }
    });

    console.log(rosterEntries);
  }

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
