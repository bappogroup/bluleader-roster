/* eslint no-param-reassign: "off" */
import moment from 'moment';
import {
  payrollTaxRate,
  leaveProjectTypeIndexes,
  yearlyWorkingDays,
  billableProbabilities,
} from './constants';

export * from './constants';
export * from './profitCentre';
export const dateFormat = 'YYYY-MM-DD';

export function sortPeriods(rawPeriods) {
  const periods = rawPeriods.slice();
  return periods.sort((p1, p2) => {
    if (p1.year !== p2.year) return +p1.year - +p2.year;
    return +p1.period - +p2.period;
  });
}

/**
 * Determine whether a roster entry incurs contractor wage
 * Conditions are:
 * 1. prob >= 50%
 * 2. project type === 2 ('T&M') || 3 ('Fixed Price')
 * 3. consultant type === 2 ('Contractor')
 *
 * @param {object} roster entry
 * @return {boolean}
 */
const rosterEntryIncursContractorWages = rosterEntry => {
  const probability = rosterEntry.probability.name;

  if (
    rosterEntry.consultant.consultantType === '2' &&
    (rosterEntry.project.projectType === '2' || rosterEntry.project.projectType === '3') &&
    billableProbabilities.includes(probability)
  ) {
    return true;
  }
  return false;
};

export const getMonthArray = (rawStartDate, rawEndDate) => {
  const startDate = moment(rawStartDate).startOf('month');
  const endDate = moment(rawEndDate).startOf('month');
  const monthArray = [];

  for (const start = startDate.clone(); start.isSameOrBefore(endDate); start.add(1, 'month')) {
    monthArray.push({
      label: start.format('MMM YYYY'),
      monthNumber: start.month(),
      firstDay: start.clone(),
    });
  }

  return monthArray;
};

/**
 * Get base data for company forecasting.
 * !! Should be performed on a dedicated calc server to avoid ping-pong.
 * 1. Currently, fetch all RosterEntries (as there are only 1 company)
 * 2. for company-level, fetch by consultantIds or by projectIds should have the same results
 * 3. for profitcentre-level, should fetch separately
 *
 * @param {object} $models
 * @param {object} startDate
 * @param {object} endDate
 * @param {string} companyId
 * @return {object} base data
 */
export const getForecastBaseData = async ({
  $models,
  companyId,
  startDate,
  endDate,
  periodIds,
}) => {
  if (!($models && companyId && startDate && endDate)) return null;

  // if profitCentreId is not specified, fetch data for all profitCentreIds
  const profitCentres = await $models.ProfitCentre.findAll({
    where: {
      company_id: companyId,
    },
    limit: 1000,
  });
  const profitCentreIds = profitCentres.map(pc => pc.id);

  const profitCentreQuery = {
    where: {
      profitCentre_id: {
        $in: profitCentreIds,
      },
    },
    limit: 1000,
  };

  // Find cost centers and consultants of all profit centres
  const costCenters = await $models.CostCenter.findAll(profitCentreQuery);
  const costCenterIds = costCenters.map(cc => cc.id);

  const allConsultants = await $models.Consultant.findAll({
    include: [{ as: 'costCenter' }],
    limit: 1000,
  });

  const consultants = allConsultants.filter(c => costCenterIds.indexOf(c.costCenter_id) !== -1);

  const consultantIds = consultants.map(c => c.id);

  // Find all projects
  const projects = await $models.Project.findAll(profitCentreQuery);

  const projectIds = projects.map(p => p.id);

  // Create lookup for project assignments
  const pa1 = await $models.ProjectAssignment.findAll({
    where: {
      consultant_id: { $in: consultantIds },
    },
    limit: 1000,
  });

  const pa2 = await $models.ProjectAssignment.findAll({
    where: {
      project_id: { $in: projectIds },
    },
    limit: 1000,
  });

  const projectAssignmentLookup = {};
  for (const pa of [...pa1, ...pa2]) {
    projectAssignmentLookup[`${pa.consultant_id}.${pa.project_id}`] = pa;
  }

  const promises = [];

  // Fetch forecast elements
  promises.push($models.ForecastElement.findAll({}));

  // Fetch roster entries
  // TODO: improve query
  promises.push(
    $models.RosterEntry.findAll({
      where: {
        date: {
          $between: [moment(startDate).format(dateFormat), moment(endDate).format(dateFormat)],
        },
        // consultant_id: {
        //   $in: consultantIds,
        // },
      },
      include: [{ as: 'consultant' }, { as: 'project' }, { as: 'probability' }],
      limit: 100000,
    }),
  );

  // Fetch forecast entries (rent etc)
  promises.push(
    $models.ForecastEntry.findAll({
      where: {
        period_id: {
          $in: periodIds,
        },
      },
      include: [{ as: 'forecastElement' }, { as: 'period' }],
      limit: 100000,
    }),
  );

  // Fetch fixed price project forecast entries
  promises.push(
    $models.ProjectForecastEntry.findAll({
      where: {
        period_id: {
          $in: periodIds,
        },
      },
      include: [{ as: 'period' }],
    }),
  );

  const [
    forecastElements,
    rosterEntries,
    forecastEntries,
    projectForecastEntries,
  ] = await Promise.all(promises);

  return {
    allConsultants,
    costCenters,
    consultants,
    profitCentres,
    projects,
    projectAssignmentLookup,
    forecastElements,
    forecastEntries,
    projectForecastEntries,
    rosterEntries,
  };
};

