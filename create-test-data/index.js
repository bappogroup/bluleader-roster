import React from 'react';
import moment from 'moment';

class Dummy extends React.Component {
  deleteAllForecastEntries = async () => {
    const { ForecastEntry } = this.props.$models;
    try {
      await ForecastEntry.destroy({
        where: {},
      });
      alert('done');
    } catch (e) {
      console.log(e);
    }
  };

  deleteAllProjectForecastEntries = async () => {
    const { ProjectForecastEntry } = this.props.$models;
    try {
      await ProjectForecastEntry.destroy({
        where: {},
      });
      alert('done');
    } catch (e) {
      console.log(e);
    }
  };

  deleteAllRosterEntries = async () => {
    const { RosterEntry } = this.props.$models;
    try {
      await RosterEntry.destroy({
        where: {},
      });
      alert('done');
    } catch (e) {
      console.log(e);
    }
  };

  deleteAllUserPreferences = async () => {
    const { UserPreference } = this.props.$models;
    try {
      await UserPreference.destroy({
        where: {},
      });
      alert('done');
    } catch (e) {
      console.log(e);
    }
  };

  deleteConsultants = async () => {
    this.props.$models.Consultant.destroy({ where: {} });
  };

  deleteProjectAssignments = async () => {
    this.props.$models.ProjectAssignment.destroy({ where: {} });

    alert('done');
  };

  deleteAllRosterChanges = async () => {
    this.props.$models.RosterChange.destroy({ where: {} });

    alert('done');
  };

  generateConsultants = async cnt => {
    const { Consultant } = this.props.$models;

    Consultant.destroy({ where: {} });

    const consultant = {
      active: true,
      annualSalary: '120000.00',
      consultantType: '1',
      costCenter_id: '1',
      internalRate: '600.00',
      name: 'Consultant',
      startDate: '2018-01-01',
    };

    let n;
    const a = [];
    for (n = 1; n < cnt; n++) {
      a.push({ ...consultant, name: `Consultant ${n}` });
    }

    try {
      await Consultant.bulkCreate(a);
    } catch (e) {
      console.log(e);
    }

    alert('finished');
  };

  generateProjectAssigments = async () => {
    const { Consultant, ProjectAssignment, RosterEntry, Project } = this.props.$models;
    const consultants = await Consultant.findAll({ limit: 1000 });
    await ProjectAssignment.destroy({ where: {} });
    await RosterEntry.destroy({ where: {} });
    const projects = await Project.findAll({});
    const project_id = projects[0].id;

    let a = [];
    for (const c of consultants) {
      // assign this consultant to all projects
      for (const p of projects) {
        a.push({ consultant_id: c.id, project_id: p.id, dayRate: '700' });
      }

      try {
        await ProjectAssignment.bulkCreate(a);
        console.log('created project assignments for one consultant');
      } catch (err) {
        console.log(err);
      }
      a = [];
    }
    alert('done');
  };

  generateRosterEntries = async () => {
    const { Consultant, Project, RosterEntry } = this.props.$models;

    const consultants = await Consultant.findAll({ limit: 1000 });
    const projects = await Project.findAll({});

    const promises = [];
    let project;

    await RosterEntry.destroy({ where: {} });

    for (const c of consultants) {
      project = projects[Math.floor(Math.random() * projects.length)];
      // book this consultant for multiple days
      const e = [];
      for (let i = 0; i <= 365; i++) {
        const date = moment().add(i, 'days');
        if (date.weekday() > 0 && date.weekday() < 6) {
          e.push({
            consultant_id: c.id,
            project_id: project.id,
            probability: '1',
            date: date.format('YYYY-MM-DD'),
          });
        }
      }
      try {
        await RosterEntry.bulkCreate(e);
        console.log('create Rosters for a consultant');
      } catch (err) {
        alert(err);
        console.log(err);
      }
      e = [];
    }
    alert('Done');
  };

  cleanRosterHistory = async () => {
    try {
      await this.props.$models.RosterChange.destroy({
        where: {
          changedBy: 'Stanley Luo',
        },
      });
      await this.props.$models.RosterChange.destroy({
        where: {
          changedBy: 'Hernus Carelsen',
        },
      });
    } catch (e) {
      console.log(e);
    }

    alert('done');
  };

  render() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <button onClick={this.deleteAllForecastEntries}>Delete all Forecast Entry Records</button>
        <button onClick={this.deleteAllProjectForecastEntries}>
          Delete all Project Forecast Entry Records
        </button>
        <button onClick={this.deleteAllRosterEntries}>Delete all Roster Entry Records</button>
        <button onClick={this.deleteAllUserPreferences}>Delete all User Preferences</button>
        <button onClick={this.deleteConsultants}>Delete all consultants</button>
        <button onClick={this.deleteProjectAssignments}>Delete all project assignments</button>
        <button onClick={this.deleteAllRosterChanges}>Delete all roster changes</button>
        <button onClick={() => this.generateConsultants(10)}>Generate 10 Consultants</button>
        <button onClick={() => this.generateConsultants(100)}>Generate 100 Consultants</button>
        <button onClick={() => this.generateConsultants(500)}>Generate 500 Consultants</button>
        <button onClick={this.generateProjectAssigments}>Generate Project Assignments</button>
        <button onClick={this.generateRosterEntries}>Generate Roster Entries</button>
        <button onClick={this.cleanRosterHistory}>Clean invalid Roster Changes</button>
      </div>
    );
  }
}

export default Dummy;
