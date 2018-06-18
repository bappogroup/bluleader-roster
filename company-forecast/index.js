import React from 'react';
import moment from 'moment';
import { styled, View, Button } from 'bappo-components';
import { setUserPreferences, getUserPreferences } from 'user-preferences';
import { dateFormat } from 'forecast-utils';
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
    const companies = await this.props.$models.Company.findAll({
      limit: 1000,
    });
    this.data.companies = companies;

    // Load user preferences
    const prefs = await getUserPreferences(this.props.$global.currentUser.id, this.props.$models);
    const { forecastCompanyId, forecastStartDate, forecastEndDate } = prefs;

    if (!(forecastCompanyId && forecastStartDate && forecastEndDate)) this.setFilters();
    else {
      const company = companies.find(c => c.id === forecastCompanyId);
      this.setState({
        company,
        forecastStartDate,
        forecastEndDate,
      });
    }
  }

  setFilters = () => {
    const { $models, $popup } = this.props;
    const { companies } = this.data;

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
          name: 'rawForecastStartDate',
          label: 'Start Month',
          type: 'Date',
          properties: {
            format: dateFormat,
          },
          validate: [value => (value ? undefined : 'Required')],
        },
        {
          name: 'rawForecastEndDate',
          label: 'End Month',
          type: 'Date',
          properties: {
            format: dateFormat,
          },
          validate: [value => (value ? undefined : 'Required')],
        },
      ],
      initialValues: {
        forecastCompanyId: this.state.comapny && this.state.comapny.id,
        rawForecastStartDate: this.state.forecastStartDate,
        rawForecastEndDate: this.state.forecastEndDate,
      },
      onSubmit: ({ forecastCompanyId, rawForecastStartDate, rawForecastEndDate }) => {
        const comapny = companies.find(c => c.id === forecastCompanyId);

        const forecastStartDate = moment(rawForecastStartDate).startOf('month');
        const forecastEndDate = moment(rawForecastEndDate).endOf('month');

        this.setState({
          comapny,
          forecastStartDate,
          forecastEndDate,
        });

        setUserPreferences(this.props.$global.currentUser.id, $models, {
          forecastCompanyId,
          forecastStartDate,
          forecastEndDate,
        });
      },
    });
  };

  render() {
    const { company, forecastStartDate, forecastEndDate } = this.state;
    if (!(company && forecastStartDate && forecastEndDate)) return null;

    const title = `Company: ${company.name}`;
    return (
      <Container>
        <FilterButton onPress={this.setFilters}>change company or time</FilterButton>
        <ReportController
          title={title}
          company={company}
          startDate={forecastStartDate}
          endDate={forecastEndDate}
          $models={this.props.$models}
        />
      </Container>
    );
  }
}

export default CompanyForecast;

const Container = styled(View)``;

const FilterButton = styled(Button)`
  margin-top: 15px;
  margin-left: 20px;
`;
