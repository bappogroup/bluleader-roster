import React from "react";
import {
  View,
  Text,
  TouchableView,
  styled,
  ScrollView
} from "bappo-components";
import HybridButton from "hybrid-button";

function formatNumber(n) {
  const num = +n;
  if (Number.isNaN(num)) return n;
  // if (number % 1 === 0) return n;
  // return number.toFixed(2);
  const c = 2;
  const d = ".";
  const t = ",";
  const s = n < 0 ? "-" : "";
  const i = String(parseInt((n = Math.abs(Number(n) || 0).toFixed(c))));
  let j = i.length;
  j = j > 3 ? j % 3 : 0;
  return (
    s +
    (j ? i.substr(0, j) + t : "") +
    i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
    (c
      ? d +
        Math.abs(n - i)
          .toFixed(c)
          .slice(2)
      : "")
  );
}

class Table extends React.Component {
  state = {
    fixedCols: this.props.fixedCols || 1,
    firstCol: this.props.fixedCols || 1,
    colCount: 3,
    screenWidth: 300,
    cellWidth: this.props.cellWidth || 100,
    fixedCellWidth: this.props.fixedCellWidth || 150
  };

  renderFixedHeaderCell =
    this.props.renderFixedHeaderCell ||
    ((data, { rowStyle, key }) => (
      <FixedCell
        key={key}
        style={{ width: this.state.fixedCellWidth }}
        rowStyle={rowStyle}
      >
        <HeaderText>{data}</HeaderText>
      </FixedCell>
    ));

  renderFixedCell =
    this.props.renderFixedCell ||
    ((data, { rowStyle, key }) => (
      <FixedCell
        key={key}
        style={{ width: this.state.fixedCellWidth }}
        rowStyle={rowStyle}
      >
        <LabelText rowStyle={rowStyle}>{data}</LabelText>
      </FixedCell>
    ));

  renderHeaderCell =
    this.props.renderHeaderCell ||
    ((data, { rowStyle, key }) => (
      <Cell key={key} rowStyle={rowStyle} justifyRight={true}>
        <HeaderText justifyRight={true}>{data}</HeaderText>
      </Cell>
    ));

  renderCell =
    this.props.renderCell ||
    ((data, { rowStyle, key }) => {
      const justifyRight = !Number.isNaN(+data);
      return (
        <Cell key={key} rowStyle={rowStyle} justifyRight={justifyRight}>
          <CellText rowStyle={rowStyle} justifyRight={justifyRight}>
            {formatNumber(data)}
          </CellText>
        </Cell>
      );
    });

  onLayout = params => {
    const screenWidth = params.nativeEvent.layout.width - 40;
    const colCount = Math.round(
      (screenWidth - this.state.fixedCellWidth * this.state.fixedCols) /
        this.state.cellWidth
    );
    this.setState({
      screenWidth,
      colCount
    });
  };

  scrollHorizontally = n => {
    const firstCol = Math.max(
      this.state.fixedCols,
      Math.min(
        this.state.firstCol + n,
        this.props.data[0].length - this.state.colCount
      )
    );
    this.setState({ firstCol });
  };

  renderRowInner = (row, i) => {
    let cells;
    let rowStyle;
    let otherProperties;

    if (row.constructor === Object) {
      const { data, ...others } = row;
      cells = data;
      otherProperties = others;
      rowStyle = row.rowStyle || "data";
    } else {
      cells = row;
      rowStyle = "data";
    }

    const renderCell =
      rowStyle === "header" ? this.renderHeaderCell : this.renderCell;
    const renderFixedCell =
      rowStyle === "header" ? this.renderFixedHeaderCell : this.renderFixedCell;

    return (
      <RowInner rowStyle={rowStyle} key={i}>
        {cells.slice(0, this.state.fixedCols).map((data, index) =>
          renderFixedCell(data, {
            rowStyle,
            key: `f${index}`,
            index: index + this.state.firstCol - 1,
            ...otherProperties
          })
        )}
        {cells
          .slice(this.state.firstCol, this.state.firstCol + this.state.colCount)
          .map((data, index) =>
            renderCell(data, {
              Cell,
              rowStyle,
              key: `c${index}`,
              index: index + this.state.firstCol - 1,
              ...otherProperties
            })
          )}
      </RowInner>
    );
  };

