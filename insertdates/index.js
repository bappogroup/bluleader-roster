import React from 'react';
import { Text, Button } from 'bappo-components';
import moment from 'moment';

export default props => <Button onPress={() => go(props)}>Go</Button>;

const go = async props => {
  const { FinancialPeriod } = props.$models;
  // const periods = await FinancialPeriod.findAll();
  const date = moment();

  const currentPeriods = await FinancialPeriod.findAll({});

  const baseDate = moment().subtract(1, 'year');

  // await FinancialPeriod.destroy({ where: {} });

  const dats = [];
  for (let n = 0; n < 72; n++) {
    const date = baseDate.clone().add(n, 'months');
    const record = {
      name: date.format('YYYY-MM'),
      beginDate: date.startOf('month').format('YYYY-MM-DD'),
      endDate: date.endOf('month').format('YYYY-MM-DD'),
      label: date.format('MMM YYYY'),
      year: date.format('YYYY'),
      period: date.format('MM'),
    };

    if (currentPeriods.find(c => c.name === record.name)) {
    } else {
      dats.push(record);
    }
  }

  // console.log(dats);
  await FinancialPeriod.bulkCreate(dats);

  alert('done');
};
