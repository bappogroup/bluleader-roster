/* eslint no-param-reassign: "off" */
import moment from 'moment';

const dateFormat = 'YYYY-MM-DD';
const payrollTaxRate = 0.06;
export const pcForecastElements = [
  'T&M Project Revenue',
  'T&M Project Cost',
  'People Cost Recovery',
  'Consultant Cost(permanent)',
  'Consultant Cost(contractor)',
  'Overheads',
];

/**
 * Similar, but only get base data for one profit centre
 */
export const getForecastBaseDataForProfitCentre = async ({
  $models,
  profitCentreId,
  startDate,
  endDate,
  periodIds,
}) => {
  if (!($models && profitCentreId && startDate && endDate)) return null;

  const profitCentreQuery = {
    where: {
      profitCentre_id: profitCentreId,
    },
    limit: 1000,
  };

  // Find cost centers and consultants of this profit centres
  const costCenters = await $models.CostCenter.findAll(profitCentreQuery);
  const costCenterIds = costCenters.map(cc => cc.id);

  const allConsultants = await $models.Consultant.findAll({
    include: [{ as: 'costCenter' }],
    limit: 1000,
  });

  const consultants = allConsultants.filter(c => costCenterIds.indexOf(c.costCenter_id) !== -1);

  const permConsultants = [];
  const contractConsultants = [];
  const casualConsultants = [];

  consultants.forEach(c => {
    switch (c.consultantType) {
      case '1':
        permConsultants.push(c);
        break;
      case '2':
        contractConsultants.push(c);
        break;
      case '3':
        casualConsultants.push(c);
        break;
      default:
    }
  });

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

  // Fetch roster entries
  promises.push(
    $models.RosterEntry.findAll({
      where: {
        date: {
          $between: [moment(startDate).format(dateFormat), moment(endDate).format(dateFormat)],
        },
        project_id: {
          $in: projectIds,
        },
      },
      include: [{ as: 'consultant' }, { as: 'project' }],
      limit: 100000,
    }),
  );

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
      include: [{ as: 'consultant' }, { as: 'project' }],
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
        costCenter_id: {
          $in: costCenterIds,
        },
      },
      include: [{ as: 'forecastElement' }, { as: 'period' }],
      limit: 100000,
    }),
  );

  const [rosterEntriesByProject, rosterEntriesByConsultant, forecastEntries] = await Promise.all(
    promises,
  );

  return {
    costCenters,
    allConsultants,
    consultants,
    permConsultants,
    contractConsultants,
    casualConsultants,
    projects,
    forecastEntries,
    projectAssignmentLookup,
    rosterEntriesByProject,
    rosterEntriesByConsultant,
  };
};

const calculateProjects = ({ cells, rosterEntriesByProject, projectAssignmentLookup }) => {
  for (const entry of rosterEntriesByProject) {
    const monthLabel = moment(entry.date).format('MMM YYYY');

    const revenueCellKey = `T&M Project Revenue-${monthLabel}`;
    if (!cells[revenueCellKey][entry.project_id]) cells[revenueCellKey][entry.project_id] = 0;

    if (!projectAssignmentLookup[`${entry.consultant_id}.${entry.project_id}`]) {
      // IMPOSSIBLE, IT'S A BUG
      console.log(projectAssignmentLookup, entry);
    }

    const { dayRate } = projectAssignmentLookup[`${entry.consultant_id}.${entry.project_id}`];
    const rate = dayRate ? +dayRate : 0;
    cells[revenueCellKey][entry.project_id] += rate;
    cells[revenueCellKey].value += rate;

    const costCellKey = `T&M Project Cost-${monthLabel}`;
    if (!cells[costCellKey][entry.project_id]) cells[costCellKey][entry.project_id] = 0;
    const { internalRate } = entry.consultant;
    cells[costCellKey][entry.project_id] += +internalRate;
    cells[costCellKey].value += +internalRate;
  }
};

const calculatePeopleRecovery = ({ cells, rosterEntriesByConsultant }) => {
  for (const entry of rosterEntriesByConsultant) {
    const monthLabel = moment(entry.date).format('MMM YYYY');

    const recoveryKey = `People Cost Recovery-${monthLabel}`;
    if (!cells[recoveryKey][entry.consultant_id]) cells[recoveryKey][entry.consultant_id] = 0;

    const { internalRate } = entry.consultant;
    cells[recoveryKey][entry.consultant_id] += +internalRate;
    cells[recoveryKey].value += +internalRate;
  }
};

const calculatePeopleCost = ({ cells, months, permConsultants, rosterEntriesByConsultant }) => {
  // Perms
  for (const month of months) {
    for (const consultant of permConsultants) {
      const cellKey = `Consultant Cost(permanent)-${month.label}`;
      const monthlySalary = consultant.annualSalary
        ? +(consultant.annualSalary / 12).toFixed(2)
        : 0;
      const monthlyBonus = consultant.bonusProvision
        ? +(consultant.bonusProvision / 12).toFixed(2)
        : 0;
      const monthlyPtax = +(monthlySalary * payrollTaxRate).toFixed(2);
      const cost = monthlySalary + monthlyBonus + monthlyPtax;

      if (!cells[cellKey][consultant.id]) cells[cellKey][consultant.id] = 0;
      cells[cellKey][consultant.id] += cost;
      cells[cellKey].value += cost;
    }
  }

  // Contractors
  const contractorEntries = rosterEntriesByConsultant.filter(
    e => e.consultant.consultantType === '2',
  );

  for (const entry of contractorEntries) {
    const monthLabel = moment(entry.date).format('MMM YYYY');
    const cellKey = `Consultant Cost(contractor)-${monthLabel}`;
    if (!cells[cellKey][entry.consultant_id]) cells[cellKey][entry.consultant_id] = 0;

    const pay = +entry.consultant.dailyRate;
    cells[cellKey][entry.consultant_id] += pay;
    cells[cellKey].value += pay;
  }
};

const calculateForecastEntries = ({ cells, forecastEntries }) => {
  for (const entry of forecastEntries) {
    const monthLabel = moment(entry.period.name).format('MMM YYYY');
    const cellKey = `Overheads-${monthLabel}`;

    const amount = +entry.amount;
    if (!cells[cellKey][entry.forecastElement.name]) cells[cellKey][entry.forecastElement.name] = 0;
    cells[cellKey][entry.forecastElement.name] += amount;
    cells[cellKey].value += amount;
  }
};

export const calculateProfitCentreMainReport = ({
  permConsultants,
  contractConsultants,
  months,
  rosterEntriesByProject,
  rosterEntriesByConsultant,
  projectAssignmentLookup,
  forecastEntries,
}) => {
  // initialize cells
  const cells = {};
  for (const element of pcForecastElements) {
    for (const month of months) {
      const cellKey = `${element}-${month.label}`;
      cells[cellKey] = { value: 0 };
    }
  }

  calculateProjects({
    cells,
    rosterEntriesByProject,
    projectAssignmentLookup,
  });
  calculatePeopleRecovery({
    cells,
    rosterEntriesByConsultant,
  });
  calculatePeopleCost({
    cells,
    months,
    permConsultants,
    rosterEntriesByConsultant,
  });
  calculateForecastEntries({
    cells,
    forecastEntries,
  });

  return {
    cells,
  };
};
