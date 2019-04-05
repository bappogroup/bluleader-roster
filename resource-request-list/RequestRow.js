import React from "react";
import {
  styled,
  View,
  Text,
  Separator,
  TouchableView,
  Icon,
  Dropdown
} from "bappo-components";
import Version from "./Version";

class RequestRow extends React.Component {
  normalActions = [
    {
      label: "New Version",
      onPress: () =>
        this.props.showRosterForm({
          title: "New Version",
          preventDefaultSubmit: true
        })
    }
  ];

  ownActions = [
    {
      label: "Cancel",
      onPress: () => this.props.handleSetRequestStatus("4")
    }
  ];

  managerActions = [
    {
      label: "Approve and Update Roster",
      onPress: () =>
        this.props.showRosterForm({
          title: "Review",
          step: 2,
          afterSubmit: () => this.props.handleSetRequestStatus("2")
        })
    },
    {
      label: "Approve",
      onPress: () => this.props.handleSetRequestStatus("2")
    },
    {
      label: "Reject",
      onPress: () => this.props.handleSetRequestStatus("3")
    }
  ];

  startChat = () => {
    const { chat, request } = this.props;
    chat.open({ objectKey: "Request", recordId: request.id });
  };

  render() {
    const { name, versions, _conversations } = this.props.request;
    // Only show menu button on 'Open' requests

    const iconColor =
      _conversations && _conversations.length > 0 ? "dodgerblue" : "gray";

    let actions = this.normalActions;
    if (this.props.canManageResourceRequests)
      actions = actions.concat(this.managerActions);
    if (this.props.canCancel) actions = actions.concat(this.ownActions);

    return (
      <Container>
        <Header>
          <Text>{name}</Text>
          {this.props.showMenuButton && (
            <Dropdown actions={actions} icon="more-horiz" />
          )}
        </Header>
        <Separator />
        <Body>
          <VersionsContainer>
            {versions.map(version => (
              <Version key={version.id} {...version} />
            ))}
          </VersionsContainer>
          <IconButton onPress={this.startChat}>
            <Icon name="chat" color={iconColor} />
          </IconButton>
        </Body>
      </Container>
    );
  }
}

export default RequestRow;

const Container = styled(View)`
  flex-direction: column;
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 3px;
  padding: 10px 20px;
  margin: 10px 0px;
`;

const Header = styled(View)`
  flex-direction: row;
  justify-content: space-between;
`;

const Body = styled(View)`
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
`;

const VersionsContainer = styled(View)`
  flex: 1;
`;

const IconButton = styled(TouchableView)`
  flex-shrink: 0;
`;
