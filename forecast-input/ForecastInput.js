import React from "react";
import { Text, View, styled, TouchableView } from "bappo-components";
import Table from "bappo-table";
import HybridButton from "hybrid-button";
import ForecastEntryForm from "./ForecastEntryForm";

const add = "1";
const overwrite = "2";

class ForecastInput extends React.Component {
  state = {
    loading: true,
    profitCentre: this.props.selection.profitCentre,
    header: [],
    rows: []
  };

  loadData = async () => {
    const { ForecastElement, ForecastEntry, CostCenter } = this.props.$models;
    let _where = {};
    if (this.state.profitCentre.type === "1") {
      _where = { elementType: "3" };
    } else {
      _where = { elementType: "3", practiceOverheads: true };
    }
    const _els = await ForecastElement.findAll({
      where: _where
    });
    const els = _els.sort((a, b) => ~~b.elementType - ~~a.elementType);
    const sortedPeriods = this.props.selection.periods;

    // save period lookup for later use
    this.periodLookup = {};
    for (const p of sortedPeriods) {
      this.periodLookup[`${p.id}`] = p;
    }

    const periodIds = sortedPeriods.map(p => p.id);

    const costCenters = await CostCenter.findAll({
      where: {
        profitCentre_id: this.state.profitCentre.id
      }
    });

    if (costCenters.length === 0) {
      this.setState({
        loading: false,
        message: "This Profit Center does not have a Cost Center"
      });
      return;
    }
    if (costCenters.length > 1) {
      this.setState({
        loading: false,
        message:
          "This Profit Center has more than one cost center, it should have one only for now."
      });
      return;
    }

    const entries = await ForecastEntry.findAll({
      where: {
        period_id: { $in: periodIds },
        profitCentre_id: this.state.profitCentre.id
      }
    });

    const cells = {};

    for (const entry of entries) {
      const key = `${entry.period_id}-${entry.forecastElement_id}`;
      cells[key] = cells[key] || [];
      cells[key].push(entry);
    }

    const headerCells = sortedPeriods.map(p => p.name);
    const header = ["", ...headerCells];

    const rows = els.map(el => {
      const rowCells = sortedPeriods.map(p => ({
        element: el,
        period: p,
        entries: cells[`${p.id}-${el.id}`] || []
      }));
      return [el, ...rowCells];
    });

    this.setState({
      header,
      rows,
      loading: false,
      sortedPeriods,
      els,
      costCenter: costCenters[0]
    });
  };

  createNewEntry = async data => {
    const newRecords = [];
    const periodFrom = this.periodLookup[data.periodFrom_id];
    const periodTo = this.periodLookup[data.periodTo_id];
    const periodIds = [];
    for (const p of this.state.sortedPeriods) {
      if (p.name >= periodFrom.name && p.name <= periodTo.name) {
        periodIds.push(p.id);
        newRecords.push({
          period_id: p.id,
          forecastElement_id: data.forecastElement_id,
          description: data.description,
          amount: data.amount,
          profitCentre_id: this.state.profitCentre.id,
          costCenter_id: this.state.costCenter.id
        });
      }
    }

    const destroyQuery = {
      forecastElement_id: data.forecastElement_id,
      period_id: { $in: periodIds },
      profitCentre_id: this.state.profitCentre.id
    };

    if (data.method === overwrite) {
      await this.props.$models.ForecastEntry.destroy({
        where: destroyQuery
      });
    }

    await this.props.$models.ForecastEntry.bulkCreate(newRecords);
    this.loadData();
  };

  componentDidMount() {
    this.loadData();
  }

  clearRow = async forecastElement => {
    const periodIds = this.state.sortedPeriods.map(p => p.id);

    this.props.$popup.form({
      title: "Delete Inputs",
      fields: [
        {
          name: "description",
          label:
            "Description of input to delete (leave blank to clear the whole row)",
          type: "Text"
        }
      ],
      onSubmit: async ({ description }) => {
        const destroyQuery = {
          forecastElement_id: forecastElement.id,
          period_id: { $in: periodIds },
          profitCentre_id: this.state.profitCentre.id,
          description
        };

        await this.props.$models.ForecastEntry.destroy({
          where: destroyQuery
        });

        this.loadData();
      }
    });
  };