/**
 * Start of calculations of main report
 * Each function will reassign original 'cells' in MainReport
 */

/**
 * Calculate permanent consultant data of given months
 * Includes: 'salary', 'payroll tax' and 'bonus provision'
 *
 * Condition for bonus provision:
 * 1. is permanent
 * 2. has bonusProvision
 * 3. startDate - endDate includes this month
 */
const calculatePermConsultants = ({ consultants, months, cells }) => {
  for (const month of months) {
    for (const consultant of consultants) {
      const monthlySalary = consultant.annualSalary ? +consultant.annualSalary / 12 : 0;
      const monthlyBonus = consultant.bonusProvision ? +consultant.bonusProvision / 12 : 0;

      // Calculate partial monthly salary: how many days of this month is with in consultant's start/end date
      // Consultant start date is required, while end date is optional
      let validDays = 0;
      const { firstDay } = month;
      const totalDays = moment(firstDay).daysInMonth();
      const monthStart = moment(firstDay).startOf('month');
      const monthEnd = moment(firstDay).endOf('month');
      const consultantStart = moment(consultant.startDate);
      const consultantEnd = consultant.endDate && moment(consultant.endDate);

      for (let m = monthStart; m.isBefore(monthEnd); m.add(1, 'days')) {
        if (consultantEnd) {
          if (m.isSameOrAfter(consultantStart) && m.isSameOrBefore(consultantEnd)) {
            validDays++;
          }
        } else if (m.isSameOrAfter(consultantStart)) {
          validDays++;
        }
      }

      const salary = (monthlySalary * (validDays / totalDays)).toFixed(2);
      const bonus = (monthlyBonus * (validDays / totalDays)).toFixed(2);

      // Salary and tax
      if (salary > 0) {
        const salaryCellKey = `SAL-${month.label}`;
        cells[salaryCellKey][consultant.id] = salary;
        cells[salaryCellKey].value += +salary;

        const taxCellKey = `PTAXP-${month.label}`;
        const tax = +((+salary + +bonus) * payrollTaxRate).toFixed(2);
        cells[taxCellKey][consultant.id] = tax;
        cells[taxCellKey].value += tax;

        const lvProvKey = `LPROV-${month.label}`;
        const lvprov = +((+consultant.annualSalary / yearlyWorkingDays) * 2).toFixed(2);
        cells[lvProvKey][consultant.id] = lvprov;
        cells[lvProvKey].value += lvprov;
      }

      // bonus
      if (bonus > 0) {
        const bonusCellKey = `BON-${month.label}`;
        cells[bonusCellKey][consultant.id] = bonus;
        cells[bonusCellKey].value += +bonus;
      }
    }
  }
};

/**
 * Calculate contractor consultant data of given months
 * Includes: 'wages' and 'payroll tax'
 *
 * Conditions for wage: see the util function at top
 *
 * Condition for payroll tax:
 * 1. if contractor, he/she should have the flag 'incursPayrollTax' true
 */
