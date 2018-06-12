import moment from 'moment';

export const dateFormat = 'YYYY-MM-DD';

/**
 * Get base data for forecasting.
 * !! Should be performed on a dedicated calc server to avoid ping-pong.
 *
 * @param {object} $models
 * @param {array of string} profitCentreIds
 * @return {object} base data
 */
export const getForecastBaseData = async ({ $models, profitCentreId, startDate, endDate }) => {
  if (!($models && startDate && endDate)) return null;

  // if profitCentreId is not specified, fetch data for all profitCentreIds
  const profitCentreQuery = {
    where: {},
    limit: 1000,
  };

  if (profitCentreId) profitCentreQuery.where.profitCentre_id = profitCentreId;

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
      firstDay: start,
    });
  }

  return monthArray;
};
