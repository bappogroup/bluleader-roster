import React from 'react';
import moment from 'moment';
import { styled, View, Button } from 'bappo-components';
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

    this.data.periods = periods;
    this.data.monthOptions = periods.map((p, index) => ({
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
        forecastCompanyId: this.state.comapny && this.state.comapny.id,
        forecastStartMonthId: this.state.forecastStartMonthId,
        forecastEndMonthId: this.state.forecastEndMonthId,
      },
      onSubmit: ({ forecastCompanyId, forecastStartMonthId, forecastEndMonthId }) => {
        const comapny = companies.find(c => c.id === forecastCompanyId);
        const { forecastStartDate, forecastEndDate, periodIds } = this.processPeriods(
          forecastStartMonthId,
          forecastEndMonthId,
        );

        this.setState({
          comapny,
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
    return (
      <Container>
        <FilterButton onPress={this.setFilters}>change company or time</FilterButton>
        <ReportController
          title={title}
          company={company}
          startDate={forecastStartDate}
          endDate={forecastEndDate}
          periodIds={periodIds}
          $models={this.props.$models}
        />
      </Container>
    );
  }
}

export default CompanyForecast;

const Container = styled(View)`
  flex: 1;
`;

const FilterButton = styled(Button)`
  margin-top: 15px;
  margin-left: 20px;
`;