const calculateContractConsultants = ({ consultants, cells, rosterEntries }) => {
  // Find rosterEntries that are assigned to contractors
  const contractorIds = consultants.map(c => c.id);
  const contractorRosterEntries = rosterEntries.filter(e =>
    contractorIds.includes(e.consultant_id),
  );

  for (const entry of contractorRosterEntries) {
    if (rosterEntryIncursContractorWages(entry)) {
      // Wages
      const monthLabel = moment(entry.date).format('MMM YYYY');
      const wageCellKey = `CWAGES-${monthLabel}`;
      const taxCellKey = `PTAXC-${monthLabel}`;

      if (!cells[wageCellKey][entry.consultant_id]) cells[wageCellKey][entry.consultant_id] = 0;

      const dailyRate = +entry.consultant.dailyRate || 0;

      if (dailyRate > 0) {
        cells[wageCellKey][entry.consultant_id] += dailyRate;
        cells[wageCellKey].value += dailyRate;

        // Payroll Taxes
        if (entry.consultant.incursPayrollTax) {
          const tax = +(dailyRate * payrollTaxRate).toFixed(2);
          if (!cells[taxCellKey][entry.consultant_id]) cells[taxCellKey][entry.consultant_id] = 0;
          cells[taxCellKey][entry.consultant_id] += tax;
          cells[taxCellKey].value += tax;
        }
      }
    }
  }
};

/**
 * Calculate and update 'T&M Service' (revenue) row in a financial year by:
 * accumulating revenue gained from roster entries. Revenue comes from ProjectAssignment.dayRate
 *
 * Also calculate leave recovery
 */
const calculateRosterEntries = ({ cells, rosterEntries, projectAssignmentLookup }) => {
  rosterEntries.forEach(entry => {
    const monthLabel = moment(entry.date).format('MMM YYYY');

    if (leaveProjectTypeIndexes.includes(entry.project.projectType)) {
      // leave, will always be negative, as a cost recovery
      const leave = +(entry.consultant.annualSalary / yearlyWorkingDays).toFixed(2);
      const cellKey = `LEA-${monthLabel}`;

      if (!cells[cellKey][entry.consultant_id]) cells[cellKey][entry.consultant_id] = 0;
      cells[cellKey][entry.consultant_id] -= leave;
      cells[cellKey].value -= leave;
    } else {
      const assignment = projectAssignmentLookup[`${entry.consultant_id}.${entry.project_id}`];
      const { dayRate, projectExpense } = assignment;

      if (entry.project.projectType === '2') {
        // T&M project revenue
        // assignment must exist!
        const cellKey = `TMREV-${monthLabel}`;

        if (!cells[cellKey][entry.project_id]) cells[cellKey][entry.project_id] = 0;
        const rate = dayRate ? +dayRate : 0;
        cells[cellKey][entry.project_id] += rate;
        cells[cellKey].value += rate;
      }

      if (projectExpense) {
        const cellKey = `PJE-${monthLabel}`;
        if (!cells[cellKey][entry.project_id]) cells[cellKey][entry.project_id] = 0;
        cells[cellKey][entry.project_id] += +projectExpense;
        cells[cellKey].value += +projectExpense;
      }
    }
  });
};

/**
 * Calculate read-only forecast entries, e.g. 'rent', 'software licence'
 */
const calculateForecastEntries = ({ cells, forecastEntries }) => {
  for (const entry of forecastEntries) {
    const forecastElementKey = entry.forecastElement.key || entry.forecastElement.name;
    const monthLabel = moment(entry.period.name).format('MMM YYYY');
    const cellKey = `${forecastElementKey}-${monthLabel}`;

    const amount = +entry.amount;
    cells[cellKey][entry.id] = entry;
    cells[cellKey].value += amount;
  }
};

/**
 * Calculate read-only forecast entries, e.g. 'rent', 'software licence'
 */
const calculateFPPEntries = ({ cells, projectForecastEntries }) => {
  projectForecastEntries.forEach(entry => {
    // Not showing planned cost in report
    if (entry.forecastType === '1') return;

    const monthLabel = moment(entry.period.name).format('MMM YYYY');
    const cellKey = `FIXREV-${monthLabel}`;

    const amount = +entry.amount;
    if (!cells[cellKey][entry.project_id]) cells[cellKey][entry.project_id] = 0;
    cells[cellKey][entry.project_id] += amount;
    cells[cellKey].value += amount;
  });
};

