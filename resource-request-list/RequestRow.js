import React from "react";
import {
  styled,
  View,
  Text,
  Separator,
  TouchableView,
  Icon,
  Modal,
  Button
} from "bappo-components";
import Version from "./Version";

class RequestRow extends React.Component {
  constructor(props) {
    super(props);

    const currentVersion = props.request.versions.find(v => v.isCurrentVersion);

    this.state = {
      currentVersion,
      showMenu: false
    };
  }

  startChat = () => {
    const { chat, request } = this.props;
    chat.open({ objectKey: "Request", recordId: request.id });
  };

  toggleMenu = () => this.setState(({ showMenu }) => ({ showMenu: !showMenu }));

  renderMenu = () => {
    return (
      <Modal
        visible
        onRequestClose={this.toggleMenu}
        onOverlayPress={this.toggleMenu}
      >
        <MenuContainer>
          <Button
            onPress={() => {
              this.toggleMenu();
              this.props.showRosterForm({ title: "New Version" });
            }}
            type="secondary"
            text="Create New Version"
          />
          <Button type="secondary" text="Approve" />
          <Button type="secondary" text="Reject" />
        </MenuContainer>
      </Modal>
    );
  };

  render() {
    const { name, versions, _conversations } = this.props.request;

    const iconColor =
      _conversations && _conversations.length > 0 ? "dodgerblue" : "gray";

    return (
      <Container>
        <Header>
          <Text>{name}</Text>
          <IconButton onPress={this.toggleMenu}>
            <Icon name="menu" color="gray" />
          </IconButton>
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
        {this.state.showMenu && this.renderMenu()}
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
  margin: 10px 20px;
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

const MenuContainer = styled(View)`
  flex: 1;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
`;
