import moment from 'moment';

export const dateFormat = 'YYYY-MM-DD';
const payrollTaxRate = 0.06;

/**
 * Get base data for company forecasting.
 * !! Should be performed on a dedicated calc server to avoid ping-pong.
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
        consultant_id: {
          $in: consultantIds,
        },
      },
      include: [{ as: 'consultant' }, { as: 'project' }, { as: 'probability' }],
      limit: 100000,
    }),
  );

  const [forecastElements, rosterEntries] = await Promise.all(promises);

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
 * Calculate permanent consultant salaries of given months
 */
export const calculatePermConsultantSalariesAndTax = ({ consultants, months, cells }) => {
  for (const month of months) {
    for (const consultant of consultants) {
      const monthlySalary = consultant.annualSalary ? +consultant.annualSalary / 12 : 0;

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

      if (salary > 0) {
        const salaryCellKey = `SAL-${month.label}`;
        if (!cells[salaryCellKey]) cells[salaryCellKey] = { value: 0 };
        cells[salaryCellKey][consultant.id] = salary;
        cells[salaryCellKey].value += +salary;

        const taxCellKey = `PTAX-${month.label}`;
        const tax = (+salary * payrollTaxRate).toFixed(2);
        if (!cells[taxCellKey]) cells[taxCellKey] = { value: 0 };
        cells[taxCellKey][consultant.id] = tax;
        cells[taxCellKey].value += +tax;
      }
    }
  }
};

/**
 * Calculate Payroll Tax
 * For permanents and contractors with 'incursPayrollTax' flag on
 */
// export const calculatePayrollTaxes = ({ permConsultants, contractConsultants, months, cells }) => {
//   for (const month of months) {
//     const cellKey = `PTAX-${month.label}`;

//     // Perms
//     for (const consultant of permConsultants) {
//       const monthlyTax = consultant.annualSalary
//         ? (+consultant.annualSalary / 12) * payrollTaxRate
//         : 0;

//       if (monthlyTax > 0) {
//         if (!cells[cellKey]) cells[cellKey] = { value: 0 };
//         cells[cellKey][consultant.id] = monthlyTax;
//         cells[cellKey].value += monthlyTax;
//       }
//     }

//     // Contractors
//     for (const consultant of contractConsultants) {
//       // TODO
//       // if (consultant.incursPayrollTax) {
//       //   const monthlyTax = consultant.annualSalary
//       //     ? (+consultant.annualSalary / 12) * payrollTaxRate
//       //     : 0;
//       //   if (monthlyTax > 0) {
//       //     if (!cells[cellKey]) cells[cellKey] = { value: 0 };
//       //     cells[cellKey][consultant.id] = monthlyTax;
//       //     cells[cellKey].value += monthlyTax;
//       //   }
//       // }
//     }
//   }
// };

export const calculateBonusProvision = ({ months, cells }) => {};
