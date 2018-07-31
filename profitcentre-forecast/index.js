import React from "react";
import moment from "moment";
import {
  styled,
  View,
  Button,
  Text,
  ActivityIndicator
} from "bappo-components";
import { setUserPreferences, getUserPreferences } from "user-preferences";
import SelectionDisplay from "selectiondisplay";
import { sortPeriods, getAuthorisedProfitCentres } from "forecast-utils";
import ReportController from "./ReportController";

class ProfitCentreForecast extends React.Component {
  data = {
    profitCentres: []
  };

  state = {
    loading: true,
    error: null,
    profitCentre: null,
    forecastStartDate: null,
    forecastEndDate: null,
    include50: false,
    currentAction: "select"
  };

  async componentDidMount() {
    // Get user identity
    const { id: user_id } = this.props.$global.currentUser;
    const { $models } = this.props;

    const { error, profitCentres } = await getAuthorisedProfitCentres({
      $models,
      user_id
    });

    if (error) return this.setState({ loading: false, error });
    this.data.profitCentres = profitCentres;

    // Financial periods and User preferences
    const promises = [
      $models.FinancialPeriod.findAll({}),
      getUserPreferences(user_id, $models)
    ];

    const [periods, prefs] = await Promise.all(promises);
    this.data.periods = sortPeriods(periods);

    this.data.monthOptions = this.data.periods.map((p, index) => ({
      id: p.id,
      label: p.name,
      pos: index
    }));

    const {
      forecastProfitCentreId,
      forecastStartMonthId,
      forecastEndMonthId,
      pcForecastInclude50: include50
    } = prefs;

    if (!(forecastProfitCentreId && forecastStartMonthId && forecastEndMonthId))
      this.setFilters();
    else {
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
        loading: false
      });
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
    if (startOption && endOption && endOption.pos < startOption.pos)
      return "Invalid time range";
    return undefined;
  };

  setFilters = () => {
    const { $models, $popup } = this.props;
    const { profitCentres, monthOptions } = this.data;

    const profitCentreOptions = profitCentres.map((c, index) => ({
      id: c.id,
      label: c.name,
      pos: index
    }));

    $popup.form({
      title: "Select Profit Centre and Time Range",
      fields: [
        {
          name: "forecastProfitCentreId",
          label: "ProfitCentre",
          type: "FixedList",
          properties: {
            options: profitCentreOptions
          }
        },
        {
          name: "forecastStartMonthId",
          label: "Start Month",
          type: "FixedList",
          properties: {
            options: monthOptions
          },
          validate: this.timeRangeValidator
        },
        {
          name: "forecastEndMonthId",
          label: "End Month",
          type: "FixedList",
          properties: {
            options: monthOptions
          },
          validate: this.timeRangeValidator
        },
        {
          name: "include50",
          label: "Include 50%",
          type: "Checkbox"
        }
      ],
      initialValues: {
        forecastProfitCentreId:
          this.state.profitCentre && this.state.profitCentre.id,
        forecastStartMonthId: this.state.forecastStartMonthId,
        forecastEndMonthId: this.state.forecastEndMonthId,
        include50: this.state.include50
      },
      onSubmit: ({
        forecastProfitCentreId,
        forecastStartMonthId,
        forecastEndMonthId,
        include50
      }) => {
        const profitCentre = profitCentres.find(
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
          loading: false
        });

        setUserPreferences(this.props.$global.currentUser.id, $models, {
          forecastProfitCentreId,
          forecastStartMonthId,
          forecastEndMonthId,
          pcForecastInclude50: include50
        });
      }
    });
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

  render() {
    const {
      loading,
      error,
      profitCentre,
      forecastStartDate,
      forecastEndDate,
      include50,
      periodIds
    } = this.state;

    if (loading) return <ActivityIndicator style={{ marginTop: 30 }} />;

    if (error)
      return (
        <Container>
          <Text style={{ margin: 20 }}>{error}</Text>
        </Container>
      );

    const daterangetxt = `${forecastStartDate.format(
      "MMM YYYY"
    )} to ${forecastEndDate.format("MMM YYYY")}`;

    const options = [
      { label: "Profit Centre", value: profitCentre.name },
      { label: "Date Range", value: daterangetxt },
      { label: "Include 50%", value: include50 ? "Yes" : "No" }
    ];

    if (this.state.currentAction === "select") {
      return (
        <Container>
          <SelectionDisplay
            options={options}
            onChangeClick={() => this.setFilters()}
          />
          <RunButton onPress={() => this.setState({ currentAction: "run" })}>
            <RunButtonText> Run </RunButtonText>
          </RunButton>
        </Container>
      );
    }

    if (this.state.currentAction === "run") {
      return (
        <Container>
          <ReportController
            profitCentre={profitCentre}
            startDate={forecastStartDate}
            endDate={forecastEndDate}
            include50={include50}
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
