import moment from "moment";

export const getMonday = (date = moment()) => moment(date).day(1);

export const daysDisplayed = 82;
export const dateFormat = "YYYY-MM-DD";

export const datesToArray = (from, to, toStringDate) => {
  const list = [];
  let day = moment(from).clone();

  do {
    list.push(toStringDate ? day.format(dateFormat) : day);
    day = day.clone().add(1, "d");
  } while (day <= moment(to));
  return list;
};

export const datesToArrayByStart = start => {
  const startDate = moment(start);
  return datesToArray(startDate, startDate.clone().add(daysDisplayed, "d"));
};

export const datesEqual = (time1, time2) => {
  const moment1 = moment(time1);
  const moment2 = moment(time2);
  return moment1.format(dateFormat) === moment2.format(dateFormat);
};

export const getEntryFormFields = (projectOptions, probabilityOptions) => [
  {
    name: "project_id",
    label: "Project",
    type: "FixedList",
    properties: {
      options: projectOptions
    }
  },
  {
    path: "date",
    name: "startDate",
    label: "From"
  },
  {
    path: "date",
    name: "endDate",
    label: "Until"
  },
  {
    name: "monday",
    type: "Checkbox",
    label: "Monday"
  },
  {
    name: "tuesday",
    type: "Checkbox",
    label: "Tuesday"
  },
  {
    name: "wednesday",
    type: "Checkbox",
    label: "Wednesday"
  },
  {
    name: "thursday",
    type: "Checkbox",
    label: "Thursday"
  },
  {
    name: "friday",
    type: "Checkbox",
    label: "Friday"
  },
  {
    name: "probability_id",
    label: "Probability",
    type: "FixedList",
    properties: {
      options: probabilityOptions
    },
    validate: [value => (value ? undefined : "Required")]
  },
  {
    name: "shouldOverrideLeaves",
    type: "Checkbox",
    label: "Overwrite Leave"
  },
  {
    name: "comment",
    type: "TextArea",
    label: "Comments"
  }
];

export const projectAssignmentsToOptions = (
  projectAssignments,
  leaveProjects = []
) => {
  return projectAssignments
    .filter(pa => pa.project)
    .map(pa => ({
      id: pa.project_id,
      label: pa.project.name
    }))
    .concat(
      leaveProjects.map(p => ({
        id: p.id,
        label: p.name
      }))
    )
    .sort((a, b) => {
      if (a.label < b.label) return -1;
      if (a.label > b.label) return 1;
      return 0;
    })
    .map((op, index) => ({
      ...op,
      value: op.id,
      pos: index
    }));
};
