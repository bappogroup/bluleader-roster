import React from 'react';
import { ScrollView, View, Text, Button, styled } from 'bappo-components';
import Card from 'card';

class DrilldownCards extends React.Component {
  constructor(props) {
    super(props);
    const { cells } = props.mainReportData;
    const monthLabel = props.report.params.month.label;
    const { projects, consultants } = props.rawData;

    // Projects
    const projectCards = projects.map(project => {
      let Revenue;
      const Cost = cells[`Project Cost-${monthLabel}`][project.id] || 0;
      const Expense = cells[`Project Expense-${monthLabel}`][project.id] || 0;

      // const projectType = project.projectType ===
      let projectTypeLabel;

      switch (project.projectType) {
        case '1':
          projectTypeLabel = 'Internal';
          break;
        case '2':
          projectTypeLabel = 'T&M';
          Revenue = cells[`T&M Project Revenue-${monthLabel}`][project.id] || 0;
          break;
        case '3':
          projectTypeLabel = 'Fixed Price';
          Revenue = cells[`Fixed Price Project Revenue-${monthLabel}`][project.id] || 0;
          break;
        default:
      }
      const Margin = Revenue - Cost - Expense;

      return {
        title: project.name,
        subtitle: projectTypeLabel,
        type: `project-${project.projectType}`,
        id: project.id,
        properties: {
          Revenue,
          Cost,
          Expense,
          Margin,
        },
      };
    });

    const totalProjectRevenue = cells[`T&M Project Revenue-${monthLabel}`].value;
    const totalProjectCost = cells[`Project Cost-${monthLabel}`].value;
    const totalProjectExpense = cells[`Project Expense-${monthLabel}`].value;
    const totalProjectMargin = totalProjectRevenue - totalProjectCost - totalProjectExpense;
    projectCards.push({
      title: 'Totals',
      type: 'totals',
      properties: {
        Revenue: totalProjectRevenue,
        Cost: totalProjectCost,
        Expense: totalProjectExpense,
        Margin: totalProjectMargin,
      },
    });

    // Consultants
    const consultantCards = consultants.map(consultant => {
      const Recovery = cells[`People Cost Recovery-${monthLabel}`][consultant.id] || 0;
      let Cost;
      switch (consultant.consultantType) {
        case '1':
          Cost = cells[`Consultant Cost(permanent)-${monthLabel}`][consultant.id] || 0;
          break;
        case '2':
          Cost = cells[`Consultant Cost(contractor)-${monthLabel}`][consultant.id] || 0;
          break;
        default:
      }
      const Margin = Recovery - Cost;

      return {
        title: consultant.name,
        type: 'consultant',
        id: consultant.id,
        properties: {
          'Cost Recovery': Recovery,
          Cost,
          Margin,
        },
      };
    });

    const totalConsultantRecovery = cells[`People Cost Recovery-${monthLabel}`].value;
    const totalConsultantCost =
      cells[`Consultant Cost(permanent)-${monthLabel}`].value +
      cells[`Consultant Cost(contractor)-${monthLabel}`].value;
    const totalConsultantMargin = totalConsultantRecovery - totalConsultantCost;
    consultantCards.push({
      title: 'Totals',
      type: 'totals',
      properties: {
        'Cost Recovery': totalConsultantRecovery,
        Cost: totalConsultantCost,
        Margin: totalConsultantMargin,
      },
    });

    // Overheads
    const { value, ...properties } = cells[`Overheads-${monthLabel}`];
    const overheadsCard = { properties, title: 'Overheads', type: 'totals', total: value || 0 };

    const netProfit = totalProjectMargin + totalConsultantMargin - overheadsCard.total;

    this.state = { projectCards, consultantCards, overheadsCard, netProfit };
  }

  renderTitle = title => (
    <Title>
      <Text style={{ fontSize: 18 }}>{title}</Text>
    </Title>
  );

  renderCards = cards => {
    const { month } = this.props.report.params;

    const content = cards.map(card => {
      if (card.type === 'totals') return <Card {...card} />;

      let component;
      switch (card.type) {
        case 'project-2':
          component = 'DrilldownProjectTm';
          break;
        case 'project-3':
          component = 'DrilldownProjectFixedPrice';
          break;
        case 'consultant':
          component = 'DrilldownConsultant';
          break;
        default:
      }

      return (
        <Button
          onPress={() =>
            this.props.openReport({
              name: `Report of ${card.title}, ${month.label}`,
              component,
              params: { month, resourceId: card.id },
            })
          }
        >
          <Card {...card} />
        </Button>
      );
    });

    if (!window || window.innerWidth < 500) {
      // Native or narrow screen
      return content;
    }

    // Wide desktop
    return <CardsContainer>{content}</CardsContainer>;
  };

  render() {
    const { projectCards, consultantCards, overheadsCard, netProfit } = this.state;

    return (
      <Container>
        {this.renderTitle('Projects:')}
        {this.renderCards(projectCards)}
        {this.renderTitle('Consultants:')}
        {this.renderCards(consultantCards)}
        {this.renderTitle('Overheads:')}
        {this.renderCards([overheadsCard])}
        <NetContainer>
          <Text style={{ fontWeight: 'bold', fontSize: 18 }}>Net Profit: {netProfit}</Text>
        </NetContainer>
        <View style={{ height: 30 }} />
      </Container>
    );
  }
}

export default DrilldownCards;

const Container = styled(ScrollView)`
  padding: 15px;
`;

const CardsContainer = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
`;

const Title = styled(View)`
  margin: 15px;
`;

const NetContainer = styled(View)`
  margin-left: 15px;
  margin-top: 30px;
  margin-bottom: 30px;
`;