  newEntry = (values = {}) => {
    const initialValues = {
      periodFrom_id: values.periodFrom_id || this.state.sortedPeriods[0].id,
      periodTo_id:
        values.periodTo_id ||
        this.state.sortedPeriods[this.state.sortedPeriods.length - 1].id,
      forecastElement_id: values.forecastElement_id,
      description: values.description,
      amount: values.amount,
      method: add
    };
    this.props.$popup.form({
      title: "New Forecast Entry",
      fields: [
        {
          name: "periodFrom_id",
          label: "Period From",
          type: "FixedList",
          properties: {
            options: this.state.sortedPeriods.map(p => ({
              id: p.id,
              label: p.name
            }))
          }
        },
        {
          name: "periodTo_id",
          label: "Period To",
          type: "FixedList",
          properties: {
            options: this.state.sortedPeriods.map(p => ({
              id: p.id,
              label: p.name
            }))
          }
        },
        {
          name: "forecastElement_id",
          label: "Forecast Element",
          type: "FixedList",
          properties: {
            options: this.state.els.map(p => ({ id: p.id, label: p.name }))
          }
        },
        {
          name: "amount",
          label: "Amount",
          type: "Text"
        },
        {
          name: "description",
          label: "Description",
          type: "Text"
        },
        {
          name: "method",
          label: "Method",
          type: "FixedList",
          properties: {
            options: [
              { label: "Add", id: add },
              { label: "Overwrite", id: overwrite }
            ]
          }
        }
      ],
      initialValues,
      onSubmit: this.createNewEntry
    });
  };

  deleteEntry = async data => {
    await this.props.$models.ForecastEntry.destroy({ where: { id: data.id } });
    this.loadData();
    this.props.$popup.close();
  };

  saveEntry = async (data, value) => {
    this.props.$models.ForecastEntry.bulkUpdate([
      { id: data.id, amount: value }
    ]);
    this.loadData();
    this.props.$popup.close();
  };

  onCellPress = data => {
    this.props.$popup.open(
      <ForecastEntryForm
        amount={data.amount}
        handleDelete={() => this.deleteEntry(data)}
        handleSave={value => this.saveEntry(data, value)}
      />,
      { title: "Forecast Value" }
    );
  };

  renderFixedCell = (data, { rowStyle, key }) => (
    <FixedCell key={key}>
      <LabelText>{data.name}</LabelText>
      <SmallButton
        onPress={() => this.newEntry({ forecastElement_id: data.id })}
      >
        <Text>✎</Text>
      </SmallButton>
      <SmallButton onPress={() => this.clearRow(data)}>
        <Text>🗑</Text>
      </SmallButton>
    </FixedCell>
  );

  renderCell = (data, params) => {
    const { key } = params;
    if (data.entries.length === 0) {
      const default_values = {
        periodFrom_id: data.period.id,
        periodTo_id: data.period.id,
        forecastElement_id: data.element.id
      };
      return (
        <BlankCell key={key} onPress={() => this.newEntry(default_values)}>
          <Text />
        </BlankCell>
      );
    }
    return (
      <Cell key={key}>
        {data.entries.map(e => (
          <MiniCell key={e.id} onPress={() => this.onCellPress(e)}>
            <Text>{e.amount}</Text>
            <SmallText>{e.description.substring(0, 30)}</SmallText>
          </MiniCell>
        ))}
      </Cell>
    );
  };

  render() {
    if (this.state.loading) return null;

    const data = [this.state.header, ...this.state.rows];

    return (
      <Container>
        <CloseButton onPress={() => this.props.setCurrentAction("select")}>
          <Text> ← back </Text>
        </CloseButton>
        {this.state.message ? (
          <ErrorMessage>
            <Text> {this.state.message} </Text>
          </ErrorMessage>
        ) : (
          <Table
            data={data}
            renderCell={this.renderCell}
            renderFixedCell={this.renderFixedCell}
            cellWidth={200}
            fixedCellWidth={200}
          />
        )}
      </Container>
    );
  }
}

export default ForecastInput;

const Container = styled(View)`
  flex: 1;
`;

const CloseButton = styled(HybridButton)`
  margin-left: 20px;
  margin-top: 20px;
`;

const Cell = styled(View)`
  justify-content: center;
  align-items: stretch;
  display: flex;
  flex: 1;
`;

const BlankCell = styled(HybridButton)`
  justify-content: center;
  align-items: center;
  flex: 1;
  height: 40px;
`;

const SmallButton = styled(HybridButton)`
  border-radius: 3px;
  height: 30px;
  width: 30px;
  margin: 0px;
  justify-content: center;
  align-items: center;
`;

const MiniCell = styled(HybridButton)`
  height: 40px;
  margin: 2px;
  padding: 0 3px;
  justify-content: center;
  align-items: center;
  flex: 1;
  flex-direction: column;
  border-width: 1px;
  border-style: solid;
  border-color: #eee;
`;

const FixedCell = styled(View)`
  justify-content: flex-end;
  align-items: center;
  flex: none;
  width: 200px;
  flex-direction: row;
`;

const LabelText = styled(Text)`
  color: #999;
  width: 130px;
`;

const SmallText = styled(Text)`
  color: #aaa;
  font-size: 10px;
`;

const ErrorMessage = styled(View)`
  margin: 20px;
  background-color: #eee;
  padding: 20px;
  border-radius: 3px;
  align-items: center;
`;
