import React from 'react';
import { ScrollView, View, Text, styled } from 'bappo-components';
import Card from 'card';

class DrilldownCards extends React.Component {
  constructor(props) {
    super(props);
    const { cells } = props.mainReportData;
    const monthLabel = props.report.params.month.label;
    const { projects, consultants } = props.rawData;

    // Projects
    const projectCards = projects.map(project => {
      const Revenue = cells[`T&M Project Revenue-${monthLabel}`][project.id] || 0;
      const Cost = cells[`T&M Project Cost-${monthLabel}`][project.id] || 0;
      const Margin = Revenue - Cost;

      return {
        title: project.name,
        properties: {
          Revenue,
          Cost,
          Margin,
        },
      };
    });

    const totalProjectRevenue = cells[`T&M Project Revenue-${monthLabel}`].value;
    const totalProjectCost = cells[`T&M Project Cost-${monthLabel}`].value;
    const totalProjectMargin = totalProjectRevenue - totalProjectCost;
    projectCards.push({
      title: 'Totals',
      properties: {
        Revenue: totalProjectRevenue,
        Cost: totalProjectCost,
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
      properties: {
        'Cost Recovery': totalConsultantRecovery,
        Cost: totalConsultantCost,
        Margin: totalConsultantMargin,
      },
    });

    // Overheads
    const { value, ...properties } = cells[`Overheads-${monthLabel}`];
    const overheadsCard = { properties, title: 'Overheads', total: value || 0 };

    const netProfit = totalProjectMargin + totalConsultantMargin - overheadsCard.total;

    this.state = { projectCards, consultantCards, overheadsCard, netProfit };
  }

  renderTitle = title => (
    <Title>
      <Text style={{ fontSize: 18 }}>{title}</Text>
    </Title>
  );

  renderCards = cards => {
    if (!window || window.innerWidth < 500) {
      // Native or narrow screen
      return cards.map(card => <Card {...card} />);
    }

    // Wide desktop
    return <CardsContainer>{cards.map(card => <Card {...card} />)}</CardsContainer>;
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
