import React from "react";
import {
  styled,
  View,
  Button,
  Text,
  ActivityIndicator
} from "bappo-components";
import { setUserPreferences, getUserPreferences } from "user-preferences";
import SelectionDisplay from "selectiondisplay";
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

    if (!forecastProfitCentreId) this.setFilters();
    else {
      const profitCentre = profitCentres.find(
        pc => pc.id === forecastProfitCentreId
      );

      this.setState({
        profitCentre,
        loading: false
      });
    }
  }

  setFilters = () => {
    const { $models, $popup } = this.props;
    const { profitCentres } = this.data;

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
        }
      ],
      initialValues: {
        forecastProfitCentreId:
          this.state.profitCentre && this.state.profitCentre.id
      },
      onSubmit: ({ forecastProfitCentreId }) => {
        const profitCentre = profitCentres.find(
          c => c.id === forecastProfitCentreId
        );

        this.setState({
          profitCentre,
          loading: false
        });

        setUserPreferences(this.props.$global.currentUser.id, $models, {
          forecastProfitCentreId
        });
      }
    });
  };

  render() {
    const { loading, error, profitCentre } = this.state;

    if (loading) return <ActivityIndicator style={{ marginTop: 30 }} />;

    if (error)
      return (
        <Container>
          <Text style={{ margin: 20 }}>{error}</Text>
        </Container>
      );

    const options = [{ label: "Profit Center", value: profitCentre.name }];

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
