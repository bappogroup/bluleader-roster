import React from 'react';
import { View, Text, styled } from 'bappo-components';

function trimNumber(n) {
  const number = +n;
  if (Number.isNaN(number)) return n;
  if (number % 1 === 0) return n;
  return number.toFixed(2);
}

const Card = ({ title, subtitle, properties, total }) => {
  const renderProperty = ([name, value]) => (
    <PropertyRow key={name}>
      <Text>
        {name}: {trimNumber(value)}
      </Text>
    </PropertyRow>
  );

  const isTotal = title === 'Totals';

  return (
    <Container key={title} isTotal={isTotal}>
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

  ${props => props.isTotal && 'background-color: lightgrey;'};
`;

const TitleContainer = styled(View)`
  width: 280px;
  flex-direction: row;
  overflow: hidden;
`;

const Title = styled(Text)``;

const Subtitle = styled(Text)`
  padding-left: 10px;
  color: gray;
  font-size: 12px;
`;

const PropertyContainer = styled(View)`
  flex-direction: row;
  display: flex;
  flex: 1;
`;

const PropertyRow = styled(View)`
  flex: 1;
  padding: 0 10px;
`;
