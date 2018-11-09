import React from "react";
import moment from "moment";
import {
  styled,
  View,
  Text,
  ActivityIndicator,
  Form,
  SelectField
} from "bappo-components";
import { setUserPreferences, getUserPreferences } from "user-preferences";
import { sortPeriods, getAuthorisedProfitCentres } from "forecast-utils";
import ForecastInput from "./ForecastInput";

const SETNAME = "forecaset_input";

class Main extends React.Component {
  data = {
    profitCentres: []
  };

  state = {
    loading: true,
    error: null,
    profitCentre: null,
    forecastStartDate: null,
    forecastEndDate: null,
    currentAction: "select"
  };

  async componentDidMount() {
    const { error, profitCentres } = await getAuthorisedProfitCentres({
      $models: this.props.$models,
      user_id: this.props.$global.currentUser.id
    });

    if (error) return this.setState({ loading: false, error });

    // Load filter options
    const periods = await this.props.$models.FinancialPeriod.findAll({
      limit: 1000
    });

    // Sort periods
    this.data.periods = sortPeriods(periods);

    this.data.monthOptions = this.data.periods.map((p, index) => ({
      value: p.id,
      label: p.name,
      pos: index
    }));
    this.data.profitCentres = profitCentres;

    // Load user preferences
    const prefs = await getUserPreferences(
      this.props.$global.currentUser.id,
      this.props.$models,
      {
        setname: SETNAME
      }
    );
    const {
      forecastProfitCentreId,
      forecastStartMonthId,
      forecastEndMonthId
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
        periodIds,
        loading: false
      });
    } else {
      this.setState({ loading: false });
    }
  }

  timeRangeValidator = (value, formValues) => {
    if (!value) return "Required";
    const startOption = this.data.monthOptions.find(
      m => m.id === formValues.forecastStartMonthId
    );
    const endOption = this.data.monthOptions.find(
      m => m.id === formValues.forecastEndMonthId
    );
    if (startOption && endOption && endOption.pos < startOption.pos) {
      return "Invalid time range";
    }
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
      forecastEndMonthId: this.state.forecastEndMonthId
    };
    const onSubmit = ({
      forecastProfitCentreId,
      forecastStartMonthId,
      forecastEndMonthId
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
        periodIds,
        loading: false,
        currentAction: "run"
      });

      setUserPreferences(
        this.props.$global.currentUser.id,
        this.props.$models,
        {
          forecastProfitCentreId,
          forecastStartMonthId,
          forecastEndMonthId
        },
        {
          setname: SETNAME
        }
      );
    };

    return (
      <Form
        initialValues={initialValues}
        onSubmit={onSubmit}
        style={{ width: 300 }}
      >
        <Form.Field
          name="forecastProfitCentreId"
          label="Profit Center"
          component={SelectField}
          props={{
            options: this.data.profitCentres.map((c, index) => ({
              value: c.id,
              label: c.name,
              pos: index
            }))
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
        <SubmitButton>
          <Text style={{ color: "white" }}>Run</Text>
        </SubmitButton>
      </Form>
    );
  };

  render() {
    const { loading, error } = this.state;

    if (loading) return <ActivityIndicator style={{ marginTop: 30 }} />;

    if (error)
      return (
        <Container>
          <Text style={{ margin: 20 }}>{error}</Text>
        </Container>
      );

    if (this.state.currentAction === "select") {
      return <SelectContainer>{this.renderSelectionForm()}</SelectContainer>;
    }

    if (this.state.currentAction === "run") {
      const selection = {
        profitCentre: this.state.profitCentre
      };

      selection.periodFrom = this.data.periods.find(
        p => p.id === this.state.forecastStartMonthId
      );
      selection.periodTo = this.data.periods.find(
        p => p.id === this.state.forecastEndMonthId
      );
      selection.periods = this.data.periods.filter(
        p =>
          p.name >= selection.periodFrom.name &&
          p.name <= selection.periodTo.name
      );

      return (
        <Container>
          <ForecastInput
            {...this.props}
            selection={selection}
            periods
            setCurrentAction={currentAction => this.setState({ currentAction })}
          />
        </Container>
      );
    }

    return null;
  }
}

export default Main;

const Container = styled(View)`
  flex: 1;
`;

const SelectContainer = styled(View)`
  flex: 1;
  align-items: center;
  margin-top: 40px;
`;

const SubmitButton = styled(Form.SubmitButton)`
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.bappo.primaryColor};
  border-radius: 4px;
  height: 48px;
`;
