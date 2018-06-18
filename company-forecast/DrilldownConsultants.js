import React from 'react';

export default props => {
  console.log(props);
  return <div>Drilldown for Consultants for month {props.report.params.month.label} </div>;
};
