import React from "react";
import { Text, View, styled, Button } from "bappo-components";

export default props => (
  <Selection>
    {props.options.map(renderRow)}
    <FilterButton onPress={props.onChangeClick}>
      <Text>✎ Change </Text>
    </FilterButton>
  </Selection>
);

const renderRow = (row, i) => {
  return (
    <SelectionRow key={i}>
      <SelectionLabel>{row.label}</SelectionLabel>
      <SelectionValue> {row.value} </SelectionValue>
    </SelectionRow>
  );
};

const Selection = styled(View)`
  padding-top: 5px;
  margin: 20px;
  border-radius: 3px;
  background-color: #f8f8f8;
`;
const SelectionRow = styled(View)`
  flex-direction: row;
  height: 40px;
  align-items: center;
  margin: 0 20px;
  border-style: solid;
  border-color: white;
  border-bottom-width: 1px;
  border-left-width: 0;
  border-right-width: 0;
  border-top-width: 0;
`;

const SelecionLabel = styled(Text)``;

const SelectionLabel = styled(Text)`
  width: 120px;
  color: gray;
`;

const SelectionValue = styled(Text)``;

const FilterButton = styled(Button)`
  height: 40px;
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  padding-left: 20px;
`;
