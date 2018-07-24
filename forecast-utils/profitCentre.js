/* eslint no-param-reassign: "off" */
import moment from "moment";
import {
  payrollTaxRate,
  leaveProjectTypeIndexes,
  yearlyWorkingDays,
  billableProbabilityKeys,
  extendedBillableProbabilityKeys
} from "./constants";

const dateFormat = "YYYY-MM-DD";

export const pcForecastElements = [
  "T&M Project Revenue",
  "Fixed Price Project Revenue",
  "Fixed PP Overheads",
  "Project Cost",
  "Project Expense",
  "People Cost Recovery",
  "Consultant Cost(permanent)",
  "Consultant Cost(contractor)",
  "Other Revenue",
  "Overheads"
];

export const getDaysInMonth = month => {
  const startDate = moment(month).startOf("month");
  const endDate = moment(month).endOf("month");
  const days = [];

  for (
    const start = startDate.clone();
    start.isSameOrBefore(endDate);
    start.add(1, "day")
  ) {
    days.push({
      date: start.format(dateFormat),
      displayDate: start.format("DD/MM"),
      day: start.format("ddd")
      // moment: start.clone()
    });
  }

  return days;
};

/**
 * Similar, but only get base data for one profit centre
 */
export const getForecastBaseDataForProfitCentre = async ({
  $models,
  profitCentreId,
  startDate,
  endDate,
  periodIds,
  include50
}) => {
  if (!($models && profitCentreId && startDate && endDate)) return null;

  const profitCentreQuery = {
    where: {
      profitCentre_id: profitCentreId
    },
    limit: 1000
  };

  // Find cost centers and consultants of this profit centres
  const costCenters = await $models.CostCenter.findAll(profitCentreQuery);
  const costCenterIds = costCenters.map(cc => cc.id);

  const allConsultants = await $models.Consultant.findAll({
    include: [{ as: "costCenter" }],
    limit: 1000
  });

  const consultants = allConsultants.filter(
    c => costCenterIds.indexOf(c.costCenter_id) !== -1
  );

  const permConsultants = [];
  const contractConsultants = [];
  const casualConsultants = [];

  consultants.forEach(c => {
    switch (c.consultantType) {
      case "1":
        permConsultants.push(c);
        break;
      case "2":
        contractConsultants.push(c);
        break;
      case "3":
        casualConsultants.push(c);
        break;
      default:
    }
  });

  const consultantIds = consultants.map(c => c.id);

  // Find all projects
  const projects = await $models.Project.findAll(profitCentreQuery);

  const projectIds = projects.map(p => p.id);
  const fixedPriceProjectIds = projects.reduce((ids, project) => {
    if (project.projectType === "3") return [...ids, project.id];
    return ids;
  }, []);

  const [pa1, pa2, forecastElements] = await Promise.all([
    $models.ProjectAssignment.findAll({
      where: {
        consultant_id: { $in: consultantIds }
      },
      limit: 1000
    }),
    $models.ProjectAssignment.findAll({
      where: {
        project_id: { $in: projectIds }
      },
      limit: 1000
    }),
    $models.ForecastElement.findAll({})
  ]);

  // Create lookup for project assignments
  const projectAssignmentLookup = {};
  for (const pa of [...pa1, ...pa2]) {
    projectAssignmentLookup[`${pa.consultant_id}.${pa.project_id}`] = pa;
  }

  // Categorize forecast elements to fetch related forecast entries
  const revenueForecastElements = forecastElements.filter(
    ele => ele.elementType === "2"
  );
  const costForecastElements = forecastElements.filter(
    ele => ele.elementType === "1" || ele.elementType === "3"
  );

  const promises = [];

  // Fetch roster entries
  promises.push(
    $models.RosterEntry.findAll({
      where: {
        date: {
          $between: [
            moment(startDate).format(dateFormat),
            moment(endDate).format(dateFormat)
          ]
        },
        project_id: {
          $in: projectIds
        }
      },
      include: [{ as: "consultant" }, { as: "project" }, { as: "probability" }],
      limit: 100000
    })
  );

  promises.push(
    $models.RosterEntry.findAll({
      where: {
        date: {
          $between: [
            moment(startDate).format(dateFormat),
            moment(endDate).format(dateFormat)
          ]
        },
        consultant_id: {
          $in: consultantIds
        }
      },
      include: [{ as: "consultant" }, { as: "project" }, { as: "probability" }],
      limit: 100000
    })
  );

  // Fetch revenue forecast entries (software license etc)
  promises.push(
    $models.ForecastEntry.findAll({
      where: {
        period_id: {
          $in: periodIds
        },
        profitCentre_id: profitCentreId,
        forecastElement_id: {
          $in: revenueForecastElements.map(e => e.id)
        }
      },
      include: [{ as: "forecastElement" }, { as: "period" }],
      limit: 100000
    })
  );

  // Fetch cost forecast entries (rent etc)
  promises.push(
    $models.ForecastEntry.findAll({
      where: {
        period_id: {
          $in: periodIds
        },
        costCenter_id: {
          $in: costCenterIds
        },
        forecastElement_id: {
          $in: costForecastElements.map(e => e.id)
        }
      },
      include: [{ as: "forecastElement" }, { as: "period" }],
      limit: 100000
    })
  );

  // Fetch fixed price project forecast entries
  promises.push(
    $models.ProjectForecastEntry.findAll({
      where: {
        project_id: {
          $in: fixedPriceProjectIds
        },
        period_id: {
          $in: periodIds
        }
      },
      include: [{ as: "project" }, { as: "period" }],
      limit: 100000
    })
  );

  const [
    rosterEntriesByProject,
    rosterEntriesByConsultant,
    forecastEntriesRevenue,
    forecastEntriesCost,
    projectForecastEntries
  ] = await Promise.all(promises);

  // build roster entry lookup, key is `consultantId-date`
  const rosterEntryLookupByConsultant = {};
  rosterEntriesByConsultant.forEach(entry => {
    const key = `${entry.consultant_id}-${entry.date}`;
    rosterEntryLookupByConsultant[key] = entry;
  });

  const validProbabilityKeys = include50
    ? extendedBillableProbabilityKeys
    : billableProbabilityKeys;

  return {
    costCenters,
    allConsultants,
    consultants,
    permConsultants,
    contractConsultants,
    casualConsultants,
    projects,
    forecastEntriesRevenue,
    forecastEntriesCost,
    projectAssignmentLookup,
    rosterEntriesByProject: rosterEntriesByProject.filter(e =>
      validProbabilityKeys.includes(e.probability.key)
    ),
    rosterEntriesByConsultant: rosterEntriesByConsultant.filter(e =>
      validProbabilityKeys.includes(e.probability.key)
    ),
    rosterEntryLookupByConsultant,
    projectForecastEntries
  };
};

