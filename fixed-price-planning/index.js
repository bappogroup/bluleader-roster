import React from "react";
import {
  styled,
  View,
  Text,
  ActivityIndicator,
  Form,
  SelectField
} from "bappo-components";
import { setUserPreferences, getUserPreferences } from "user-preferences";
import { getAuthorisedProfitCentres } from "forecast-utils";
import FixedPriceProjects from "./FixedPriceProjects";

class Main extends React.Component {
  data = {
    profitCentres: []
  };

  state = {
    loading: true,
    error: null,
    profitCentre: null,
    currentAction: "select"
  };

  async componentDidMount() {
    const { error, profitCentres } = await getAuthorisedProfitCentres({
      $models: this.props.$models,
      user_id: this.props.$global.currentUser.id
    });

    if (error) return this.setState({ loading: false, error });

    this.data.profitCentres = profitCentres;

    const prefs = await getUserPreferences(
      this.props.$global.currentUser.id,
      this.props.$models
    );

    const { forecastProfitCentreId } = prefs;

    if (forecastProfitCentreId) {
      const profitCentre = profitCentres.find(
        pc => pc.id === forecastProfitCentreId
      );

      this.setState({
        profitCentre,
        loading: false
      });
    } else {
      this.setState({ loading: false });
    }
  }

  renderSelectionForm = () => {
    const initialValues = {
      forecastProfitCentreId:
        this.state.profitCentre && this.state.profitCentre.id
    };
    const onSubmit = ({ forecastProfitCentreId }) => {
      const profitCentre = this.data.profitCentres.find(
        c => c.id === forecastProfitCentreId
      );

      this.setState({
        profitCentre,
        loading: false,
        currentAction: "run"
      });

      setUserPreferences(
        this.props.$global.currentUser.id,
        this.props.$models,
        { forecastProfitCentreId }
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
      return (
        <Container>
          <FixedPriceProjects
            {...this.props}
            profitCentre={this.state.profitCentre}
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
