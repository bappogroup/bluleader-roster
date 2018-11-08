import React from "react";
import {
  View,
  Text,
  TouchableView,
  styled,
  ScrollView,
  Icon,
  Platform
} from "bappo-components";
import fileDownload from "js-file-download";

function formatNumber(n) {
  const num = +n;
  if (n === "" || Number.isNaN(num)) return n;
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
    header: this.props.data[0],
    screenWidth: 300,
    cellWidth: this.props.cellWidth || 100,
    fixedCellWidth: this.props.fixedCellWidth || 150
  };

  renderFixedHeaderCell =
    typeof this.props.renderFixedHeaderCell === "function"
      ? this.props.renderFixedHeaderCell
      : (data, { rowStyle, key }) => (
          <FixedCell
            key={key}
            style={{ width: this.state.fixedCellWidth }}
            rowStyle={rowStyle}
          >
            <HeaderText>{data}</HeaderText>
          </FixedCell>
        );

  renderFixedCell =
    typeof this.props.renderFixedCell === "function"
      ? this.props.renderFixedCell
      : (data, { rowStyle, key }) => (
          <FixedCell
            key={key}
            style={{ width: this.state.fixedCellWidth }}
            rowStyle={rowStyle}
          >
            <LabelText rowStyle={rowStyle}>{data}</LabelText>
          </FixedCell>
        );

  renderHeaderCell =
    typeof this.props.renderHeaderCell === "function"
      ? this.props.renderHeaderCell
      : (data, { rowStyle, key }) => (
          <Cell key={key} rowStyle={rowStyle} justifyRight={true}>
            <HeaderText justifyRight={true}>{data}</HeaderText>
          </Cell>
        );

  renderCell =
    typeof this.props.renderCell === "function"
      ? this.props.renderCell
      : (data, { rowStyle, key }) => {
          const justifyRight = !Number.isNaN(+data);
          return (
            <Cell key={key} rowStyle={rowStyle} justifyRight={justifyRight}>
              <CellText rowStyle={rowStyle} justifyRight={justifyRight}>
                {formatNumber(data)}
              </CellText>
            </Cell>
          );
        };

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
        {this.state.header
          .map((h, index) => cells[index] || "")
          .slice(this.state.firstCol, this.state.firstCol + this.state.colCount)
          .map((data, index) =>
            renderCell(data, {
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
    this.props.rowPress ? (
      <DrillDownRow onPress={() => this.props.rowPress(props)}>
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

  download = () => {
    const data = this.props.data.map(row => {
      const cells1 = row.constructor === Object ? row.data : row;
      const cells2 = cells1.map(cell => {
        const value =
          cell.constructor === Object ? cell.data || " " : cell || " ";
        if (typeof value === "string") return value.replace(",", " ");
        return value;
      });
      return cells2.join(",");
    });
    fileDownload(data.join("\n"), "data.csv");
  };

  renderDownloadButton = () => {
    if (Platform.OS === "web")
      return (
        <DownloadButton onPress={this.download}>
          <Icon name="file-download" style={{ fontSize: 24 }} />
        </DownloadButton>
      );
  };

  render() {
    let { data } = this.props;

    if (!data || data.length < 1) {
      return (
        <View>
          <Text>No Data</Text>
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
          {this.renderDownloadButton()}
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
  border-bottom-width: 1px;
  border-top-width: 1px;
  border-left-width: 1px;
  border-right-width: 1px;
  border-color: #eeeef8;
  border-style: solid;
  background-color #f8f8fc;
`;

const cssForInfo = `
  border-bottom-width: 1px;
  border-top-width: 1px;
  border-left-width: 1px;
  border-right-width: 1px;
  border-color: #eeeef8;
  border-style: solid;
  background-color #f8f8fc;
  margin-top: 5px;
`;

const cssForBlank = ``;

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

const DrillDownRow = styled(TouchableView)``;

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
  ${props => props.rowStyle === "info" && cssForInfo}
  ${props => props.rowStyle === "blank" && cssForBlank}
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
  flex-grow: 0;
  ${props => props.rowStyle === "bold" && cssForBold};
  padding-right: 10px;
  flex-wrap: nowrap;
`;

const CellText = styled(Text)`
  color: ${props =>
    props.rowStyle === "total" || props.rowStyle === "info" ? "black" : "#aae"};
  text-align: ${props => (props.justifyRight ? "right" : "left")};
`;

const LabelText = styled(Text)`
  color: ${props =>
    props.rowStyle === "total" || props.rowStyle === "info" ? "black" : "#aae"};
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

const NavButton = styled(TouchableView)`
  height: 50px;
  padding-left: 20px;
  padding-right: 20px;
  justify-content: center;
`;

const DownloadButton = styled(TouchableView)`
  height: 50px;
  padding-left: 20px;
  padding-right: 20px;
  justify-content: center;
  position: absolute;
  right: 0;
`;