export const calculateMainReport = ({
  months,
  permConsultants,
  contractConsultants,
  rosterEntries,
  projectAssignmentLookup,
  forecastElements,
  forecastEntries,
  projectForecastEntries,
}) => {
  // initialize cells
  const cells = {};
  for (const element of forecastElements) {
    for (const month of months) {
      const cellKey = `${element.key || element.name}-${month.label}`;
      cells[cellKey] = { value: 0 };
    }
  }

  calculatePermConsultants({
    consultants: permConsultants,
    months,
    cells,
  });
  calculateContractConsultants({
    consultants: contractConsultants,
    cells,
    rosterEntries,
  });
  calculateRosterEntries({
    cells,
    rosterEntries,
    projectAssignmentLookup,
  });
  calculateForecastEntries({
    cells,
    forecastEntries,
  });
  calculateFPPEntries({
    cells,
    projectForecastEntries,
  });

  // Process forecast elements
  const costElements = [];
  const revenueElements = [];
  const overheadElements = [];

  for (const element of forecastElements) {
    switch (element.elementType) {
      case '1':
        costElements.push(element);
        break;
      case '2':
        revenueElements.push(element);
        break;
      case '3':
        overheadElements.push(element);
        break;
      default:
    }
  }

  // Calculate totals
  const totals = {};
  months.forEach(({ label }) => {
    totals[`Revenue-${label}`] = 0;
    totals[`Cost-${label}`] = 0;
    totals[`Overheads-${label}`] = 0;
    totals[`GrossProfit-${label}`] = 0;
    totals[`NetProfit-${label}`] = 0;

    costElements.forEach(ele => {
      const cellKey = `${ele.key || ele.name}-${label}`;
      totals[`Cost-${label}`] += +cells[cellKey].value;
    });

    revenueElements.forEach(ele => {
      const cellKey = `${ele.key || ele.name}-${label}`;
      totals[`Revenue-${label}`] += +cells[cellKey].value;
    });

    overheadElements.forEach(ele => {
      const cellKey = `${ele.key || ele.name}-${label}`;
      totals[`Overheads-${label}`] += +cells[cellKey].value;
    });

    totals[`Cost-${label}`] = +totals[`Cost-${label}`].toFixed(2);
    totals[`Revenue-${label}`] = +totals[`Revenue-${label}`].toFixed(2);
    totals[`Overheads-${label}`] = +totals[`Overheads-${label}`].toFixed(2);
    totals[`GrossProfit-${label}`] = totals[`Revenue-${label}`] - totals[`Cost-${label}`];
    totals[`NetProfit-${label}`] = totals[`GrossProfit-${label}`] - totals[`Overheads-${label}`];
  });

  // Generate bappo-table data from cells
  const dataForTable = [];

  // Month row
  const monthRow = [''];
  months.forEach(month => monthRow.push(month.label));
  dataForTable.push(monthRow);

  // Revenue elements
  revenueElements.forEach(ele => {
    const row = {
      elementKey: ele.key || ele.name,
      data: [ele.name],
    };
    months.forEach(month => row.data.push(cells[`${ele.key || ele.name}-${month.label}`].value));
    dataForTable.push(row);
  });

  const totalRevenueRow = {
    rowStyle: 'total',
    data: ['Total Revenue'],
  };
  months.forEach(month => totalRevenueRow.data.push(totals[`Revenue-${month.label}`]));
  dataForTable.push(totalRevenueRow);
  dataForTable.push([]);

  // Cost elements
  costElements.forEach(ele => {
    const row = {
      elementKey: ele.key || ele.name,
      data: [ele.name],
    };
    months.forEach(month => row.data.push(cells[`${ele.key || ele.name}-${month.label}`].value));
    dataForTable.push(row);
  });

  const totalCostRow = {
    rowStyle: 'total',
    data: ['Total Cost'],
  };
  months.forEach(month => totalCostRow.data.push(totals[`Cost-${month.label}`]));
  dataForTable.push(totalCostRow);
  dataForTable.push([]);

  // Gross Profit
  const grossProfitRow = {
    rowStyle: 'total',
    data: ['Gross Profit'],
  };
  months.forEach(month => grossProfitRow.data.push(totals[`GrossProfit-${month.label}`]));
  dataForTable.push(grossProfitRow);
  dataForTable.push([]);

  // Overhead elements
  overheadElements.forEach(ele => {
    const row = {
      elementKey: ele.key || ele.name,
      data: [ele.name],
    };
    months.forEach(month => row.data.push(cells[`${ele.key || ele.name}-${month.label}`].value));
    dataForTable.push(row);
  });

  const totalOverheadsRow = {
    rowStyle: 'total',
    data: ['Total Overheads'],
  };
  months.forEach(month => totalOverheadsRow.data.push(totals[`Overheads-${month.label}`]));
  dataForTable.push(totalOverheadsRow);
  dataForTable.push([]);

  // Net Profit
  const netProfitRow = {
    rowStyle: 'total',
    data: ['Net Profit'],
  };
  months.forEach(month => netProfitRow.data.push(totals[`NetProfit-${month.label}`]));
  dataForTable.push(netProfitRow);

  return {
    cells,
    dataForTable,
    costElements,
    revenueElements,
    overheadElements,
  };
};

/**
 * End of calculations of main report
 */
