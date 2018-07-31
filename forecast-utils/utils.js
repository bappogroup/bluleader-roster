import moment from "moment";

/**
 * Calculate partial monthly salary: how many days of this month is with in consultant's start/end date
 * Consultant start date is required, while end date is optional
 */
export const calculatePartialMonth = ({
  month,
  consultantStartDate,
  consultantEndDate
}) => {
  let validDays = 0;
  const { firstDay } = month;
  const totalDays = moment(firstDay).daysInMonth();
  const monthStart = moment(firstDay).startOf("month");
  const monthEnd = moment(firstDay).endOf("month");
  const consultantStart = moment(consultantStartDate);
  const consultantEnd = consultantEndDate && moment(consultantEndDate);

  for (let m = monthStart; m.isBefore(monthEnd); m.add(1, "days")) {
    if (consultantEnd) {
      if (m.isSameOrAfter(consultantStart) && m.isSameOrBefore(consultantEnd)) {
        validDays++;
      }
    } else if (m.isSameOrAfter(consultantStart)) {
      validDays++;
    }
  }

  return validDays / totalDays;
};

/**
 * Get authorised profitCentres from user_id and manager assignments
 */
export const getAuthorisedProfitCentres = async ({ $models, user_id }) => {
  const managers = await $models.Manager.findAll({
    where: { user_id }
  });

  if (!managers.length) {
    return {
      error: "You need manager permission to access this page."
    };
  }

  const managerAssignments = await $models.ManagerAssignment.findAll({
    where: {
      manager_id: {
        $in: managers.map(m => m.id)
      }
    },
    include: [{ as: "profitCenter" }]
  });

  if (!managerAssignments.length) {
    return {
      error: "You need manager permission to access this page."
    };
  }

  let profitCentres;

  if (managerAssignments.length === 1 && managerAssignments[0].all) {
    // Wildcard manager
    profitCentres = await $models.ProfitCentre.findAll({});
  } else {
    // Normal manager
    profitCentres = managerAssignments.map(ma => ma.profitCenter);
  }

  return {
    profitCentres
  };
};
