import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableView,
  styled
} from "bappo-components";
import { leaveProjectTypeIndexes } from "forecast-utils";
import Table from "./table";

class DrilldownCards extends React.Component {
  constructor(props) {
    super(props);
    const { cells } = props.mainReportData;
    const monthLabel = props.report.params.month.label;
    const { projects, consultants } = props.rawData;

    const records = [];

    const projectTotals = {
      revenue: 0.0,
      cost: 0.0,
      expense: 0.0,
      overheads: 0.0,
      margin: 0.0
    };

    records.push([
      "Project",
      "Revenue",
      "Roster Cost",
      "Project Travel..",
      "Fixed Price Costs",
      "Margin",
      "Margin%",
      "",
      ""
    ]);
    // Projects
    // const projectCards = [];

    projects.sort((a, b) => {
      const string1 = `${a.projectType}${a.name}`;
      const string2 = `${b.projectType}${b.name}`;
      if (string1 === string2) return 0;
      return string1 > string2 ? 1 : -1;
    });
    projects.forEach(project => {
      if (leaveProjectTypeIndexes.includes(project.projectType)) return;

      let Revenue = 0;
      const Cost = cells[`Roster Costs-${monthLabel}`][project.id] || 0;
      const Expense = cells[`Project Travel-${monthLabel}`][project.id] || 0;
      let Overheads = 0;

      let projectTypeLabel;

      switch (project.projectType) {
        case "1":
          projectTypeLabel = "internal";
          Revenue = 0;
          break;
        case "2":
          projectTypeLabel = "T&M";
          Revenue = cells[`T&M Project Revenue-${monthLabel}`][project.id] || 0;
          break;
        case "3":
          projectTypeLabel = "fixed price";
          Revenue =
            cells[`Fixed Price Project Revenue-${monthLabel}`][project.id] || 0;
          Overheads = cells[`Fixed Price Costs-${monthLabel}`][project.id] || 0;
          break;
        default:
      }
      const Margin = Revenue - Cost - Expense - Overheads;
      const mp = Revenue > 0 && Margin > 0 ? (Margin / Revenue) * 100 : 0;

      // Don't show if the number is 0
      if (+Revenue === 0 && +Cost === 0 && +Margin === 0) return;

      // const properties = {
      //   Revenue,
      //   Cost,
      //   Expense,
      //   Overheads,
      //   Margin,
      //   Percentage: `${
      //     Revenue === 0 ? "-" : +(Margin / Revenue * 100).toFixed(2)
      //   }%`
      // };

      // projectCards.push({
      //   title: project.name,
      //   subtitle: projectTypeLabel,
      //   type: `project-${project.projectType}`,
      //   id: project.id,
      //   properties
      // });

      records.push({
        project,
        data: [
          `${project.name} - ${projectTypeLabel}`,
          Revenue,
          Cost,
          Expense,
          Overheads,
          Margin,
          mp,
          ""
        ]
      });
      projectTotals.revenue += Revenue;
      projectTotals.cost += Cost;
      projectTotals.expense += Expense;
      projectTotals.overheads += Overheads;
      projectTotals.margin += Margin;
    });

    projectTotals.marginPercent =
      projectTotals.revenue > 0 && projectTotals.margin > 0
        ? (projectTotals.margin / projectTotals.revenue) * 100
        : 0;

    records.push({
      rowStyle: "total",
      data: [
        "Total",
        projectTotals.revenue,
        projectTotals.cost,
        projectTotals.expense,
        projectTotals.overheads,
        projectTotals.margin,
        projectTotals.marginPercent,
        ""
      ]
    });

    records.push(blankRow);

    // const totalProjectRevenue =
    //   cells[`T&M Project Revenue-${monthLabel}`].value +
    //   cells[`Fixed Price Project Revenue-${monthLabel}`].value;
    // const totalProjectCost = cells[`Roster Costs-${monthLabel}`].value;
    // const totalProjectExpense = cells[`Project Expense-${monthLabel}`].value;
    // const totalProjectMargin =
    //   totalProjectRevenue - totalProjectCost - totalProjectExpense;
    // projectCards.push({
    //   title: "Totals",
    //   type: "totals",
    //   properties: {
    //     Revenue: totalProjectRevenue,
    //     Cost: totalProjectCost,
    //     Expense: totalProjectExpense,
    //     Margin: totalProjectMargin
    //   }
    // });

    // Consultants

    records.push({
      rowStyle: "header",
      data: [
        "Consultant",
        "Salary",
        "PayrollTax",
        "Bonus",
        "Leave Provision",
        "Leave",
        "Cost before Recovery",
        "Cost Recovery",
        "Total Cost"
      ]
    });

    const consultantTotals = {
      recovery: 0,
      cost: 0,
      salary: 0,
      payrolltax: 0,
      bonus: 0,
      leaveprovision: 0,
      leave: 0,
      margin: 0
    };

    consultants.sort((a, b) => (a.name > b.name ? 1 : -1));

    consultants.forEach(consultant => {
      const Recovery =
        -cells[`People Cost Recovery-${monthLabel}`][consultant.id] || 0;
      let Cost;
      let Salary = 0;
      let LeaveProvision = 0;
      let Leave = 0;
      let Bonus = 0;
      let PayrollTax = 0;

      switch (consultant.consultantType) {
        case "1":
          Cost =
            cells[`Consultant Cost(permanent)-${monthLabel}`][consultant.id] ||
            0;
          Salary = cells[`Salary(permanent)-${monthLabel}`][consultant.id] || 0;
          LeaveProvision =
            cells[`Leave Provision(permanent)-${monthLabel}`][consultant.id] ||
            0;
          Leave = cells[`Leave(permanent)-${monthLabel}`][consultant.id] || 0;
          Bonus = cells[`Bonus(permanent)-${monthLabel}`][consultant.id] || 0;
          PayrollTax = cells[`Payroll Tax-${monthLabel}`][consultant.id] || 0;
          break;
        case "2":
          PayrollTax =
            cells[`Payroll Tax (contractors)-${monthLabel}`][consultant.id] ||
            0;
          const wages =
            cells[`Contractor Wages-${monthLabel}`][consultant.id] || 0;
          Cost = wages + PayrollTax;

          break;
        default:
      }

      const PeopleCost = Recovery + Cost;

      records.push({
        consultant,
        data: [
          consultant.name,
          Salary,
          PayrollTax,
          Bonus,
          LeaveProvision,
          Leave,
          Cost,
          Recovery,
          PeopleCost
        ]
      });

      consultantTotals.recovery += Recovery;
      consultantTotals.cost += Cost;
      consultantTotals.salary += Salary;
      consultantTotals.payrolltax += PayrollTax;
      consultantTotals.bonus += Bonus;
      consultantTotals.leaveprovision += LeaveProvision;
      consultantTotals.leave += Leave;
      consultantTotals.margin += PeopleCost;

      // return {
      //   title: consultant.name,
      //   type: "consultant",
      //   id: consultant.id,
      //   properties: {
      //     "Cost Recovery": Recovery,
      //     Cost,
      //     Salary,
      //     PayrollTax,
      //     Bonus,
      //     LeaveProvision,
      //     Margin
      //   }
      // };
    });

    records.push({
      rowStyle: "total",
      data: [
        "Total",
        consultantTotals.salary,
        consultantTotals.payrolltax,
        consultantTotals.bonus,
        consultantTotals.leaveprovision,
        consultantTotals.leave,
        consultantTotals.cost,
        consultantTotals.recovery,
        consultantTotals.margin
      ]
    });

    // const totalConsultantRecovery =
    //   cells[`People Cost Recovery-${monthLabel}`].value;
    // const totalConsultantCost =
    //   cells[`Consultant Cost(permanent)-${monthLabel}`].value +
    //   cells[`Consultant Cost(contractor)-${monthLabel}`].value;
    // const totalConsultantMargin = totalConsultantRecovery - totalConsultantCost;

    // consultantCards.push({
    //   title: "Totals",
    //   type: "totals",
    //   properties: {
    //     "Cost Recovery": totalConsultantRecovery,
    //     Cost: totalConsultantCost,
    //     Margin: totalConsultantMargin
    //   }
    // });

    // Overheads
    const { value, ...properties } = cells[`Overheads-${monthLabel}`];
    records.push(blankRow);
    records.push({
      rowStyle: "header",
      data: ["Overheads"]
    });

    const overheads = Object.keys(properties).map(key => ({
      key,
      value: properties[key]
    }));

    let totalOverheads = 0;

    for (let overhead of overheads) {
      records.push([overhead.key, overhead.value]);
      totalOverheads += overhead.value;
    }

    records.push({
      rowStyle: "total",
      data: ["Total Overheads", totalOverheads]
    });

    // const overheadsCard = {
    //   properties,
    //   title: "Overheads",
    //   type: "totals",
    //   total: value || 0
    // };

    // const netProfit = (
    //   totalProjectMargin +
    //   totalConsultantMargin -
    //   overheadsCard.total
    // ).toFixed(2);

    const netProfit =
      projectTotals.margin + consultantTotals.margin - totalOverheads;

    records.push(blankRow);
    records.push({ rowStyle: "info", data: ["Net Profit", netProfit] });

    this.state = {
      records
    };
  }

