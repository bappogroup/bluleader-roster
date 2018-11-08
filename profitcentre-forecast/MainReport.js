import React from "react";
import {
  View,
  Text,
  styled,
  ActivityIndicator,
  TouchableView
} from "bappo-components";
import BappoTable from "./table";
import { overheadElements } from "./profitcenter-utils";

class MainReport extends React.Component {
  constructor(props) {
    super(props);

    const { months } = props;
    const { cells } = props.mainReportData;

    // Calculate data for table
    const data = [];

    // Month row
    const monthRow = [""];
    months.forEach(month => monthRow.push(month.label));
    monthRow.push("Total");
    data.push(monthRow);

    // revenueElements.forEach(ele => {
    //   const row = {
    //     elementKey: ele,
    //     data: [ele]
    //   };
    //   months.forEach(month =>
    //     row.data.push(cells[`${ele}-${month.label}`].value)
    //   );
    //   data.push(row);
    // });

    // Project Reveue subtotal row
    const projectRevenueRow = {
      rowStyle: "data",
      data: ["Project Revenue"]
    };

    let totalRevenue = 0;
    months.forEach(month => {
      const value =
        cells[`T&M Project Revenue-${month.label}`].value +
        cells[`Fixed Price Project Revenue-${month.label}`].value;
      projectRevenueRow.data.push(value);
      totalRevenue += value;
    });
    projectRevenueRow.data.push(totalRevenue);
    data.push(projectRevenueRow);
    // data.push(blankRow);

    // cosElements.forEach(ele => {
    //   const row = {
    //     elementKey: ele,
    //     data: [ele]
    //   };
    //   months.forEach(month =>
    //     row.data.push(cells[`${ele}-${month.label}`].value)
    //   );
    //   data.push(row);
    // });

    // Project Cost subtotal row
    const projectCostRow = {
      rowStyle: "data",
      data: ["Project Costs"]
    };
    let totalProjectCost = 0.0;
    months.forEach(month => {
      const value =
        cells[`Fixed Price Costs-${month.label}`].value +
        cells[`Roster Costs-${month.label}`].value +
        cells[`Project Travel-${month.label}`].value;
      projectCostRow.data.push(value);
      totalProjectCost += value;
    });
    projectCostRow.data.push(totalProjectCost);
    data.push(projectCostRow);

    // Project margin row
    const projectMarginRow = {
      rowStyle: "total",
      data: ["Project Margin"]
    };
    let totalMargin = 0;
    months.forEach(month => {
      const value =
        cells[`T&M Project Revenue-${month.label}`].value +
        cells[`Fixed Price Project Revenue-${month.label}`].value -
        cells[`Roster Costs-${month.label}`].value -
        cells[`Project Travel-${month.label}`].value -
        cells[`Fixed Price Costs-${month.label}`].value;
      totalMargin += value;
      projectMarginRow.data.push(value);
    });

    projectMarginRow.data.push(totalMargin);
    data.push(projectMarginRow, blankRow);

    // peopleCostElements.forEach(ele => {
    //   const row = {
    //     elementKey: ele,
    //     data: [ele]
    //   };
    //   months.forEach(month =>
    //     row.data.push(cells[`${ele}-${month.label}`].value)
    //   );
    //   data.push(row);
    // });
    // costRecoveryElements.forEach(ele => {
    //   const row = {
    //     elementKey: ele,
    //     data: [ele]
    //   };
    //   months.forEach(month =>
    //     row.data.push(cells[`${ele}-${month.label}`].value)
    //   );
    //   data.push(row);
    // });

    const peopleCostRow = {
      rowStyle: "data",
      data: ["People Costs"]
    };
    const netProfitRow = {
      rowStyle: "total",
      data: ["Net Profit"]
    };

    const netProfitPercentageRow = {
      rowStyle: "info",
      data: ["Net Profit %"]
    };

    let totalNetProfit = 0;
    let totalPeopleCost = 0;

    months.forEach((month, index) => {
      const pcost =
        cells[`People Cost Recovery-${month.label}`].value +
        cells[`Consultant Cost(permanent)-${month.label}`].value +
        cells[`Contractor Wages-${month.label}`].value +
        cells[`Payroll Tax (contractors)-${month.label}`].value;

      const netProfit =
        projectMarginRow.data[index + 1] -
        pcost -
        cells[`Overheads-${month.label}`].value;
      totalNetProfit += netProfit;

      const revenue = projectRevenueRow.data[index + 1];
      const netProfitPercentage =
        netProfit > 0 ? (netProfit / revenue) * 100 : 0;

      peopleCostRow.data.push(pcost);
      totalPeopleCost += pcost;

      netProfitRow.data.push(netProfit);

      netProfitPercentageRow.data.push(netProfitPercentage);
    });

    peopleCostRow.data.push(totalPeopleCost);
    netProfitRow.data.push(totalNetProfit);

    const totalNetProfitPercentage =
      totalNetProfit > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
    netProfitPercentageRow.data.push(totalNetProfitPercentage);

    data.push(peopleCostRow);

    overheadElements.forEach(ele => {
      let totalOverheads = 0;
      const row = {
        elementKey: ele,
        rowStyle: "data",
        data: [ele]
      };
      months.forEach(month => {
        const value = cells[`${ele}-${month.label}`].value;
        row.data.push(value);
        totalOverheads += value;
      });
      row.data.push(totalOverheads);
      data.push(row);
    });

    data.push(netProfitRow, blankRow, netProfitPercentageRow);

    this.state = { data };
  }

  renderHeaderCell = (data, { key, index }) => {
    const month = this.props.months[index];
    return (
      <TouchableViewCell
        style={{ alignItems: "flex-end" }}
        key={key}
        onPress={() =>
          this.props.openReport({
            name: `${this.props.report.name} for ${month.label}`,
            component: "Drilldown",
            params: { month }
          })
        }
      >
        <Text style={{ color: "white" }}>{data}</Text>
      </TouchableViewCell>
    );
  };

  render() {
    const { data } = this.state;
    if (!data) return <ActivityIndicator />;

    return (
      <Container>
        <BappoTable renderHeaderCell={this.renderHeaderCell} data={data} />
      </Container>
    );
  }
}

export default MainReport;

const Container = styled(View)`
  flex: 1;
`;

const TouchableViewCell = styled(TouchableView)`
  flex-shrink: 1;
  width: 150px;
  justify-content: center;
  align-items: flex-end;
  padding-right: 10px;
`;

const blankRow = { rowStyle: "blank", data: [] };
