import React from "react";
import { styled, View, TouchableView, Text, TextInput } from "bappo-components";
import BappoTable from "bappo-table";

function dateBetween(date1, date2) {
  return {
    beginDate: { $lt: date2 },
    endDate: { $gt: date1 }
  };
}

function sortPeriods(rawPeriods) {
  const periods = rawPeriods.slice();
  return periods.sort((p1, p2) => {
    if (p1.year !== p2.year) return +p1.year - +p2.year;
    return +p1.period - +p2.period;
  });
}

class Planner extends React.Component {
  state = {
    loading: true
  };

  componentDidMount() {
    this.loadData();
  }

  loadData = async () => {
    const { FinancialPeriod, ProjectForecastEntry } = this.props.$models;
    const { project } = this.props;

    const entries = await ProjectForecastEntry.findAll({
      where: {
        project_id: project.id
      }
    });

    if (!project.endDate || !project.startDate) {
      this.setState({
        error:
          "Cannot proceed. Please specify begin date and end date on the project master."
      });
    }

    const prds = await FinancialPeriod.findAll({
      where: dateBetween(project.startDate, project.endDate)
    });

    const periods = sortPeriods(prds);

    const cells = {};

    for (const entry of entries) {
      const key = `${entry.period_id}-${entry.forecastType}`;
      cells[key] = entry;
    }

    const headerCells = periods.map(p => p.name);
    const header = ["", ...headerCells];

    this.setState({
      project,
      periods,
      cells,
      header,
      loading: false
    });
  };

  save = async () => {
    const { ProjectForecastEntry } = this.props.$models;

    await ProjectForecastEntry.destroy({
      where: {
        project_id: this.state.project.id
      }
    });

    const data = [];

    for (const p of this.state.periods) {
      const revenue_cell = this.state.cells[`${p.id}-2`];
      const cost_cell = this.state.cells[`${p.id}-1`];
      const expense_cell = this.state.cells[`${p.id}-3`];

      if (revenue_cell) {
        data.push({
          period_id: p.id,
          project_id: this.state.project.id,
          amount: revenue_cell.amount,
          forecastType: "2"
        });
      }

      if (cost_cell) {
        data.push({
          period_id: p.id,
          project_id: this.state.project.id,
          amount: cost_cell.amount,
          forecastType: "1"
        });
      }

      if (expense_cell) {
        data.push({
          period_id: p.id,
          project_id: this.state.project.id,
          amount: expense_cell.amount,
          forecastType: "3"
        });
      }
    }

    await ProjectForecastEntry.bulkCreate(data);
    alert("saved successfully");
  };

  handleValueChange = (tableCell, v) => {
    const value = v.replace(/\D/g, "");

    const { key } = tableCell;
    const cells = { ...this.state.cells };

    cells[key] = cells[key] || {};

    cells[key].amount = value;

    this.setState({ cells });
  };

  renderCell = cell => (
    <Cell>
      <TextInput
        style={{ textAlign: "center" }}
        key={cell.period.id}
        value={cell.entry.amount}
        onValueChange={v => this.handleValueChange(cell, v)}
      />
    </Cell>
  );

  render() {
    if (this.state.error) return <Text> {this.state.error} </Text>;
    if (this.state.loading) return <Text>Loading </Text>;

    const revenueCells = this.state.periods.map(p => ({
      type: "2",
      period: p,
      key: `${p.id}-2`,
      entry: this.state.cells[`${p.id}-2`] || 0.0
    }));

    const costCells = this.state.periods.map(p => ({
      type: "1",
      period: p,
      key: `${p.id}-1`,
      entry: this.state.cells[`${p.id}-1`] || 0.0
    }));

    const expenseCells = this.state.periods.map(p => ({
      type: "1",
      period: p,
      key: `${p.id}-3`,
      entry: this.state.cells[`${p.id}-3`] || 0.0
    }));

    const rows = [this.state.header];
    rows.push(["Revenue", ...revenueCells]);
    rows.push(["Planned Cost (Roster)", ...costCells]);
    rows.push(["Overheads (hits P/L)", ...expenseCells]);

    return (
      <View>
        <BappoTable data={rows} renderCell={this.renderCell} />
        <Buttons>
          <SaveButton onPress={this.save}>Save </SaveButton>
        </Buttons>
      </View>
    );
  }
}

export default Planner;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  display: flex;
  flex: 1;
`;

const SaveButton = styled(TouchableView)`
  background-color: #f8f8f8;
  border-radius: 3px;
  width: 100px;
  justify-content: center;
  align-items: center;
  height: 50px;
  margin: 0 20px;
`;

const Buttons = styled(TouchableView)`
  flex-direction: row;
  justify-content: flex-end;
`;
