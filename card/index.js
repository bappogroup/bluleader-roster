import React from 'react';
import { View, Text, styled } from 'bappo-components';

const Card = ({ title, subtitle, properties, total }) => {
  const renderProperty = ([name, value]) => (
    <PropertyRow key={name}>
      <Text>
        {name}: {value}
      </Text>
    </PropertyRow>
  );

  return (
    <Container key={title}>
      <TitleContainer>
        <Title>{title}</Title>
        {typeof subtitle === 'string' && <Subtitle>{subtitle}</Subtitle>}
      </TitleContainer>
      <PropertyContainer>
        {typeof properties === 'object' && Object.entries(properties).map(renderProperty)}
        {typeof total !== 'undefined' && (
          <PropertyRow>
            <Text>Total: {total}</Text>
          </PropertyRow>
        )}
      </PropertyContainer>
    </Container>
  );
};

export default Card;

const Container = styled(View)`
  background-color: white;
  border-color: lightgray;
  border-width: 1px;
  border-style: solid;
  border-radius: 3px;
  padding: 15px;
  margin: 15px;
  margin-bottom: 0;

  flex-direction: row;
  align-items: center;
`;

const TitleContainer = styled(View)`
  margin: 15px;
`;

const Title = styled(Text)``;

const Subtitle = styled(Text)`
  color: gray;
  font-size: 12px;
  margin-top: 7px;
`;

const PropertyContainer = styled(View)``;

const PropertyRow = styled(View)`
  margin-top: 5px;
  margin-bottom: 5px;
`;
