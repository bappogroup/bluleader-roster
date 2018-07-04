import React from 'react';
import { View, Text, styled, Button, ActivityIndicator } from 'bappo-components';
import { getForecastBaseData, getMonthArray, calculateMainReport } from 'forecast-utils';
import MainReport from './MainReport';
import DrilldownConsultants from './DrilldownConsultants';
import DrilldownContractors from './DrilldownContractors';
import DrilldownPlain from './DrilldownPlain';

class Layers extends React.Component {
  data = {};

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      reports: [
        {
          name: this.props.title,
          component: 'Main',
        },
      ],
    };
  }

  componentDidMount() {
    this.loadData();
  }

  // Reload everything when user updated company in the filters
  loadData = async () => {
    const { $models, startDate, endDate, company, periodIds } = this.props;

    this.setState({ loading: true });

    const months = getMonthArray(startDate, endDate);

    const rawData = await getForecastBaseData({
      $models,
      periodIds,
      startDate,
      endDate,
      companyId: company.id,
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

    // Process forecast elements
    rawData.forecastElements = rawData.forecastElements.filter(
      ele => ele.key !== 'INTCH' && ele.key !== 'INTREV',
    );

    const profitCentreLookup = {};
    rawData.profitCentres.forEach(pc => (profitCentreLookup[pc.id] = pc));
    const costCenterLookup = {};
    rawData.costCenters.forEach(cc => (costCenterLookup[cc.id] = cc));

    this.data = {
      rawData,
      months,
      company,
      permConsultants,
      contractConsultants,
      casualConsultants,
    };

    const mainReportData = calculateMainReport({
      months,
      permConsultants,
      contractConsultants,
      rosterEntries: rawData.rosterEntries,
      projectAssignmentLookup: rawData.projectAssignmentLookup,
      forecastElements: rawData.forecastElements,
      forecastEntries: rawData.forecastEntries,
    });

    this.data.mainReportData = mainReportData;
    this.data.profitCentreLookup = profitCentreLookup;
    this.data.costCenterLookup = costCenterLookup;

    this.setState({
      loading: false,
    });
  };

  // Append a report to state
  openReport = report => {
    if (report.component) this.setState({ reports: [...this.state.reports, report] });
  };

  // Render a report, and apply hidden styles if needed
  renderReport = (report, hidden) => {
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
    if (this.state.loading) content = <ActivityIndicator />;
    else {
      const props = {
        openReport: this.openReport,
      };

      switch (report.component) {
        case 'Main':
          content = <MainReport {...props} {...this.data} />;
          break;
        case 'DrilldownConsultants':
          content = <DrilldownConsultants {...props} report={report} {...this.data} />;
          break;
        case 'DrilldownContractors':
          content = <DrilldownContractors {...props} report={report} {...this.data} />;
          break;
        case 'DrilldownPlain':
          content = <DrilldownPlain {...props} report={report} {...this.data} />;
          break;
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

export default Layers;

const Container = styled(View)`
  display: flex;
  height: 80%;
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

const ReportContainer = styled(View)`
  flex: 1;
`;
