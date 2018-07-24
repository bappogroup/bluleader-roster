import React from "react";
import moment from "moment";
import { styled, View, Button, Text } from "bappo-components";
import { setUserPreferences, getUserPreferences } from "user-preferences";
import SelectionDisplay from "selectiondisplay";
import { sortPeriods } from "forecast-utils";
import ForecastInput from "./ForecastInput";

const SETNAME = "forecaset_input";

class Main extends React.Component {
  data = {
    profitCentres: []
  };

  state = {
    profitCentre: null,
    forecastStartDate: null,
    forecastEndDate: null,
    currentAction: "select"
  };

  async componentDidMount() {
    // Load filter options
    const promises = [];
    promises.push(
      this.props.$models.ProfitCentre.findAll({
        limit: 1000
      })
    );
    promises.push(
      this.props.$models.FinancialPeriod.findAll({
        limit: 1000
      })
    );
    const [profitCentres, periods] = await Promise.all(promises);

    // Sort periods
    this.data.periods = sortPeriods(periods);

    this.data.monthOptions = this.data.periods.map((p, index) => ({
      id: p.id,
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
        periodIds
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
        }
      ],
      initialValues: {
        forecastProfitCentreId:
          this.state.profitCentre && this.state.profitCentre.id,
        forecastStartMonthId: this.state.forecastStartMonthId,
        forecastEndMonthId: this.state.forecastEndMonthId
      },
      onSubmit: ({
        forecastProfitCentreId,
        forecastStartMonthId,
        forecastEndMonthId
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
          periodIds
        });

        setUserPreferences(
          this.props.$global.currentUser.id,
          $models,
          {
            forecastProfitCentreId,
            forecastStartMonthId,
            forecastEndMonthId
          },
          {
            setname: SETNAME
          }
        );
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
      profitCentre,
      forecastStartDate,
      forecastEndDate,
      periodIds
    } = this.state;
    if (
      !(
        profitCentre &&
        forecastStartDate &&
        forecastEndDate &&
        periodIds.length
      )
    )
      return null;

    const options = [
      { label: "Profit Center", value: profitCentre.name },
      {
        label: "Periods",
        value: `${forecastStartDate.format(
          "MMM YY"
        )} to ${forecastEndDate.format("MMM YY")}`
      }
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
      const selection = {
        profitCentre: this.state.profitCentre
      };

      selection.periodFrom = this.data.periods.find(
        p => p.id == this.state.forecastStartMonthId
      );
      selection.periodTo = this.data.periods.find(
        p => p.id == this.state.forecastEndMonthId
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
