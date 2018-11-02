import React from "react";
import { View, Text, styled, ActivityIndicator } from "bappo-components";
import BappoTable from "./table";
import HybridButton from "hybrid-button";
import formatNumber from "./formatNumber";

class MainReport extends React.Component {
  renderCell = (data, params) => {
    const { key, elementKey, index } = params;

    const month = this.props.months[index];
    let component;
    const otherParams = {};

    if (!elementKey) {
      // Totals
      return (
        <TotalCell key={key}>
          <Text>{formatNumber(data)}</Text>
        </TotalCell>
      );
    }

    switch (elementKey) {
      case "SAL":
      case "BON":
      case "PTAXP":
      case "LPROV":
      case "LEA":
      case "PJE":
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
        component = "DrilldownConsultants";
        break;
      case "TMREVC":
        component = "DrilldownContractors";
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
        <CellText>{formatNumber(data)}</CellText>
      </ButtonCell>
    );
  };

  render() {
    const { dataForTable } = this.props.mainReportData;
    if (!dataForTable) return <ActivityIndicator />;

    const data = addTotalCol(dataForTable);

    return (
      <Container>
        <BappoTable renderCell={this.renderCell} data={data} />
      </Container>
    );
  }
}

export default MainReport;

const addTotalCol = d => {
  let totalRevenue = 0;
  let totalNetProfit = 0;

  return d.map((row, index) => {
    if (index === 0) return [...row, "Total"];
    if (!row.data) return row;
    const { data, ...rest } = row;
    let total = data.slice(1).reduce((t, v) => t + Number(v), 0.0);
    if (data[0] === "Total Revenue") totalRevenue = total;
    if (data[0] === "Net Profit") totalNetProfit = total;
    if (data[0] === "Net Profit %")
      total = (totalNetProfit / totalRevenue) * 100;
    return { ...rest, data: [...data, total] };
  });
};

const Container = styled(View)`
  flex: 1;
`;

const Cell = styled(View)`
  justify-content: center;
  align-items: flex-end;
  width: 150px;
  flex-shrink: 1;
  flex-grow: none;
`;

const TotalCell = styled(View)`
  justify-content: center;
  align-items: flex-end;
  padding-right: 10px;
  width: 150px;
  flex-shrink: 1;
  flex-grow: none;
`;

const CellText = styled(Text)`
  color: #aae;
`;

const ButtonCell = styled(HybridButton)`
  justify-content: center;
  align-items: flex-end;
  padding-right: 10px;
  width: 150px;
  flex-shrink: 1;
  flex-grow: none;
`;

const FixedCell = styled(View)`
  justify-content: center;
  align-items: flex-begin;
  flex: none;
  width: 150px;
  padding-left: 30px;
`;

// const LabelText = styled(Text)`
//   color: #cce;
// `;
