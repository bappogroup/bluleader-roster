import React from 'react';
import { View, Text, styled, Button, ActivityIndicator } from 'bappo-components';
import {
  getForecastBaseDataForProfitCentre,
  calculateProfitCentreMainReport,
  getMonthArray,
} from 'forecast-utils';
import MainReport from './MainReport';
import DrilldownTable from './DrilldownTable';
import DrilldownCards from './DrilldownCards';
import DrilldownConsultant from './DrilldownConsultant';
import DrilldownProjectTm from './DrilldownProjectTm';

class ReportController extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      reports: [
        {
          name: `Profit Centre: ${props.profitCentre.name}`,
          component: 'Main',
        },
      ],
      drilldownMode: null,
    };
  }

  componentDidMount() {
    this.loadData();
  }

  loadData = async () => {
    const { $models, startDate, endDate, profitCentre, periodIds } = this.props;

    this.setState({ loading: true });

    const months = getMonthArray(startDate, endDate);

    const rawData = await getForecastBaseDataForProfitCentre({
      $models,
      periodIds,
      startDate,
      endDate,
      profitCentreId: profitCentre.id,
    });

    const mainReportData = calculateProfitCentreMainReport({
      months,
      ...rawData,
    });

    // Process consultants
    const permConsultants = [];
    const contractConsultants = [];
    const casualConsultants = [];

    rawData.consultants.forEach(c => {
      switch (c.consultantType) {
        case '1':
          permConsultants.push(c);
          break;
        case '2':
          contractConsultants.push(c);
          break;
        case '3':
          casualConsultants.push(c);
          break;
        default:
      }
    });

    this.data = {
      rawData,
      months,
      profitCentre,
      permConsultants,
      contractConsultants,
      casualConsultants,
      mainReportData,
    };

    this.setState({ loading: false });
  };

  // Append a report to state
  openReport = report => {
    if (report.component) this.setState({ reports: [...this.state.reports, report] });
  };

  renderSwitchButton = () => (
    <SwitchButtonContainer>
      <Button onPress={() => this.setState({ drilldownMode: 'Cards' })} style={{ marginRight: 7 }}>
        <Text>cards</Text>
      </Button>
      <Button onPress={() => this.setState({ drilldownMode: 'Table' })}>
        <Text>table</Text>
      </Button>
    </SwitchButtonContainer>
  );

  renderReport = (report, hidden) => {
    const { loading, drilldownMode } = this.state;

    if (hidden) {
      return (
        <Crumb
          key={report.name}
          style={{
            borderRadius: 3,
            borderWidth: 1,
            borderColor: '#ddd',
          }}
        >
          <CrumbLabel>{report.name}</CrumbLabel>
        </Crumb>
      );
    }

    let content;
    if (loading) content = <ActivityIndicator />;
    else {
      const props = {
        ...this.data,
        openReport: this.openReport,
        report,
      };

      switch (report.component) {
        case 'Main':
          content = <MainReport {...props} />;
          break;
        case 'Drilldown': {
          if (true || drilldownMode === 'Cards' || (!drilldownMode && !window)) {
            content = <DrilldownCards {...props} />;
          } else {
            content = <DrilldownTable {...props} />;
          }
          break;
        }
        case 'DrilldownConsultant':
          content = <DrilldownConsultant {...props} />;
          break;
        case 'DrilldownProjectTm':
          content = <DrilldownProjectTm {...props} />;
        default:
      }
    }

    let onPress;

    if (this.state.reports.length > 1) {
      // Close drilldown
      onPress = () => this.setState({ reports: this.state.reports.slice(0, -1) });
    } else {
      // Back to reset filter
      onPress = () => this.props.setCurrentAction('select');
    }

    return (
      <ReportContainer key={report.name}>
        <Header>
          <CloseButton onPress={onPress}>
            <Text> ← back </Text>
          </CloseButton>
          <Text>{report.name}</Text>
          {report.component === 'Drilldown' && this.renderSwitchButton()}
        </Header>
        {content}
      </ReportContainer>
    );
  };

  render() {
    const { reports, loading } = this.state;

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
      <Container>
        {reports.map((report, index) => this.renderReport(report, index < reports.length - 1))}
      </Container>
    );
  }
}

export default ReportController;

const Container = styled(View)`
  display: flex;
  flex: 1;
`;

const Header = styled(View)`
  position: relative;
  background-color: #f9f9f9;
  height: 40px;
  justify-content: center;
  align-items: center;
  flex: none;
`;

const Crumb = styled(View)`
  display: none;
  justify-content: center;
  align-items: center;
  margin-left: 20px;
  margin-right: 20px;
  margin-bottom: 2px;
  flex: none;
`;

const CrumbLabel = styled(Text)`
  font-size: 8;
  color: #ccc;
  flex: none;
`;

const CloseButton = styled(Button)`
  width: 100px;
  height: 40px;
  position: absolute;
  left: 10px;
  top: 10px;
`;

const SwitchButtonContainer = styled(View)`
  flex-direction: row;
  position: absolute;
  right: 10px;
  top: 10px;
`;

const ReportContainer = styled(View)`
  flex: 1;
`;
