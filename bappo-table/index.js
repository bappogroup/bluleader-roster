import React from 'react';
import { View, Text, Button, styled, ScrollView } from 'bappo-components';

class Table extends React.Component {
  state = {
    data: this.props.data,
    fixedCols: 1,
    firstCol: 1,
    colCount: 3,
    screenWidth: 300,
    cellWidth: this.props.cellWidth || 100,
  };

  renderFixedHeaderCell =
    this.props.renderFixedHeaderCell ||
    ((data, { rowStyle, key }) => (
      <FixedCell key={key}>
        <HeaderText>{data}</HeaderText>
      </FixedCell>
    ));

  renderFixedCell =
    this.props.renderFixedCell ||
    ((data, { rowStyle, key }) => (
      <FixedCell key={key}>
        <LabelText>{data}</LabelText>
      </FixedCell>
    ));

  renderHeaderCell =
    this.props.renderHeaderCell ||
    ((data, { rowStyle, key }) => (
      <Cell key={key}>
        <HeaderText>{data}</HeaderText>
      </Cell>
    ));

  renderCell =
    this.props.renderCell ||
    ((data, { rowStyle, key }) => {
      return (
        <Cell key={key}>
          <Text>{data}</Text>
        </Cell>
      );
    });

  onLayout = params => {
    const screenWidth = params.nativeEvent.layout.width;
    const colCount = Math.round((screenWidth - 150) / this.state.cellWidth);
    this.setState({
      screenWidth,
      colCount,
    });
  };

  scrollHorizontally = n => {
    const firstCol = Math.max(
      this.state.fixedCols,
      Math.min(this.state.firstCol + n, this.state.data[0].length - this.state.colCount),
    );
    this.setState({ firstCol });
  };

  renderRow = (row, i) => {
    let cells;
    let rowStyle;
    let otherProperties;

    if (row.constructor === Object) {
      const { data, ...others } = row;
      cells = data;
      otherProperties = others;
      rowStyle = row.rowStyle || 'data';
    } else {
      cells = row;
      rowStyle = 'data';
    }

    const renderCell = rowStyle === 'header' ? this.renderHeaderCell : this.renderCell;
    const renderFixedCell =
      rowStyle === 'header' ? this.renderFixedHeaderCell : this.renderFixedCell;

    return (
      <Row rowStyle={rowStyle} key={i}>
        {cells
          .slice(0, this.state.fixedCols)
          .map((data, index) =>
            renderFixedCell(data, { rowStyle, key: `f${index}`, index, ...otherProperties }),
          )}
        {cells
          .slice(this.state.firstCol, this.state.firstCol + this.state.colCount)
          .map((data, index) =>
            renderCell(data, {
              rowStyle,
              key: `c${index}`,
              index: index + this.state.firstCol - 1,
              ...otherProperties,
            }),
          )}
      </Row>
    );
  };

  renderBlankRow = () => <Row />;

  render() {
    if (!this.state.data || this.state.data.length < 1) {
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
            {this.renderRow({ data: this.state.data[0], rowStyle: 'header' })}
          </TableHeader>
          <TableBody>
            {this.state.data.slice(1).map(this.renderRow)}
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

const Row = styled(View)`
  display: flex;
  flex-direction: row;
  min-height: 40px;
  justify-content: space-between;
  align-items: center;
    ${props => props.rowStyle === 'data' && cssForData}
    ${props => props.rowStyle === 'total' && cssForTotal}
    ${props => props.rowStyle === 'header' && cssForHeader}
  }
`;

const FixedCell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: none;
  width: 150px;
`;

const Cell = styled(View)`
  justify-content: center;
  align-items: center;
  flex: 1;
`;

const LabelText = styled(Text)`
  color: #ccc;
`;

const HeaderText = styled(Text)`
  color: white;
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

const NavButton = styled(Button)`
  height: 50px;
  padding-left: 10px;
  padding-right: 10px;
  justify-content: center;
`;