  renderTitle = title => (
    <Title>
      <Text style={{ fontSize: 18 }}>{title}</Text>
    </Title>
  );

  // renderCards = cards => {
  //   const { month } = this.props.report.params;

  //   const content = cards.map(card => {
  //     if (card.type === "totals") {
  //       if (this.state.isMobile) return <NarrowCard {...card} />;
  //       return <WideCard {...card} />;
  //     }

  //     let component;
  //     switch (card.type) {
  //       case "project-2":
  //         component = "DrilldownProjectTm";
  //         break;
  //       case "project-3":
  //         component = "DrilldownProjectFixedPrice";
  //         break;
  //       case "consultant":
  //         component = "DrilldownConsultant";
  //         break;
  //       default:
  //     }

  //     return (
  //       <TouchableView
  //         onPress={() =>
  //           this.props.openReport({
  //             name: `${card.title}, ${month.label}`,
  //             component,
  //             params: { month, resourceId: card.id }
  //           })
  //         }
  //       >
  //         {this.state.isMobile ? (
  //           <NarrowCard {...card} />
  //         ) : (
  //           <WideCard {...card} />
  //         )}
  //       </TouchableView>
  //     );
  //   });

  //   if (this.state.isMobile) {
  //     // Native or narrow screen
  //     return content;
  //   }