  renderRow = props =>
    props.onPress ? (
      <DrillDownRow onPress={() => props.onPress(props)}>
        {this.renderRowInner(props)}
      </DrillDownRow>
    ) : (
      <Row>{this.renderRowInner(props)}</Row>
    );

  renderHeaderRow = props => <Row>{this.renderRowInner(props)}</Row>;

  renderBlankRow = () => (
    <Row>
      <RowInner />
    </Row>
  );

  render() {
    const { data } = this.props;

    if (!data || data.length < 1) {
      return (
        <View>
          <Text> No Data </Text>
        </View>
      );
    }

    return (
      <Container onLayout={this.onLayout}>
        <NavBar>
          <NavButton onPress={() => this.scrollHorizontally(-1)}>
            <NavButtonText>←</NavButtonText>
          </NavButton>
          <NavButton onPress={() => this.scrollHorizontally(1)}>
            <NavButtonText>→</NavButtonText>
          </NavButton>
        </NavBar>
        <TableContainer>
          <TableHeader>
            {this.renderHeaderRow({ data: data[0], rowStyle: "header" })}
          </TableHeader>
          <TableBody>
            {data.slice(1).map(this.renderRow)}
            {this.renderBlankRow()}
          </TableBody>
        </TableContainer>
      </Container>
    );
  }
}

export default Table;

const Container = styled(View)`
  flex: 1;
`;

const cssForData = `
  border-bottom-width: 0;
  border-top-width: 1px;
  border-left-width: 0;
  border-right-width: 0;
  border-color: #eee;
  border-style: solid;
`;

const cssForBold = `
  font-weight:bold;
`;

const cssForTotal = `
  border-bottom-width: 2px;
  border-top-width: 2px;
  border-left-width: 0;
  border-right-width: 0;
  border-color: #888;
  border-style: solid;
`;

const cssForHeader = `
  height: 40px;
  background-color: #888;
`;

const TableContainer = styled(View)`
  flex: 1;
  margin-left: 10px;
  margin-right: 10px;
`;

const TableHeader = styled(View)`
  flex: none;
  height: 40px;
`;

const TableBody = styled(ScrollView)`
  flex: 1;
`;

const Row = styled(View)``;

const DrillDownRow = styled(HybridButton)``;

const RowInner = styled(View)`
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 40px;
  justify-content: flex-start;
  align-items: center;
  ${props => props.rowStyle === "data" && cssForData}
  ${props => props.rowStyle === "bold" && cssForData}
  ${props => props.rowStyle === "total" && cssForTotal}
  ${props => props.rowStyle === "header" && cssForHeader}
`;

const FixedCell = styled(View)`
  justify-content: center;
  align-items: flex-start;
  flex: none;
  width: 150px;
  padding-left: 20px;
  padding-right: 10px;
`;

const Cell = styled(View)`
  justify-content: center;
  align-items: ${props => (props.justifyRight ? "flex-end" : "flex-start")};
  width: 150px;
  flex-shrink: 1;
  flex-grow: none;
  ${props => props.rowStyle === "bold" && cssForBold};
  padding-right: 10px;
  flex-wrap: nowrap;
`;

const CellText = styled(Text)`
  color: ${props => (props.rowStyle === "total" ? "black" : "#aae")};
  text-align: ${props => (props.justifyRight ? "right" : "left")};
`;

const LabelText = styled(Text)`
  color: ${props => (props.rowStyle === "total" ? "black" : "#aae")};
`;

const HeaderText = styled(Text)`
  display: flex;
  flex: 1;
  color: white;
  text-align: ${props => (props.justifyRight ? "right" : "left")};
`;

const NavButtonText = styled(Text)`
  font-size: 28px;
  color: #ccc;
`;

const NavBar = styled(View)`
  height: 50px;
  flex-direction: row;
  justify-content: center;
`;

const NavButton = styled(HybridButton)`
  height: 50px;
  padding-left: 20px;
  padding-right: 20px;
  justify-content: center;
`;
