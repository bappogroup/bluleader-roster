import React from 'react';
import { View, Text, styled } from 'bappo-components';

function trimNumber(n) {
  const number = +n;
  if (Number.isNaN(number)) return n;
  if (number % 1 === 0) return n;
  return number.toFixed(2);
}

const NarrowCard = ({ title, subtitle, properties, total }) => {
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
        <Title>{typeof title === 'string' && title.substring(0, 25)}</Title>
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

export default NarrowCard;

const Container = styled(View)`
  background-color: white;
  border-color: lightgray;
  border-width: 1px;
  border-style: solid;
  border-radius: 3px;
  margin: 15px;
  margin-bottom: 0;
  align-items: center;

  ${props => props.isTotal && 'background-color: lightgrey;'};
`;

const TitleContainer = styled(View)`
  width: 100%;
  padding: 12px;
  background-color: #eee;
`;

const Title = styled(Text)`
  text-align: center;
`;

const Subtitle = styled(Text)`
  color: gray;
  font-size: 12px;
  margin-top: 7px;
  text-align: center;
`;

const PropertyContainer = styled(View)`
  margin: 12px;
`;

const PropertyRow = styled(View)`
  margin-top: 5px;
  margin-bottom: 5px;
`;
