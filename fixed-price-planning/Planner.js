import React from 'react';
import { styled, View, Button, Text, TextInput } from 'bappo-components';
import BappoTable from 'bappo-table';

class Planner extends React.Component {
  state = {
    loading: true,
  };

  componentDidMount() {
    this.loadData();
  }

  loadData = async () => {
    const { Project, FinancialPeriod, ProjectForecastEntry } = this.props.$models;
    const project = this.props.project;

    const entries = await ProjectForecastEntry.findAll({
      where: {
        project_id: project.id,
      },
    });

    if (!project.endDate || !project.startDate) {
      this.setState({
        error: 'Cannot proceed. Please specify begin date and end date on the project master.',
      });
    }

    const prds = await FinancialPeriod.findAll({
      where: dateBetween(project.startDate, project.endDate),
    });

    const periods = orderPeriods(prds);

    const cells = {};

    for (const entry of entries) {
      const key = `${entry.period_id}-${entry.forecastType}`;
      cells[key] = entry;
    }

    const headerCells = periods.map(p => p.name);
    const header = ['', ...headerCells];

    this.setState({
      project,
      periods,
      cells,
      header,
      loading: false,
    });
  };

  save = async () => {
    const { ProjectForecastEntry } = this.props.$models;

    await ProjectForecastEntry.destroy({
      where: {
        project_id: this.state.project.id,
      },
    });

    const data = [];

    for (let p of this.state.periods) {
      const revenue_cell = this.state.cells[`${p.id}-1`];
      const cost_cell = this.state.cells[`${p.id}-2`];

      if (revenue_cell) {
        data.push({
          period_id: p.id,
          project_id: this.state.project.id,
          amount: revenue_cell.amount,
          forecastType: '1',
        });
      }

      if (cost_cell) {
        data.push({
          period_id: p.id,
          project_id: this.state.project.id,
          amount: cost_cell.amount,
          forecastType: '2',
        });
      }
    }

    await ProjectForecastEntry.bulkCreate(data);
    alert('saved successfully');
  };

  handleValueChange = (tableCell, v) => {
    const value = v.replace(/\D/g, '');

    const key = tableCell.key;
    const cells = { ...this.state.cells };

    cells[key] = cells[key] || {};

    cells[key].amount = value;

    this.setState({ cells });
  };

  renderCell = cell => {
    return (
      <Cell>
        <TextInput
          key={cell.period.id}
          value={cell.entry.amount}
          onValueChange={v => this.handleValueChange(cell, v)}
        />
      </Cell>
    );
  };

  renderEntry = entry => {
    return (
      <View>
        <Text>{entry.amount}</Text>
      </View>
    );
  };

  render() {
    if (this.state.error) return <Text> {this.state.error} </Text>;
    if (this.state.loading) return <Text>Loading </Text>;

    const revenueCells = this.state.periods.map(p => ({
      type: '1',
      period: p,
      key: `${p.id}-1`,
      entry: this.state.cells[`${p.id}-1`] || 0.0,
    }));

    const costCells = this.state.periods.map(p => ({
      type: '2',
      period: p,
      key: `${p.id}-2`,
      entry: this.state.cells[`${p.id}-2`] || 0.0,
    }));

    const rows = [this.state.header];
    rows.push(['Revenue', ...revenueCells]);
    rows.push(['Cost', ...costCells]);

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

const dateBetween = (date1, date2) => {
  return {
    beginDate: { $lt: date2 },
    endDate: { $gt: date1 },
  };
};

const orderPeriods = periods => {
  return periods.sort((p1, p2) => {
    if (p1.name > p2.name) return 1;
    return -1;
  });
};

const Cell = styled(View)`
  justify-content: center;
  align-items: stretch;
  display: flex;
  flex: 1;
`;

const SaveButton = styled(Button)`
  background-color: #f8f8f8;
  border-radius: 3px;
  width: 100px;
  justify-content: center;
  align-items: center;
  height: 50px;
  margin: 0 20px;
`;

const Buttons = styled(Button)`
  flex-direction: row;
  justify-content: flex-end;
`;
