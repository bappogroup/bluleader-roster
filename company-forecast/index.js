import React from "react";
import moment from "moment";
import {
  styled,
  ActivityIndicator,
  View,
  Form,
  SelectField,
  SwitchField,
  Text
} from "bappo-components";
import { setUserPreferences, getUserPreferences } from "user-preferences";
import { sortPeriods } from "forecast-utils";
import ReportController from "./ReportController";

class CompanyForecast extends React.Component {
  data = {
    companies: [],
    companyOptions: [],
    periods: [],
    monthOptions: []
  };

  state = {
    company: null,
    forecastStartDate: null,
    forecastEndDate: null,
    include50: false,
    currentAction: "loading"
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

    // Set this.data
    this.data.periods = sortPeriods(periods);
    this.data.monthOptions = this.data.periods.map((p, index) => ({
      value: p.id,
      label: p.name,
      pos: index
    }));
    this.data.companies = companies;
    const companyOptions = companies.map((c, index) => ({
      value: c.id,
      label: c.name,
      pos: index
    }));
    this.data.companyOptions = companyOptions;

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

    if (forecastCompanyId && forecastStartMonthId && forecastEndMonthId) {
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
      forecastCompanyId: this.state.company && this.state.company.id,
      forecastStartMonthId: this.state.forecastStartMonthId,
      forecastEndMonthId: this.state.forecastEndMonthId,
      include50: this.state.include50
    };
    const onSubmit = ({
      forecastCompanyId,
      forecastStartMonthId,
      forecastEndMonthId,
      include50
    }) => {
      const company = this.data.companies.find(c => c.id === forecastCompanyId);
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
        periodIds,
        currentAction: "run"
      });

      setUserPreferences(
        this.props.$global.currentUser.id,
        this.props.$models,
        {
          forecastCompanyId,
          forecastStartMonthId,
          forecastEndMonthId,
          companyForecastInclude50: include50
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
          name="forecastCompanyId"
          label="Company"
          component={SelectField}
          props={{
            options: this.data.companyOptions
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
        <SubmitButton>
          <Text style={{ color: "white" }}>Run</Text>
        </SubmitButton>
      </Form>
    );
  };

  render() {
    const {
      company,
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
      case "select": {
        return <SelectContainer>{this.renderSelectionForm()}</SelectContainer>;
      }
      case "run": {
        if (
          company &&
          forecastStartDate &&
          forecastEndDate &&
          periodIds.length
        ) {
          return (
            <ReportController
              title={`Company: ${company.name}`}
              company={company}
              startDate={forecastStartDate}
              endDate={forecastEndDate}
              include50={include50}
              periodIds={periodIds}
              setCurrentAction={currentAction =>
                this.setState({ currentAction })
              }
              $models={this.props.$models}
            />
          );
        }
        return null;
      }
      default:
        return null;
    }
  }
}

export default CompanyForecast;

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
