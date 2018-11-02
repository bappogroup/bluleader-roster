import React from "react";
import moment from "moment";
import {
  styled,
  View,
  Text,
  ActivityIndicator,
  Form,
  SelectField,
  SwitchField,
  Button
} from "bappo-components";
import { setUserPreferences, getUserPreferences } from "user-preferences";
import { sortPeriods, getAuthorisedProfitCentres } from "forecast-utils";
import ReportController from "./ReportController";

class ProfitCentreForecast extends React.Component {
  data = {
    profitCentres: [],
    profitCentreOptions: [],
    periods: [],
    monthOptions: []
  };

  state = {
    error: null,
    profitCentre: null,
    forecastStartDate: null,
    forecastEndDate: null,
    include50: false,
    currentAction: "loading"
  };

  async componentDidMount() {
    // Get user identity
    const { id: user_id } = this.props.$global.currentUser;
    const { $models } = this.props;

    const { error, profitCentres } = await getAuthorisedProfitCentres({
      $models,
      user_id
    });

    if (error) return this.setState({ currentAction: "error", error });

    // Financial periods and User preferences
    const promises = [
      $models.FinancialPeriod.findAll({}),
      getUserPreferences(user_id, $models)
    ];

    // Set this.data
    const [periods, prefs] = await Promise.all(promises);
    this.data.profitCentres = profitCentres;
    this.data.periods = sortPeriods(periods);
    this.data.monthOptions = this.data.periods.map((p, index) => ({
      value: p.id,
      label: p.name,
      pos: index
    }));
    this.data.profitCentreOptions = profitCentres.map((c, index) => ({
      value: c.id,
      label: c.name,
      pos: index
    }));

    const {
      forecastProfitCentreId,
      forecastStartMonthId,
      forecastEndMonthId,
      pcForecastInclude50: include50
    } = prefs;

    if (forecastProfitCentreId && forecastStartMonthId && forecastEndMonthId) {
      const profitCentre = profitCentres.find(
        pc => pc.id === forecastProfitCentreId
      );
      const {
        forecastStartDate,
        forecastEndDate,
        periodIds
      } = this.processPeriods(forecastStartMonthId, forecastEndMonthId);
      this.setState({
        profitCentre,
        forecastStartMonthId,
        forecastEndMonthId,
        forecastStartDate,
        forecastEndDate,
        include50,
        periodIds,
        currentAction: "select"
      });
    } else {
      this.setState({ currentAction: "select" });
    }
  }

  timeRangeValidator = (value, formValues) => {
    if (!value) return "Required";
    const startOption = this.data.monthOptions.find(
      m => m.value === formValues.forecastStartMonthId
    );
    const endOption = this.data.monthOptions.find(
      m => m.value === formValues.forecastEndMonthId
    );
    if (startOption && endOption && endOption.pos < startOption.pos)
      return "Invalid time range";
    return undefined;
  };

  processPeriods = (startMonthId, endMonthId) => {
    const { periods } = this.data;
    const startPeriod = periods.find(p => p.id === startMonthId);
    const endPeriod = periods.find(p => p.id === endMonthId);

    const forecastStartDate = moment(startPeriod.name).startOf("month");
    const forecastEndDate = moment(endPeriod.name).endOf("month");

    const periodIds = [];

    for (
      const date = forecastStartDate.clone();
      date.isBefore(forecastEndDate);
      date.add(1, "month")
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

  renderSelectionForm = () => {
    const initialValues = {
      forecastProfitCentreId:
        this.state.profitCentre && this.state.profitCentre.id,
      forecastStartMonthId: this.state.forecastStartMonthId,
      forecastEndMonthId: this.state.forecastEndMonthId,
      include50: this.state.include50
    };
    const onSubmit = ({
      forecastProfitCentreId,
      forecastStartMonthId,
      forecastEndMonthId,
      include50
    }) => {
      const profitCentre = this.data.profitCentres.find(
        c => c.id === forecastProfitCentreId
      );
      const {
        forecastStartDate,
        forecastEndDate,
        periodIds
      } = this.processPeriods(forecastStartMonthId, forecastEndMonthId);

      this.setState({
        profitCentre,
        forecastStartMonthId,
        forecastEndMonthId,
        forecastStartDate,
        forecastEndDate,
        include50,
        periodIds,
        currentAction: "run"
      });

      setUserPreferences(
        this.props.$global.currentUser.id,
        this.props.$models,
        {
          forecastProfitCentreId,
          forecastStartMonthId,
          forecastEndMonthId,
          pcForecastInclude50: include50
        }
      );
    };

    return (
      <Form initialValues={initialValues} onSubmit={onSubmit}>
        <Form.Field
          name="forecastProfitCentreId"
          label="Profit Centre"
          component={SelectField}
          props={{
            options: this.data.profitCentreOptions
          }}
        />
        <Form.Field
          name="forecastStartMonthId"
          label="Start Month"
          component={SelectField}
          props={{
            options: this.data.monthOptions
          }}
          validate={this.timeRangeValidator}
        />
        <Form.Field
          name="forecastEndMonthId"
          label="End Month"
          component={SelectField}
          props={{
            options: this.data.monthOptions
          }}
          validate={this.timeRangeValidator}
        />
        <Form.Field
          name="include50"
          label="Include 50%"
          component={SwitchField}
        />
        <Form.SubmitButton>
          <Button text="Run" />
        </Form.SubmitButton>
      </Form>
    );
  };

  render() {
    const {
      error,
      profitCentre,
      forecastStartDate,
      forecastEndDate,
      include50,
      periodIds,
      currentAction
    } = this.state;

    switch (currentAction) {
      case "loading": {
        return <ActivityIndicator style={{ marginTop: 30 }} />;
      }
      case "error": {
        return (
          <Container>
            <Text style={{ margin: 20 }}>{error}</Text>
          </Container>
        );
      }
      case "select": {
        return (
          <Container style={{ padding: 40, width: 400 }}>
            {this.renderSelectionForm()}
          </Container>
        );
      }
      case "run": {
        return (
          <Container>
            <ReportController
              profitCentre={profitCentre}
              startDate={forecastStartDate}
              endDate={forecastEndDate}
              include50={include50}
              periodIds={periodIds}
              setCurrentAction={currentAction =>
                this.setState({ currentAction })
              }
              $models={this.props.$models}
            />
          </Container>
        );
      }
      default:
        return null;
    }
  }
}

export default ProfitCentreForecast;

const Container = styled(View)`
  flex: 1;
`;