const calculateProjects = ({
  cells,
  rosterEntriesByProject,
  projectAssignmentLookup
}) => {
  rosterEntriesByProject.forEach(entry => {
    const { projectType } = entry.project;
    if (leaveProjectTypeIndexes.includes(projectType) || projectType === "7")
      return;

    const monthLabel = moment(entry.date).format("MMM YYYY");

    if (
      !projectAssignmentLookup[`${entry.consultant_id}.${entry.project_id}`]
    ) {
      // IMPOSSIBLE, IT'S A BUG
      console.log(projectAssignmentLookup, entry);
    }

    const { dayRate, projectExpense } = projectAssignmentLookup[
      `${entry.consultant_id}.${entry.project_id}`
    ];

    // T&M projects revenue, as dayRate of fixed price assignment would be 0
    if (projectType === "2") {
      const revenueCellKey = `T&M Project Revenue-${monthLabel}`;
      if (!cells[revenueCellKey][entry.project_id])
        cells[revenueCellKey][entry.project_id] = 0;
      const rate = dayRate ? +dayRate : 0;
      cells[revenueCellKey][entry.project_id] += rate;
      cells[revenueCellKey].value += rate;
    }

    // all project costs
    const costCellKey = `Project Cost-${monthLabel}`;
    if (!cells[costCellKey][entry.project_id])
      cells[costCellKey][entry.project_id] = 0;
    const { internalRate: canonicalInternalRate } = projectAssignmentLookup[
      `${entry.consultant_id}.${entry.project_id}`
    ];
    const { internalRate } = entry.consultant;
    const rate = canonicalInternalRate ? +canonicalInternalRate : +internalRate;
    cells[costCellKey][entry.project_id] += rate;
    cells[costCellKey].value += rate;

    // all project expenses
    const expenseCellKey = `Project Expense-${monthLabel}`;
    if (!cells[expenseCellKey][entry.project_id])
      cells[expenseCellKey][entry.project_id] = 0;
    const expense = projectExpense ? +projectExpense : 0;
    cells[expenseCellKey][entry.project_id] += expense;
    cells[expenseCellKey].value += expense;
  });
};

