import React from 'react';
import moment from 'moment';
import { styled, View, Button, Text } from 'bappo-components';
import { setUserPreferences, getUserPreferences } from 'user-preferences';
import ReportController from './ReportController';

class ProfitCentreForecast extends React.Component {
  data = {
    profitCentres: [],
  };

  state = {
    profitCentre: null,
    forecastStartDate: null,
    forecastEndDate: null,
    currentAction: 'select',
  };

  async componentDidMount() {
    // Load filter options
    const promises = [];
    promises.push(
      this.props.$models.ProfitCentre.findAll({
        limit: 1000,
      }),
    );
    promises.push(
      this.props.$models.FinancialPeriod.findAll({
        limit: 1000,
      }),
    );
    const [profitCentres, periods] = await Promise.all(promises);

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
    this.data.profitCentres = profitCentres;

    // Load user preferences
    const prefs = await getUserPreferences(this.props.$global.currentUser.id, this.props.$models);
    const { forecastProfitCentreId, forecastStartMonthId, forecastEndMonthId } = prefs;

    if (!(forecastProfitCentreId && forecastStartMonthId && forecastEndMonthId)) this.setFilters();
    else {
      const profitCentre = profitCentres.find(pc => pc.id === forecastProfitCentreId);
      const { forecastStartDate, forecastEndDate, periodIds } = this.processPeriods(
        forecastStartMonthId,
        forecastEndMonthId,
      );
      this.setState({
        profitCentre,
        forecastStartMonthId,
        forecastEndMonthId,
        forecastStartDate,
        forecastEndDate,
        periodIds,
      });
    }
  }

  timeRangeValidator = (value, formValues) => {
    if (!value) return 'Required';
    const startOption = this.data.monthOptions.find(m => m.id === formValues.forecastStartMonthId);
    const endOption = this.data.monthOptions.find(m => m.id === formValues.forecastEndMonthId);
    if (startOption && endOption && endOption.pos < startOption.pos) return 'Invalid time range';
    return undefined;
  };

  setFilters = () => {
    const { $models, $popup } = this.props;
    const { profitCentres, monthOptions } = this.data;

    const profitCentreOptions = profitCentres.map((c, index) => ({
      id: c.id,
      label: c.name,
      pos: index,
    }));

    $popup.form({
      title: 'Select Profit Centre and Time Range',
      fields: [
        {
          name: 'forecastProfitCentreId',
          label: 'ProfitCentre',
          type: 'FixedList',
          properties: {
            options: profitCentreOptions,
          },
        },
        {
          name: 'forecastStartMonthId',
          label: 'Start Month',
          type: 'FixedList',
          properties: {
            options: monthOptions,
          },
          validate: this.timeRangeValidator,
        },
        {
          name: 'forecastEndMonthId',
          label: 'End Month',
          type: 'FixedList',
          properties: {
            options: monthOptions,
          },
          validate: this.timeRangeValidator,
        },
      ],
      initialValues: {
        forecastProfitCentreId: this.state.profitCentre && this.state.profitCentre.id,
        forecastStartMonthId: this.state.forecastStartMonthId,
        forecastEndMonthId: this.state.forecastEndMonthId,
      },
      onSubmit: ({ forecastProfitCentreId, forecastStartMonthId, forecastEndMonthId }) => {
        const profitCentre = profitCentres.find(c => c.id === forecastProfitCentreId);
        const { forecastStartDate, forecastEndDate, periodIds } = this.processPeriods(
          forecastStartMonthId,
          forecastEndMonthId,
        );

        this.setState({
          profitCentre,
          forecastStartMonthId,
          forecastEndMonthId,
          forecastStartDate,
          forecastEndDate,
          periodIds,
        });

        setUserPreferences(this.props.$global.currentUser.id, $models, {
          forecastProfitCentreId,
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
    const { profitCentre, forecastStartDate, forecastEndDate, periodIds } = this.state;
    if (!(profitCentre && forecastStartDate && forecastEndDate && periodIds.length)) return null;

    if (this.state.currentAction === 'select') {
      return (
        <Container>
          <TitleContainer>
            <Title>
              {profitCentre.name}, {forecastStartDate.format('MMM YY')} to{' '}
              {forecastEndDate.format('MMM YY')}
            </Title>
            <FilterButton onPress={this.setFilters}>
              <Text style={{ fontSize: 18 }}>✎</Text>
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
            profitCentre={profitCentre}
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

export default ProfitCentreForecast;

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
