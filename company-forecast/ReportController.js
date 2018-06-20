import React from 'react';
import { View, Text, styled, Button, ActivityIndicator } from 'bappo-components';
import {
  dateFormat,
  getForecastBaseData,
  getMonthArray,
  calculateMainReport,
} from 'forecast-utils';
import MainReport from './MainReport';
import DrilldownConsultants from './DrilldownConsultants';
import DrilldownContractors from './DrilldownContractors';

class Layers extends React.Component {
  data = {};

  state = {
    loading: true,
    error: null,
    reports: [],
  };

  componentDidMount() {
    // Set the first report to P&L main report
    this.setState(
      {
        reports: [
          {
            name: this.props.title,
            component: 'Main',
          },
        ],
      },
      () => this.loadData(),
    );
  }

  componentDidUpdate(prevProps, prevState) {
    const prevCompanyId = prevProps.company && prevProps.company.id;
    const currentCompanyId = this.props.company && this.props.company.id;
    // Reload data when filters are changed
    if (prevCompanyId !== currentCompanyId) {
      // profitCentre is changed, refetch everything
      this.loadData();
    } else if (
      prevProps.startDate !== this.props.startDate ||
      prevProps.endDate !== this.props.endDate
    ) {
      // only startDate/endDate are changed, only refetch roster entries
      this.loadRosterEntriesOnly();
    }
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

    this.setState({
      loading: false,
    });
  };

  // Reload RosterEntries only when user only updated time range in the filters
  loadRosterEntriesOnly = async () => {
    this.setState({ loading: true });

    const { $models, startDate, endDate } = this.props;
    const consultantIds = this.data.rawData.consultants.map(c => c.id);

    const rosterEntries = await $models.RosterEntry.findAll({
      where: {
        date: {
          $between: [startDate.format(dateFormat), endDate.format(dateFormat)],
        },
        consultant_id: {
          $in: consultantIds,
        },
      },
      include: [{ as: 'consultant' }, { as: 'project' }, { as: 'probability' }],
      limit: 100000,
    });

    const months = getMonthArray(startDate, endDate);

    this.data.rawData.rosterEntries = rosterEntries;
    this.data.months = months;

    this.setState({
      loading: false,
    });
  };

  // Append a report to state
  openReport = report => {
    this.setState({ reports: [...this.state.reports, report] });
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
        default:
      }
    }

    return (
      <ReportContainer key={report.name}>
        <Header>
          {this.state.reports.length > 1 && (
            <CloseButton
              onPress={() => this.setState({ reports: this.state.reports.slice(0, -1) })}
            >
              <Text>X</Text>
            </CloseButton>
          )}
          <Text>{report.name}</Text>
          <Text />
        </Header>
        {content}
      </ReportContainer>
    );
  };

  render() {
    const { reports, loading } = this.state;

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    if (!reports.length) return null;

    return (
      <Container>
        {reports.map((report, index) => this.renderReport(report, index < reports.length - 1))}
      </Container>
    );
  }
}

export default Layers;

const Container = styled(View)`
  padding-top: 10px;
  display: flex;
  height: 80%;
  flex: 1;

  .fixed {
    flex: none;
  }
  .flex {
    flex: 1;
  }
`;

const Header = styled(View)`
  position: relative;
  background-color: #eee;
  height: 40px;
  justify-content: center;
  align-items: center;
  flex: none;
`;

const Crumb = styled(View)`
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
  width: 40px;
  height: 40px;
  position: absolute;
  left: 10px;
  top: 10px;
  color: black;
`;

const ReportContainer = styled(View)`
  flex: 1;
`;
