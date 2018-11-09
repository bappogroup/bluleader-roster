import React from "react";
import { styled, View, TouchableView, Text, TextInput } from "bappo-components";
import BappoTable from "bappo-table";
import formatNumber from "./formatNumber";
import { OldSelect } from "bappo-components";

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
    const {
      FinancialPeriod,
      ProjectForecastEntry,
      Probability,
      Project
    } = this.props.$models;
    // const { project } = this.props;

    const project = await Project.findById(this.props.project.id);

    const entries = await ProjectForecastEntry.findAll({
      where: {
        project_id: project.id
      }
    });

    const probs = await Probability.findAll();
    const prob_options = probs
      .sort((a, b) => ~~a.sortNumber - ~~b.sortNumber)
      .map(p => ({ value: p.id, label: p.name }));

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
      const e = { ...entry };
      e.amount = `${~~e.amount}`;
      cells[key] = e;
    }

    const headerCells = periods.map(p => p.name);
    const header = ["", ...headerCells];

    this.setState({
      project,
      periods,
      cells,
      header,
      probability_id: project.probability_id,
      prob_options,
      loading: false
    });
  };

  save = async () => {
    const { ProjectForecastEntry, Project } = this.props.$models;

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
    await Project.update(
      { probability_id: this.state.probability_id },
      {
        where: {
          id: this.state.project.id
        }
      }
    );

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

  renderCell = (cell, options) => {
    const Cell = options.Cell;
    if (cell.type === "margin")
      return (
        <Cell justifyRight={true}>
          <MarginText>{cell.margin}</MarginText>
        </Cell>
      );

    return (
      <Cell>
        <Input
          key={cell.period.id}
          value={cell.entry.amount}
          onValueChange={v => this.handleValueChange(cell, v)}
        />
      </Cell>
    );
  };

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

    let totalMargin = 0;
    let totalRevenue = 0;
    const marginCells = this.state.periods.map(p => {
      const expenseEntry = this.state.cells[`${p.id}-3`];
      const costEntry = this.state.cells[`${p.id}-1`];
      const revenueEntry = this.state.cells[`${p.id}-2`];
      const exp = ~~(expenseEntry && expenseEntry.amount);
      const cost = ~~(costEntry && costEntry.amount);
      const rev = ~~(revenueEntry && revenueEntry.amount);
      const margin = rev - (cost + exp);
      totalMargin += margin;
      totalRevenue += rev;

      return {
        type: "margin",
        margin: margin
      };
    });

    const rows = [this.state.header];
    rows.push({ rowStyle: "none", data: ["Revenue", ...revenueCells] });
    rows.push({
      rowStyle: "none",
      data: ["Planned Cost (Roster)", ...costCells]
    });
    rows.push({
      rowStyle: "none",
      data: ["Fixed price Costs (hits P/L)", ...expenseCells]
    });
    rows.push({ rowStyle: "total", data: ["Margin", ...marginCells] });

    return (
      <Container style={{ flex: 1 }}>
        <Header>
          <BackButton onPress={this.props.onClose}>
            {" "}
            <Text> ← Back to Projects </Text>{" "}
          </BackButton>
        </Header>
        <TableContainer>
          <BappoTable data={rows} renderCell={this.renderCell} />
        </TableContainer>
        <TotalsContainer>
          <TotalContainer>
            <Label>Project Revenue</Label>{" "}
            <Text>{formatNumber(totalRevenue)}</Text>
          </TotalContainer>
          <TotalContainer>
            <Label>Project Margin</Label>{" "}
            <Text>{formatNumber(totalMargin)}</Text>
          </TotalContainer>
        </TotalsContainer>
        <View>
          <TotalContainer>
            <Label>Probability</Label>
            <Select
              options={this.state.prob_options}
              value={this.state.probability_id}
              onValueChange={v => this.setState({ probability_id: v })}
            />
          </TotalContainer>
        </View>
        <ButtonContainer>
          <SaveButton onPress={this.save}>
            <Text>Save</Text>
          </SaveButton>
        </ButtonContainer>
      </Container>
    );
  }
}

export default Planner;

const Container = styled(View)`
  justify-content: flex-begin;
`;

const TableContainer = styled(View)`
  height: 260px;
`;

const Select = styled(OldSelect)`
  width: 100px;
`;

// const Cell = styled(View)`
//   justify-content: center;
//   align-items: flex-end;
//   display: flex;
//   width: 150px;
//   flex-shrink: 1;
//   margin: 0 4px;
//   overflow: hidden;
// `;

const MarginText = styled(Text)`
  flex: 1;
  margin-right: 12px;
  text-align: right;
`;

const TotalContainer = styled(View)`
  margin: 0 10px 5px 10px;
  padding: 10px 20px;
  flex-direction: row;
  border-color: #f8f8f8;
  border-style: solid;
  border-width: 1px;
`;

const Label = styled(Text)`
  color: #999;
  width: 150px;
`;

const TotalsContainer = styled(View)`
  margin-top: 10px;
`;

const Total = styled(View)`
  border
`;

const SaveButton = styled(TouchableView)`
  background-color: #f8f8f8;
  border-radius: 3px;
  flex: 1;
  justify-content: center;
  align-items: center;
  height: 50px;
`;

const Header = styled(View)`
  flex: none;
  height: 40px;
  padding: 0 10px;
`;

const BackButton = styled(TouchableView)`
  flex: none;
  height: 40px;
  justify-content: center;
  align-items: flex-start;
  width: 200px;
`;

const ButtonContainer = styled(View)`
  display: flex;
  flex-direction: row;
  justify-content: center;
  padding: 0 10px;
  margin-top: 15px;
`;

const Input = styled(TextInput)`
  text-align: right;
  border-color: #ddd;
  border-style: solid;
  border-width: 1px;
  width: 100%;
  height: 24px;
  padding-right: 10px;
`;