const calculateFixedPriceProject = ({ cells, projectForecastEntries }) => {
  projectForecastEntries.forEach(entry => {
    const monthLabel = moment(entry.period.name).format("MMM YYYY");

    switch (entry.forecastType) {
      case "1": {
        // Planned Cost
        // ignore in main report
        const cellKey = `Fixed Price Project Planned Cost-${monthLabel}`;
        const amount = +entry.amount;

        if (!cells[cellKey]) cells[cellKey] = { value: 0 };
        if (!cells[cellKey][entry.project_id])
          cells[cellKey][entry.project_id] = 0;
        cells[cellKey][entry.project_id] += amount;
        cells[cellKey].value += amount;
        break;
      }
      case "2": {
        // (planned) Revenue in report
        // will show in main report
        const cellKey = `Fixed Price Project Revenue-${monthLabel}`;
        const amount = +entry.amount;

        if (!cells[cellKey][entry.project_id])
          cells[cellKey][entry.project_id] = 0;
        cells[cellKey][entry.project_id] += amount;
        cells[cellKey].value += amount;
        break;
      }
      case "3": {
        // Actual Expense in report
        // will show in main report
        const cellKey = `Fixed PP Overheads-${monthLabel}`;
        const amount = +entry.amount;

        if (!cells[cellKey][entry.project_id])
          cells[cellKey][entry.project_id] = 0;
        cells[cellKey][entry.project_id] += amount;
        cells[cellKey].value += amount;
        break;
      }
      default:
    }
  });
};

const calculatePeopleRecovery = ({ cells, rosterEntriesByConsultant }) => {
  rosterEntriesByConsultant.forEach(entry => {
    const { projectType } = entry.project;
    if (leaveProjectTypeIndexes.includes(projectType) || projectType === "7")
      return;

    const monthLabel = moment(entry.date).format("MMM YYYY");

    const recoveryKey = `People Cost Recovery-${monthLabel}`;
    if (!cells[recoveryKey][entry.consultant_id])
      cells[recoveryKey][entry.consultant_id] = 0;

    const { internalRate } = entry.consultant;
    cells[recoveryKey][entry.consultant_id] += +internalRate;
    cells[recoveryKey].value += +internalRate;
  });
};

const calculatePeopleCost = ({
  cells,
  months,
  permConsultants,
  rosterEntriesByConsultant
}) => {
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
      const monthlyPtax = +(
        (+monthlySalary + +monthlyBonus) *
        payrollTaxRate
      ).toFixed(2);

      const lvProv = +(
        (consultant.annualSalary / yearlyWorkingDays) *
        2
      ).toFixed(2);

      const cost = monthlySalary + monthlyBonus + monthlyPtax + lvProv;

      if (!cells[cellKey][consultant.id]) cells[cellKey][consultant.id] = 0;
      cells[cellKey][consultant.id] += cost;
      cells[cellKey].value += cost;
    }
  }

  // Contractors
  const contractorEntries = rosterEntriesByConsultant.filter(
    e => e.consultant.consultantType === "2"
  );

  contractorEntries.forEach(entry => {
    const { projectType } = entry.project;
    if (leaveProjectTypeIndexes.includes(projectType) || projectType === "7")
      return;

    const monthLabel = moment(entry.date).format("MMM YYYY");
    const cellKey = `Consultant Cost(contractor)-${monthLabel}`;
    if (!cells[cellKey][entry.consultant_id])
      cells[cellKey][entry.consultant_id] = 0;

    const pay = +entry.consultant.dailyRate;
    cells[cellKey][entry.consultant_id] += pay;
    cells[cellKey].value += pay;
  });
};

const calculateForecastEntries = ({
  cells,
  forecastEntriesRevenue,
  forecastEntriesCost
}) => {
  for (const entry of forecastEntriesRevenue) {
    const monthLabel = moment(entry.period.name).format("MMM YYYY");
    const cellKey = `Other Revenue-${monthLabel}`;
    const amount = +entry.amount;

    if (!cells[cellKey][entry.forecastElement.name])
      cells[cellKey][entry.forecastElement.name] = 0;
    cells[cellKey][entry.forecastElement.name] += amount;
    cells[cellKey].value += amount;
  }

  for (const entry of forecastEntriesCost) {
    const monthLabel = moment(entry.period.name).format("MMM YYYY");
    const cellKey = `Overheads-${monthLabel}`;
    const amount = +entry.amount;

    if (!cells[cellKey][entry.forecastElement.name])
      cells[cellKey][entry.forecastElement.name] = 0;
    cells[cellKey][entry.forecastElement.name] += amount;
    cells[cellKey].value += amount;
  }
};

export const calculateProfitCentreMainReport = ({
  permConsultants,
  months,
  rosterEntriesByProject,
  rosterEntriesByConsultant,
  projectAssignmentLookup,
  projectForecastEntries,
  forecastEntriesRevenue,
  forecastEntriesCost
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
    projectAssignmentLookup
  });
  calculateFixedPriceProject({
    cells,
    projectForecastEntries
  });
  calculatePeopleRecovery({
    cells,
    rosterEntriesByConsultant
  });
  calculatePeopleCost({
    cells,
    months,
    permConsultants,
    rosterEntriesByConsultant
  });
  calculateForecastEntries({
    cells,
    forecastEntriesRevenue,
    forecastEntriesCost
  });

  return {
    cells
  };
};
