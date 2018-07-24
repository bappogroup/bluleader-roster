import React from "react";
import {
  View,
  Text,
  styled,
  Button,
  ActivityIndicator
} from "bappo-components";
import BappoTable from "bappo-table";

class MainReport extends React.Component {
  renderCell = (data, params) => {
    const { key, elementKey, index } = params;

    const month = this.props.months[index];
    let component;
    const otherParams = {};

    if (!elementKey) {
      // Totals
      return (
        <Cell key={key}>
          <Text>{data}</Text>
        </Cell>
      );
    }

    switch (elementKey) {
      case "SAL":
      case "BON":
      case "PTAXP":
      case "LPROV":
      case "LEA":
        component = "DrilldownConsultants";
        break;
      case "PTAXC":
      case "CWAGES":
        component = "DrilldownContractors";
        break;
      case "FIXREV":
      case "FIXEXP":
        component = "DrilldownProjectFixedPrice";
        break;
      case "TMREV":
        component = "DrilldownProjectTm";
        break;
      default:
        component = "DrilldownPlain";
        otherParams.elementKey = elementKey;
    }

    return (
      <ButtonCell
        key={key}
        onPress={() =>
          this.props.openReport({
            name: `${month.label}`,
            component,
            params: { month, ...otherParams }
          })
        }
      >
        <Text>{data}</Text>
      </ButtonCell>
    );
  };

  render() {
    const { dataForTable } = this.props.mainReportData;
    if (!dataForTable) return <ActivityIndicator />;

    return (
      <Container>
        <BappoTable renderCell={this.renderCell} data={dataForTable} />
      </Container>
    );
  }
}

export default MainReport;

const Container = styled(View)`
  flex: 1;
`;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: 1;
`;

const ButtonCell = styled(Button)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;
