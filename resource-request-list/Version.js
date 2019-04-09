import React from "react";
import { styled, View, Text, TouchableView, Separator } from "bappo-components";
import DatePreview from "date-preview";

class Version extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isExpanded: props.isCurrentVersion
    };
  }

  toggleExpand = () =>
    this.setState(({ isExpanded }) => ({ isExpanded: !isExpanded }));

  renderDetails = () => {
    const {
      consultant,
      project,
      probability,
      startDate,
      endDate,
      includedDates,
      isCurrentVersion,
      comments,
      skillsRequired
    } = this.props;

    if (this.state.isExpanded)
      return (
        <DetailsContainer>
          <Text>
            {consultant.name} on {project.name} ({probability.name}), from{" "}
            {startDate} to {endDate}
          </Text>
          <View style={{ marginTop: 8 }}>
            <Text>Including:</Text>
          </View>
          <DatePreview datesString={includedDates} />
          {!isCurrentVersion && <Separator />}
          {skillsRequired && (
            <View>
              <Text>Skills required: {skillsRequired}</Text>
            </View>
          )}
          {comments && (
            <View>
              <Text>Comments:</Text>
              <Text>{comments}</Text>
            </View>
          )}
        </DetailsContainer>
      );
  };

  render() {
    const {
      versionNumber,
      isCurrentVersion,
      requestedBy,
      requestDate
    } = this.props;

    return (
      <Container onPress={this.toggleExpand}>
        <Text>
          {isCurrentVersion ? "Current Version" : `Version ${versionNumber}`} (
          {versionNumber === "1" ? "created" : "updated"} on {requestDate} by{" "}
          {requestedBy.name})
        </Text>
        {this.renderDetails()}
      </Container>
    );
  }
}

export default Version;

const Container = styled(TouchableView)`
  margin-top: 8px;
  margin-bottom: 8px;
`;

const DetailsContainer = styled(View)`
  margin-left: 16px;
  margin-top: 8px;
`;
