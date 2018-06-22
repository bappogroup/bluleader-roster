import React from 'react';
import moment from 'moment';
import { styled, View, Button, Text } from 'bappo-components';
import { setUserPreferences, getUserPreferences } from 'user-preferences';
import ReportController from './ReportController';

class CompanyForecast extends React.Component {
  data = {
    companies: [],
  };

  state = {
    company: null,
    forecastStartDate: null,
    forecastEndDate: null,
    currentAction: 'select',
  };

  async componentDidMount() {
    // Load company options
    const promises = [];
    promises.push(
      this.props.$models.Company.findAll({
        limit: 1000,
      }),
    );
    promises.push(
      this.props.$models.FinancialPeriod.findAll({
        limit: 1000,
      }),
    );
    const [companies, periods] = await Promise.all(promises);

    // Sort periods
    this.data.periods = periods.sort((p1, p2) => {
      if (p1.year !== p2.year) return +p1.year - p2.year;
      return +p1.period - +p2.period;
    });

    this.data.monthOptions = this.data.periods.map((p, index) => ({
      id: p.id,
      label: p.name,
      pos: index,
    }));
    this.data.companies = companies;

    // Load user preferences
    const prefs = await getUserPreferences(this.props.$global.currentUser.id, this.props.$models);
    const { forecastCompanyId, forecastStartMonthId, forecastEndMonthId } = prefs;

    if (!(forecastCompanyId && forecastStartMonthId && forecastEndMonthId)) this.setFilters();
    else {
      const company = companies.find(c => c.id === forecastCompanyId);
      const { forecastStartDate, forecastEndDate, periodIds } = this.processPeriods(
        forecastStartMonthId,
        forecastEndMonthId,
      );
      this.setState({
        company,
        forecastStartMonthId,
        forecastEndMonthId,
        forecastStartDate,
        forecastEndDate,
        periodIds,
      });
    }
  }

  setFilters = () => {
    const { $models, $popup } = this.props;
    const { companies, monthOptions } = this.data;

    const companyOptions = companies.map((c, index) => ({
      id: c.id,
      label: c.name,
      pos: index,
    }));

    $popup.form({
      title: 'Select Company and Time Range',
      fields: [
        {
          name: 'forecastCompanyId',
          label: 'Company',
          type: 'FixedList',
          properties: {
            options: companyOptions,
          },
        },
        {
          name: 'forecastStartMonthId',
          label: 'Start Month',
          type: 'FixedList',
          properties: {
            options: monthOptions,
          },
          validate: [value => (value ? undefined : 'Required')],
        },
        {
          name: 'forecastEndMonthId',
          label: 'End Month',
          type: 'FixedList',
          properties: {
            options: monthOptions,
          },
          validate: [value => (value ? undefined : 'Required')],
        },
      ],
      initialValues: {
        forecastCompanyId: this.state.company && this.state.company.id,
        forecastStartMonthId: this.state.forecastStartMonthId,
        forecastEndMonthId: this.state.forecastEndMonthId,
      },
      onSubmit: ({ forecastCompanyId, forecastStartMonthId, forecastEndMonthId }) => {
        const company = companies.find(c => c.id === forecastCompanyId);
        const { forecastStartDate, forecastEndDate, periodIds } = this.processPeriods(
          forecastStartMonthId,
          forecastEndMonthId,
        );

        this.setState({
          company,
          forecastStartMonthId,
          forecastEndMonthId,
          forecastStartDate,
          forecastEndDate,
          periodIds,
        });

        setUserPreferences(this.props.$global.currentUser.id, $models, {
          forecastCompanyId,
          forecastStartMonthId,
          forecastEndMonthId,
        });
      },
    });
  };

  processPeriods = (startMonthId, endMonthId) => {
    const { periods } = this.data;
    const startPeriod = periods.find(p => p.id === startMonthId);
    const endPeriod = periods.find(p => p.id === endMonthId);

    const forecastStartDate = moment(startPeriod.name).startOf('month');
    const forecastEndDate = moment(endPeriod.name).endOf('month');

    const periodIds = [];

    for (
      const date = forecastStartDate.clone();
      date.isBefore(forecastEndDate);
      date.add(1, 'month')
    ) {
      const _year = date.year();
      const _month = date.month();
      const validPeriod = periods.find(p => {
        const _p = moment(p.name);
        return _p.year() === _year && _p.month() === _month;
      });
      periodIds.push(validPeriod.id);
    }

    return { forecastStartDate, forecastEndDate, periodIds };
  };

  render() {
    const { company, forecastStartDate, forecastEndDate, periodIds } = this.state;
    if (!(company && forecastStartDate && forecastEndDate && periodIds.length)) return null;

    const title = `Company: ${company.name}`;
    if (this.state.currentAction === 'select') {
      return (
        <Container>
          <TitleContainer>
            <Title>
              Run report for {company.name}, from {forecastStartDate.format('MMM YY')} to{' '}
              {forecastEndDate.format('MMM YY')}
            </Title>
            <FilterButton onPress={this.setFilters}>
              <Text>change</Text>
            </FilterButton>
          </TitleContainer>
          <RunButton onPress={() => this.setState({ currentAction: 'run' })}>
            <RunButtonText> Run </RunButtonText>
          </RunButton>
        </Container>
      );
    }

    if (this.state.currentAction === 'run') {
      return (
        <Container>
          <ReportController
            title={title}
            company={company}
            startDate={forecastStartDate}
            endDate={forecastEndDate}
            periodIds={periodIds}
            setCurrentAction={currentAction => this.setState({ currentAction })}
            $models={this.props.$models}
          />
        </Container>
      );
    }

    return null;
  }
}

export default CompanyForecast;

const Container = styled(View)`
  flex: 1;
`;

const FilterButton = styled(Button)`
  margin-left: 15px;
`;

const RunButton = styled(Button)`
  height: 50px;
  margin-left: 20px;
  margin-right: 20px;
  background-color: orange;
  border-radius: 3px;
  justify-content: center;
  align-items: center;
`;

const RunButtonText = styled(Text)`
  color: white;
`;

const TitleContainer = styled(View)`
  margin: 20px;
  flex-direction: row;
`;

const Title = styled(Text)``;
