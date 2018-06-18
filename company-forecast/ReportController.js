import React from 'react';
import { View, Text, styled, Button, ActivityIndicator } from 'bappo-components';
import { dateFormat, getForecastBaseData, getMonthArray } from 'forecast-utils';
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
      // if profitCentre changed, refetch everything
      this.loadData();
    } else if (
      prevProps.startDate !== this.props.startDate ||
      prevProps.endDate !== this.props.endDate
    ) {
      // if only startDate/endDate changed, only refetch roster entries
      this.loadRosterEntriesOnly();
    }
  }

  // Reload everything when user updated company in the filters
  loadData = async () => {
    const { $models, startDate, endDate, company } = this.props;

    this.setState({ loading: true });

    const months = getMonthArray(startDate, endDate);

    const data = await getForecastBaseData({
      $models,
      months,
      startDate,
      endDate,
      companyId: company.id,
    });

    const permConsultants = [];
    const contractConsultants = [];
    const casualConsultants = [];

    data.consultants.forEach(c => {
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
    data.forecastElements = data.forecastElements.filter(
      ele => ele.key !== 'INTCH' && ele.key !== 'INTREV',
    );

    const costElements = [];
    const revenueElements = [];
    const overheadElements = [];

    for (const element of data.forecastElements) {
      switch (element.elementType) {
        case '1':
          costElements.push(element);
          break;
        case '2':
          revenueElements.push(element);
          break;
        case '3':
          overheadElements.push(element);
          break;
        default:
      }
    }

    this.data = {
      rawData: data,
      months,
      company,
      permConsultants,
      contractConsultants,
      casualConsultants,
      costElements,
      revenueElements,
      overheadElements,
    };

    this.setState({
      loading: false,
    });

    // if (startDate.isAfter(endDate)) {
    //   return this.setState({
    //     loading: false,
    //     error: 'Start Month cannot be later than End Month',
    //   });
    // }
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
          content = <DrilldownConsultants {...props} report={report} data={this.data} />;
          break;
        case 'DrilldownContractors':
          content = <DrilldownContractors {...props} report={report} data={this.data} />;
          break;
        default:
      }
    }

    const hiddenStyle = {
      display: 'none',
      width: 0,
      height: 0,
    };

    const activeStyle = {
      display: 'flex',
      flex: 1,
    };

    return (
      <ReportContainer key={report.name} shouldGrow={!hidden}>
        {hidden ? (
          <Crumb
            style={{
              borderRadius: 3,
              borderWidth: 1,
              borderColor: '#ddd',
            }}
          >
            <CrumbLabel>{report.name}</CrumbLabel>
          </Crumb>
        ) : (
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
        )}
        <ReportBody hidden={hidden}>{content}</ReportBody>
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
  ${props => (props.shouldGrow ? 'flex: 1;' : 'flex : none;')} display: flex;
`;

const ReportBody = styled(View)`
  flex: 1;
  display: flex;

  ${props => props.hidden && 'display: none; width: 0; height: 0;'};
`;