  //   // Wide desktop
  //   return <CardsContainer>{content}</CardsContainer>;
  // };

  // onLayout = params => {
  //   const { width } = params.nativeEvent.layout;
  //   if (width > 500) this.setState({ isMobile: false });
  //   else this.setState({ isMobile: true });
  // };

  rowPress = props => {
    const month = this.props.report.params.month;
    const project = props.project;
    const consultant = props.consultant;

    if (consultant) {
      const component =
        consultant.consultantType === "1"
          ? "DrilldownConsultant"
          : "DrilldownContractors";
      this.props.openReport({
        name: `${consultant.name}, ${month.label}`,
        component,
        params: { month, consultant }
      });
      return;
    }

    if (
      (project && project.projectType === "1") ||
      project.projectType === "2"
    ) {
      this.props.openReport({
        name: `${project.name}, ${month.label}`,
        component: "DrilldownProjectTm",
        params: { month, project }
      });
      return;
    }

    if (project && project.projectType === "3") {
      this.props.openReport({
        name: `${project.name}, ${month.label}`,
        component: "DrilldownProjectFixedPrice",
        params: { month, project }
      });
    }
  };

  render() {
    const {
      projectCards,
      consultantCards,
      overheadsCard,
      netProfit
    } = this.state;

    return (
      <Container onLayout={this.onLayout}>
        <Table data={this.state.records} rowPress={this.rowPress} />
      </Container>
    );

    // return (
    //   <Container onLayout={this.onLayout}>
    //     {this.renderTitle("Projects:")}
    //     {this.renderCards(projectCards)}
    //     {this.renderTitle("Consultants:")}
    //     {this.renderCards(consultantCards)}
    //     {this.renderTitle("Overheads:")}
    //     {this.renderCards([overheadsCard])}
    //     <NetContainer>
    //       <Text style={{ fontWeight: "bold", fontSize: 18 }}>
    //         Net Profit: {netProfit}
    //       </Text>
    //     </NetContainer>
    //     <View style={{ height: 30 }} />
    //   </Container>
    // );
  }
}

export default DrilldownCards;

const Container = styled(ScrollView)``;

const CardsContainer = styled(View)``;

const Title = styled(View)`
  margin: 15px;
  margin-top: 30px;
`;

const NetContainer = styled(View)`
  margin-left: 15px;
  margin-top: 30px;
  margin-bottom: 30px;
`;

const blankRow = { rowStyle: "blank", data: [] };
