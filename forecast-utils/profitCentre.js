/* eslint no-param-reassign: "off" */
import moment from 'moment';

const dateFormat = 'YYYY-MM-DD';
const forecastElements = [
  'T&M Project Revenue',
  'T&M Project Cost',
  'People Cost Recovery',
  'People Cost',
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
  // TODO: improve query
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

  const [rosterEntriesByProject, forecastEntries] = await Promise.all(promises);

  return {
    costCenters,
    allConsultants,
    consultants,
    projects,
    forecastEntries,
    projectAssignmentLookup,
    rosterEntries: rosterEntriesByProject,
  };
};

const calculateProjects = ({ cells, rosterEntries, projectAssignmentLookup }) => {
  for (const entry of rosterEntries) {
    const monthLabel = moment(entry.data).format('MMM YYYY');

    const revenueCellKey = `T&M Project Revenue-${monthLabel}`;
    if (!cells[revenueCellKey][entry.project_id]) cells[revenueCellKey][entry.project_id] = 0;

    if (!projectAssignmentLookup[`${entry.consultant_id}.${entry.project_id}`]) {
      // IMPOSSIBLE
      console.log(projectAssignmentLookup, entry);
    }

    const { dayRate } = projectAssignmentLookup[`${entry.consultant_id}.${entry.project_id}`];
    const rate = dayRate ? +dayRate : 0;
    cells[revenueCellKey][entry.project_id] += rate;
    cells[revenueCellKey].value += rate;

    const costCellKey = `T&M Project Cost-${monthLabel}`;
    if (!cells[costCellKey][entry.project_id]) cells[revenueCellKey][entry.project_id] = 0;
    const { internalRate } = entry.consultant;
    if (internalRate) {
      cells[costCellKey][entry.project_id] += +internalRate;
      cells[costCellKey].value += +internalRate;
    }
  }
};

export const calculateProfitCentreMainReport = ({
  months,
  rosterEntries,
  projectAssignmentLookup,
}) => {
  // initialize cells
  const cells = {};
  for (const element of forecastElements) {
    for (const month of months) {
      const cellKey = `${element}-${month.label}`;
      cells[cellKey] = { value: 0 };
    }
  }

  calculateProjects({
    cells,
    rosterEntries,
    projectAssignmentLookup,
  });

  return {
    cells,
  };
};
