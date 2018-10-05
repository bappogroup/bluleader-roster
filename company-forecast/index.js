import React from "react";
import moment from "moment";
import { styled, View, Text } from "bappo-components";
import { setUserPreferences, getUserPreferences } from "user-preferences";
import SelectionDisplay from "selectiondisplay";
import { sortPeriods } from "forecast-utils";
import HybridButton from "hybrid-button";
import ReportController from "./ReportController";

class CompanyForecast extends React.Component {
  data = {
    companies: []
  };

  state = {
    company: null,
    forecastStartDate: null,
    forecastEndDate: null,
    include50: false,
    currentAction: "select"
  };

  async componentDidMount() {
    // Load company options
    const promises = [];
    promises.push(
      this.props.$models.Company.findAll({
        limit: 1000
      })
    );
    promises.push(
      this.props.$models.FinancialPeriod.findAll({
        limit: 1000
      })
    );
    const [companies, periods] = await Promise.all(promises);

    // Sort periods
    this.data.periods = sortPeriods(periods);

    this.data.monthOptions = this.data.periods.map((p, index) => ({
      id: p.id,
      label: p.name,
      pos: index
    }));
    this.data.companies = companies;

    // Load user preferences
    const prefs = await getUserPreferences(
      this.props.$global.currentUser.id,
      this.props.$models
    );
    const {
      forecastCompanyId,
      forecastStartMonthId,
      forecastEndMonthId,
      companyForecastInclude50: include50
    } = prefs;

    if (!(forecastCompanyId && forecastStartMonthId && forecastEndMonthId))
      this.setFilters();
    else {
      const company = companies.find(c => c.id === forecastCompanyId);
      const {
        forecastStartDate,
        forecastEndDate,
        periodIds
      } = this.processPeriods(forecastStartMonthId, forecastEndMonthId);
      this.setState({
        company,
        forecastStartMonthId,
        forecastEndMonthId,
        forecastStartDate,
        forecastEndDate,
        include50,
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
    const { companies, monthOptions } = this.data;

    const companyOptions = companies.map((c, index) => ({
      id: c.id,
      label: c.name,
      pos: index
    }));

    $popup.form({
      title: "Select Company and Time Range",
      fields: [
        {
          name: "forecastCompanyId",
          label: "Company",
          type: "FixedList",
          properties: {
            options: companyOptions
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
        forecastCompanyId: this.state.company && this.state.company.id,
        forecastStartMonthId: this.state.forecastStartMonthId,
        forecastEndMonthId: this.state.forecastEndMonthId,
        include50: this.state.include50
      },
      onSubmit: ({
        forecastCompanyId,
        forecastStartMonthId,
        forecastEndMonthId,
        include50
      }) => {
        const company = companies.find(c => c.id === forecastCompanyId);
        const {
          forecastStartDate,
          forecastEndDate,
          periodIds
        } = this.processPeriods(forecastStartMonthId, forecastEndMonthId);

        this.setState({
          company,
          forecastStartMonthId,
          forecastEndMonthId,
          forecastStartDate,
          forecastEndDate,
          include50,
          periodIds
        });

        setUserPreferences(this.props.$global.currentUser.id, $models, {
          forecastCompanyId,
          forecastStartMonthId,
          forecastEndMonthId,
          companyForecastInclude50: include50
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
      company,
      forecastStartDate,
      forecastEndDate,
      include50,
      periodIds
    } = this.state;
    if (!(company && forecastStartDate && forecastEndDate && periodIds.length))
      return null;

    const daterangetxt = `${forecastStartDate.format(
      "MMM YY"
    )} to ${forecastEndDate.format("MMM YY")}`;

    const options = [
      { label: "Company", value: company.name },
      { label: "Date Range", value: daterangetxt },
      { label: "Include 50%", value: include50 ? "Yes" : "No" }
    ];

    const title = `Company: ${company.name}`;
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
            title={title}
            company={company}
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

export default CompanyForecast;

const Container = styled(View)`
  flex: 1;
`;

const RunButton = styled(HybridButton)`
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
