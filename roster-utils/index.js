import moment from 'moment';

export const getMonday = (date = moment()) => moment(date).day(1);

export const daysDisplayed = 82;
export const dateFormat = 'YYYY-MM-DD';

export const datesToArray = (from, to) => {
  const list = [];
  let day = moment(from).clone();

  do {
    list.push(day);
    day = day.clone().add(1, 'd');
  } while (day < to);
  return list;
};

export const datesToArrayByStart = start => {
  const startDate = moment(start);
  return datesToArray(startDate, startDate.clone().add(daysDisplayed, 'd'));
};

export const datesEqual = (time1, time2) => {
  const moment1 = moment(time1);
  const moment2 = moment(time2);
  return moment1.format(dateFormat) === moment2.format(dateFormat);
};

const weekdayOptions = [
  {
    id: '1',
    label: 'Monday',
  },
  {
    id: '2',
    label: 'Tuesday',
  },
  {
    id: '3',
    label: 'Wednesday',
  },
  {
    id: '4',
    label: 'Thursday',
  },
  {
    id: '5',
    label: 'Friday',
  },
  {
    id: '6',
    label: 'Saturday',
  },
  {
    id: '7',
    label: 'Sunday',
  },
];

export const getEntryFormFields = (projectOptions, probabilityOptions) => [
  {
    name: 'project_id',
    label: 'Project',
    type: 'FixedList',
    properties: {
      options: projectOptions,
    },
    validate: [value => (value ? undefined : 'Required')],
  },
  {
    path: 'date',
    name: 'startDate',
    label: 'From',
  },
  {
    path: 'date',
    name: 'endDate',
    label: 'Until',
  },
  {
    name: 'weekdayFrom',
    label: 'Weekday From',
    type: 'FixedList',
    properties: {
      options: weekdayOptions,
    },
    validate: [value => (value ? undefined : 'Required')],
  },
  {
    name: 'weekdayTo',
    label: 'Weekday To',
    type: 'FixedList',
    properties: {
      options: weekdayOptions,
    },
    validate: [value => (value ? undefined : 'Required')],
  },
  {
    name: 'probability_id',
    label: 'Probability',
    type: 'FixedList',
    properties: {
      options: probabilityOptions,
    },
    validate: [value => (value ? undefined : 'Required')],
  },
  {
    name: 'shouldOverrideLeaves',
    type: 'Checkbox',
    label: 'Overwrite Leave',
  },
  {
    name: 'comment',
    type: 'TextArea',
    label: 'Comments',
  },
];

export const updateRosterEntryRecords = async ({ data, consultant, operatorName, $models }) => {
  const { RosterEntry, RosterChange } = $models;

  const leaveProjects = await $models.Project.findAll({
    where: {
      projectType: {
        $in: ['4', '5', '6'],
      },
    },
  });

  // Generate new entries
  const newEntries = [];
  for (
    let d = moment(data.startDate).clone();
    d.isSameOrBefore(moment(data.endDate));
    d.add(1, 'day')
  ) {
    let weekdayIndex = d.day();
    // Sunday's index is 7
    if (weekdayIndex === 0) weekdayIndex = 7;
    if (weekdayIndex >= +data.weekdayFrom && weekdayIndex <= +data.weekdayTo) {
      // Only pick chosen weekdays
      newEntries.push({
        date: d.format('YYYY-MM-DD'),
        consultant_id: data.consultant_id,
        project_id: data.project_id,
        probability_id: data.probability_id,
      });
    }
  }

  if (newEntries.length === 0) return null;
  const dates = newEntries.map(e => e.date);

  // Don't override leave entries
  const leaveEntries = await RosterEntry.findAll({
    where: {
      consultant_id: data.consultant_id,
      date: {
        $in: dates,
      },
      project_id: {
        $in: leaveProjects.map(p => p.id),
      },
    },
  });

  const destroyQuery = {
    consultant_id: data.consultant_id,
    date: {
      $in: dates,
    },
  };

  if (!data.shouldOverrideLeaves) {
    destroyQuery.id = {
      $notIn: leaveEntries.map(e => e.id),
    };
  }

  await RosterEntry.destroy({
    where: destroyQuery,
  });

  // Create change log
  RosterChange.create({
    changedBy: operatorName,
    changeDate: moment().format(dateFormat),
    comment: data.comment,
    consultant: consultant.name,
    startDate: data.startDate,
    endDate: data.endDate,
    project_id: data.project_id,
    probability_id: data.probability_id,
    weekdayFrom: data.weekdayFrom,
    weekdayTo: data.weekdayTo,
  });

  const leaveEntryDates = leaveEntries.map(e => e.date);
  const entriesToCreate = data.shouldOverrideLeaves
    ? newEntries
    : newEntries.filter(e => !leaveEntryDates.includes(e.date));

  return RosterEntry.bulkCreate(entriesToCreate);
};

export const projectAssignmentsToOptions = (projectAssignments, leaveProjects = []) =>
  projectAssignments
    .map(pa => ({
      id: pa.project_id,
      label: pa.project.name,
    }))
    .concat(
      leaveProjects.map(p => ({
        id: p.id,
        label: p.name,
      })),
    )
    .sort((a, b) => {
      if (a.label < b.label) return -1;
      if (a.label > b.label) return 1;
      return 0;
    })
    .map((op, index) => ({
      ...op,
      pos: index,
    }));
