import React from 'react';
import { View, Text, styled, Button, ActivityIndicator } from 'bappo-components';
import { dateFormat, getForecastBaseData, getMonthArray } from 'forecast-utils';
import MainReport from './MainReport';
import MonthlyReport from './MonthlyReport';

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
    const prevPcId = prevProps.profitCentre && prevProps.profitCentre.id;
    const currentPcId = this.props.profitCentre && this.props.profitCentre.id;
    // Reload data when filters are changed
    if (prevPcId !== currentPcId) {
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

  loadData = async () => {
    const { $models, startDate, endDate, company } = this.props;

    this.setState({ loading: true });

    const months = getMonthArray(startDate, endDate);

    const data = await getForecastBaseData({
      $models,
      startDate,
      endDate,
      companyId: company.id,
    });

    this.data = {
      rawData: data,
      months,
      company,
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

  openReport = report => {
    this.setState({ reports: [...this.state.reports, report] });
  };

  renderReport = (report, hidden) => {
    let content;
    if (this.state.loading) content = <ActivityIndicator />;
    else {
      const props = {
        openReport: this.openReport,
      };

      switch (report.component) {
        case 'Main': {
          content = <MainReport {...props} {...this.data} />;
          break;
        }
        case 'Report':
          content = <MonthlyReport />;
          break;
        default:
      }
    }

    const hiddenStyle = {
      visibility: 'hidden',
      width: 0,
      height: 0,
    };

    return (
      <ReportContainer>
        {hidden ? (
          <Crumb>
            <CrumbLabel>{report.name}</CrumbLabel>
          </Crumb>
        ) : (
          <Header>
            {this.state.reports.length > 1 && (
              <CloseButton
                onPress={() => this.setState({ reports: this.state.reports.slice(0, -1) })}
              >
                X
              </CloseButton>
            )}
            <Text>{report.name}</Text>
            <Text />
          </Header>
        )}
        <View style={hidden ? hiddenStyle : {}}>{content}</View>
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
  padding-top: 40px;
`;

const Header = styled(View)`
  position: relative;
  border-radius: 3px 3px 0 0;
  background-color: #eee;
  height: 40px;
  justify-content: center;
  align-items: center;
`;

const Crumb = styled(View)`
  border-top: 1px solid #ddd;
  border-left: 1px solid #ddd;
  border-right: 1px solid #ddd;
  justify-content: center;
  align-items: center;
  margin-left: 20px;
  margin-right: 20px;
  margin-bottom: 2px;
  border-radius: 3px 3px 0 0;
`;

const CrumbLabel = styled(View)`
  font-size: 8pt;
  color: #ccc;
`;

const CloseButton = styled(Button)`
  width: 40px;
  height: 40px;
  position: absolute;
  left: 10px;
  top: 10px;
  outline: none;
`;

const ReportContainer = styled(View)``;
