import React from 'react';
import moment from 'moment';
import { styled, View, Button } from 'bappo-components';
import { setUserPreferences, getUserPreferences } from 'user-preferences';
import { dateFormat } from 'forecast-utils';
import ForecastLayers from './ForecastLayers';

class ProfitCentreForecast extends React.Component {
  data = {
    profitCentres: [],
  };

  state = {
    profitCentre: null,
    forecastStartDate: null,
    forecastEndDate: null,
  };

  async componentDidMount() {
    // Load profit centre options
    const profitCentres = await this.props.$models.ProfitCentre.findAll({
      limit: 1000,
    });
    this.data.profitCentres = profitCentres;

    // Load user preferences
    const prefs = await getUserPreferences(this.props.$global.currentUser.id, this.props.$models);
    const { profitCentreId, forecastStartDate, forecastEndDate } = prefs;

    if (!(forecastStartDate && forecastEndDate)) this.setFilters();
    else {
      const profitCentre = profitCentres.find(pc => pc.id === profitCentreId);
      this.setState({
        profitCentre,
        forecastStartDate,
        forecastEndDate,
      });
    }
  }

  setFilters = () => {
    const { $models, $popup } = this.props;
    const { profitCentres } = this.data;

    const profitCentreOptions = profitCentres.map((pc, index) => ({
      id: pc.id,
      label: pc.name,
      pos: index,
    }));

    $popup.form({
      title: 'Select Profit Centre and Time Range',
      fields: [
        {
          name: 'profitCentreId',
          label: 'Profit Centre',
          type: 'FixedList',
          properties: {
            options: profitCentreOptions,
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
        profitCentreId: this.state.profitCentre && this.state.profitCentre.id,
        rawForecastStartDate: this.state.forecastStartDate,
        rawForecastEndDate: this.state.forecastEndDate,
      },
      onSubmit: ({ profitCentreId, rawForecastStartDate, rawForecastEndDate }) => {
        const profitCentre = profitCentres.find(pc => pc.id === profitCentreId);

        const forecastStartDate = moment(rawForecastStartDate).startOf('month');
        const forecastEndDate = moment(rawForecastEndDate).endOf('month');

        this.setState({
          profitCentre,
          forecastStartDate,
          forecastEndDate,
        });

        setUserPreferences(this.props.$global.currentUser.id, $models, {
          profitCentreId,
          forecastStartDate,
          forecastEndDate,
        });
      },
    });
  };

  render() {
    const { profitCentre, forecastStartDate, forecastEndDate } = this.state;
    if (!(forecastStartDate && forecastEndDate)) return null;

    const title = `Profit centre: ${profitCentre ? profitCentre.name : 'all'}`;
    return (
      <Container>
        <FilterButton onPress={this.setFilters}>change profit centre or time</FilterButton>
        <ForecastLayers
          title={title}
          profitCentre={profitCentre}
          startDate={forecastStartDate}
          endDate={forecastEndDate}
          $models={this.props.$models}
        />
      </Container>
    );
  }
}

export default ProfitCentreForecast;

const Container = styled(View)``;

const FilterButton = styled(Button)`
  outline: none;
  margin-top: 15px;
  margin-left: 20px;
`;
