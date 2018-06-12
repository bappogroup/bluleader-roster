import React from 'react';
import { View, Text, styled, Button, ActivityIndicator } from 'bappo-components';
import { dateFormat, getForecastBaseData, getMonthArray } from 'forecast-utils';
import ForecastMatrix from './ForecastMatrix';
import MonthlyReport from './MonthlyReport';

class Layers extends React.Component {
  data = {};

  state = {
    loading: true,
    error: null,
    reports: [],
    matrixData: {},
  };

  componentDidMount() {
    // Set the first report to P&L matrix
    this.setState(
      {
        reports: [
          {
            name: this.props.title,
            component: 'Matrix',
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
    const { $models, startDate, endDate, profitCentre } = this.props;

    this.setState({ loading: true });

    const data = await getForecastBaseData({
      $models,
      startDate,
      endDate,
      profitCentreId: profitCentre && profitCentre.id,
    });

    // Calculate data for matrix
    const months = getMonthArray(startDate, endDate);
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
      startDate,
      endDate,
      profitCentre,
    };

    this.setState({
      loading: false,
      matrixData: {
        months,
        costElements,
        revenueElements,
        overheadElements,
      },
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
    this.data.startDate = startDate;
    this.data.endDate = endDate;

    this.setState(({ matrixData }) => ({
      loading: false,
      matrixData: {
        ...matrixData,
        months,
      },
    }));
  };

  openReport = report => {
    this.setState({ reports: [...this.state.reports, report] });
  };

  renderCrumb = (report, index) => (
    <Crumb key={index}>
      <CrumbLabel>{report.name}</CrumbLabel>
    </Crumb>
  );

  renderHeader = report => (
    <Header>
      {this.state.reports.length > 1 && (
        <CloseButton onPress={() => this.setState({ reports: this.state.reports.slice(0, -1) })}>
          X
        </CloseButton>
      )}
      <Text>{report.name}</Text>
      <Text />
    </Header>
  );

  renderReport = report => {
    if (this.state.loading) return <ActivityIndicator />;

    const props = {
      openReport: this.openReport,
    };

    switch (report.component) {
      case 'Matrix': {
        return <ForecastMatrix {...props} {...this.state.matrixData} />;
      }
      case 'Report':
        return <MonthlyReport />;
      default:
        return null;
    }
  };

  render() {
    const { reports, loading } = this.state;

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    if (!reports.length) return null;

    const crumbs = [...reports];
    const report = crumbs.pop();

    return (
      <Container>
        {crumbs.map(this.renderCrumb)}
        {this.renderHeader(report)}
        {this.renderReport(report)}
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
