import moment from 'moment';

export const dateFormat = 'YYYY-MM-DD';
const billableProbabilities = ['50%', '90%', '100%'];
const payrollTaxRate = 0.06;

/**
 * Determine whether a roster entry incurs contractor wage
 * Conditions are:
 * 1. prob >= 50%
 * 2. project type === 2 ('T&M')
 * 3. consultant type === 2 ('Contractor')
 *
 * @param {object} roster entry
 * @return {boolean}
 */
const rosterEntryIncursContractorWages = rosterEntry => {
  const probability = rosterEntry.probability.name;

  if (
    rosterEntry.consultant.consultantType === '2' &&
    rosterEntry.project.projectType === '2' &&
    billableProbabilities.includes(probability)
  ) {
    return true;
  }
  return false;
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
export const getForecastBaseData = async ({ $models, companyId, startDate, endDate }) => {
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
  // TODO: now fetch yearly entries then filter
  // promises.push(
  //   $models.ForecastEntry.findAll({
  //     where: {
  //       year: {
  //         $in: [moment(startDate).year(), moment(endDate).year()],
  //       }
  //     },
  //     include: [{ as: 'forecastElement' }],
  //     limit: 100000,
  //   }),
  // );

  const [forecastElements, rosterEntries, forecastEntries] = await Promise.all(promises);

  return {
    costCenters,
    allConsultants,
    consultants,
    projects,
    forecastElements,
    projectAssignmentLookup,
    rosterEntries,
  };
};

export const getMonthArray = (rawStartDate, rawEndDate) => {
  const startDate = moment(rawStartDate).startOf('month');
  const endDate = moment(rawEndDate).startOf('month');
  const monthArray = [];

  for (const start = startDate.clone(); start.isSameOrBefore(endDate); start.add(1, 'month')) {
    monthArray.push({
      label: start.format('MMM YYYY'),
      firstDay: start.clone(),
    });
  }

  return monthArray;
};

/**
 * Start of salculations of main report
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
export const calculatePermConsultants = ({ consultants, months, cells }) => {
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

        const taxCellKey = `PTAX-${month.label}`;
        const tax = (+salary * payrollTaxRate).toFixed(2);
        cells[taxCellKey][consultant.id] = tax;
        cells[taxCellKey].value += +tax;
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
 * Calculate permanent consultant data of given months
 * Includes: 'wages' and 'payroll tax'
 *
 * Conditions for wage: see the util function at top
 *
 * Condition for payroll tax:
 * 1. if contractor, he/she should have the flag 'incursPayrollTax' true
 */
export const calculateContractConsultants = ({ consultants, cells, rosterEntries }) => {
  // Find rosterEntries that are assigned to contractors
  const contractorIds = consultants.map(c => c.id);
  const contractorRosterEntries = rosterEntries.filter(e =>
    contractorIds.includes(e.consultant_id),
  );

  for (const entry of contractorRosterEntries) {
    if (rosterEntryIncursContractorWages(entry)) {
      // Wages
      const monthLabel = moment(entry.data).format('MMM YYYY');
      const wageCellKey = `CWAGES-${monthLabel}`;
      const taxCellKey = `PTAX-${monthLabel}`;

      if (!cells[wageCellKey][entry.consultant_id]) cells[wageCellKey][entry.consultant_id] = 0;

      const dailyRate = +entry.consultant.dailyRate || 0;

      if (dailyRate > 0) {
        cells[wageCellKey][entry.consultant_id] += dailyRate;
        cells[wageCellKey].value += dailyRate;

        // Payroll Taxes
        const tax = +(dailyRate * payrollTaxRate).toFixed(2);
        if (!cells[taxCellKey][entry.consultant_id]) cells[taxCellKey][entry.consultant_id] = 0;
        cells[taxCellKey][entry.consultant_id] += tax;
        cells[taxCellKey].value += tax;
      }
    }
  }
};

/**
 * Calculate and update 'Service Revenue' row in a financial year by:
 * accumulating revenue gained from roster entries. Revenue comes from ProjectAssignment.dayRate
 */
export const calculateServiceRevenue = ({ cells, rosterEntries, projectAssignmentLookup }) => {
  for (const entry of rosterEntries) {
    // This project assignment must exist!
    const { dayRate } = projectAssignmentLookup[`${entry.consultant_id}.${entry.project_id}`];

    const monthLabel = moment(entry.data).format('MMM YYYY');
    const cellKey = `TMREV-${monthLabel}`;

    if (!cells[cellKey][entry.consultant_id]) cells[cellKey][entry.consultant_id] = 0;
    cells[cellKey][entry.consultant_id] += +dayRate;
    cells[cellKey].value += +dayRate;
  }
};
