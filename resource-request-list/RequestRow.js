import React from "react";
import { styled, View, Text, Separator } from "bappo-components";

class RequestRow extends React.Component {
  render() {
    const {
      requestedBy,
      requestDate,
      consultant,
      project,
      probability,
      startDate,
      endDate,
      comments,
      skillsRequired
    } = this.props;

    return (
      <Container>
        <Text>
          {consultant.name} on project {project.name} ({probability.name}), from{" "}
          {startDate} to {endDate}
        </Text>
        <Text>
          {requestedBy.name} requested on {requestDate}
        </Text>
        {comments && (
          <View>
            <Separator />
            <Text>Comments:</Text>
            <Text>{comments}</Text>
          </View>
        )}
        {skillsRequired && (
          <View>
            <Separator />
            <Text>Skill required: {skillsRequired}</Text>
          </View>
        )}
      </Container>
    );
  }
}

export default RequestRow;

const Container = styled(View)`
  border: 1px solid #eee;
  border-radius: 3px;
  padding: 10px 20px;
  margin: 10px 20px;
`;
