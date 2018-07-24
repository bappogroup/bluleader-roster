import React from "react";
import { Button, TextInput, styled, View, Text } from "bappo-components";

class Form extends React.Component {
  state = {
    value: this.props.amount
  };

  onChange = value => {
    this.setState({ value });
  };

  render() {
    return (
      <View>
        <Amount onValueChange={this.onChange} value={this.state.value} />

        <Buttons>
          <StyledButton onPress={this.props.handleDelete}>
            <Text>Delete</Text>
          </StyledButton>

          <StyledButton
            onPress={() => this.props.handleSave(this.state.value)}
            style={{ backgroundColor: "#ddf" }}
          >
            <Text>Save</Text>
          </StyledButton>
        </Buttons>
      </View>
    );
  }
}

export default Form;

const Amount = styled(TextInput)`
  height: 40px;
  border-style: solid;
  border-width: 1px;
  border-color: #eee;
  margin: 10px 20px;
  padding: 0 10px;
`;

const Buttons = styled(View)`
  flex-direction: row;
  justify-content: flex-end;
`;

const StyledButton = styled(Button)`
  height: 40px;
  padding: 10px 10px;
  background-color: #eee;
  width: 100px;
  flex: none;
  justify-content: center;
  align-items: center;
  margin: 10px 20px;
  border-radius: 3px;
`;
