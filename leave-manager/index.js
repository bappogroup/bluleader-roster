import React from 'react';
import Papa from 'papaparse';
import moment from 'moment';
import { mapKeys, camelCase } from 'lodash-es';
import { styled } from 'bappo-components';

const FileUploader = ({ onUpload }) => (
  <Button>
    <input
      type="file"
      id="fileUploader"
      accept=".csv, .xls"
      onChange={() => {
        const file = document.getElementById("fileUploader").files[0];
        onUpload(file);
      }}
    />
    Upload
  </Button>
);

export default FileUploader;

const Button = styled(TouchableView)`
  height: 100px;
  width: 100px;
  font-size: 20px;
  border-radius: 100px;
  position: relative;

  display: flex;
  justify-content: center;
  align-items: center;

  border: 4px solid #ffffff;
  overflow: hidden;
  background-image: linear-gradient(to bottom, #2590eb 50%, #ffffff 50%);
  background-size: 100% 200%;
  transition: all 1s;
  color: #ffffff;

  input[type="file"] {
    height: 200px;
    width: 200px;
    position: absolute;
    top: -10;
    left: 0;
    opacity: 1;
  }

  &:hover {
    cursor: pointer;
    background-position: 0 -100%;
    color: #2590eb;
  }
`;

const parseFormat = 'DD-MM-YY';
const bappoFormat = 'YYYY-MM-DD';

class LeaveManager extends React.Component {
  state = {
    error: null,
    invalidInternalIds: [],
    consultantMap: {}, // externalId -> consultant
    leaveProjectIds: null,
    annualLeaveSubmitted: null,
    annualLeaveApproved: null,
    probability_id: null,
  };

  componentDidMount() {
    const { Consultant, Project, Probability } = this.props.$models;

    Promise.all([
      Consultant.findAll(),
      Project.findAll({
        where: {
          projectType: {
            $in: ['4', '5', '6'],
          },
        },
      }),
      Probability.findAll({
        where: {
          name: 'NA',
        },
      }),
    ]).then(([consultants, projects, probs]) => {
      const consultantMap = {};
      consultants.forEach(c => {
        if (c.externalId) consultantMap[c.externalId] = c;
      });
      let annualLeaveSubmitted;
      let annualLeaveApproved;

      for (const p of projects) {
        switch (p.name) {
          case 'Annual Leave Submitted':
            annualLeaveSubmitted = p;
            break;
          case 'Annual Leave Approved':
            annualLeaveApproved = p;
            break;
          default:
        }
      }

      this.setState({
        consultantMap,
        leaveProjectIds: projects.map(p => p.id),
        annualLeaveSubmitted,
        annualLeaveApproved,
        probability_id: probs[0].id,
      });
    });
  }

  processCsv = async res => {
    const csv = res.data;
    const { fields } = res.meta;

    if (!csv.length) return null;
    const formattedFields = fields.map(f => camelCase(f));
    if (
      !(
        formattedFields.includes('startDate') &&
        formattedFields.includes('endDate') &&
        formattedFields.includes('internalId') &&
        formattedFields.includes('leaveType')
      )
    ) {
      return this.setState({
        error: 'CSV file must contains Start Date, End Date, Internal Id and Leave Type',
      });
    }

    const {
      leaveProjectIds,
      probability_id,
      consultantMap,
      annualLeaveApproved,
      annualLeaveSubmitted,
    } = this.state;
    const { RosterEntry } = this.props.$models;
    const destroyPromises = [];
    const entriesToCreate = [];
    const invalidInternalIds = [];

    csv.forEach(rawLeave => {
      const leave = mapKeys(rawLeave, (value, key) => camelCase(key));

      const start = moment(leave.startDate, parseFormat);
      const end = moment(leave.endDate, parseFormat);
      const consultant = consultantMap[leave.internalId];

      if (consultant) {
        destroyPromises.push(
          RosterEntry.destroy({
            where: {
              consultant_id: consultant.id,
              date: {
                $between: [start.format(bappoFormat), end.format(bappoFormat)],
              },
            },
          }),
        );

        let project_id;

        switch (leave.leaveType) {
          case 'submitted':
            project_id = annualLeaveSubmitted.id;
            break;
          case 'approved':
            project_id = annualLeaveApproved.id;
            break;
          default:
            project_id = leaveProjectIds[0];
        }

        for (let i = start.clone(); i.isSameOrBefore(end); i.add(1, 'day')) {
          entriesToCreate.push({
            date: i.format(bappoFormat),
            consultant_id: consultant.id,
            probability_id,
            project_id,
          });
        }
      } else invalidInternalIds.push(leave.internalId);
    });

    await Promise.all(destroyPromises);

    await RosterEntry.bulkCreate(entriesToCreate);

    return this.setState({ invalidInternalIds }, () => alert('Import finished'));
  };

  clearLeave = () => {
    const { leaveProjectIds } = this.state;
    if (!leaveProjectIds.length) return null;

    return this.props.$models.RosterEntry.destroy({
      where: {
        project_id: {
          $in: leaveProjectIds,
        },
        date: {
          $gte: moment().format(bappoFormat),
        },
      },
    }).then(res => alert(`${res} roster entries were removed`));
  };

  renderInvalidIds = () => {
    const { invalidInternalIds } = this.state;
    if (!invalidInternalIds.length) return null;

    return (
      <IdContainer>
        <div>Can't find the following consultants with external id:</div>
        {invalidInternalIds.map(id => <div>{id}</div>)}
      </IdContainer>
    );
  };

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div style={{ margin: 30 }}>
          {error}
          <button
            style={{ marginLeft: 30 }}
            onClick={() => this.setState({ error: null, invalidInternalIds: [] })}
          >
            Go back
          </button>
        </div>
      );
    }

    return (
      <Container>
        <SubContainer>
          <Heading>Upload leave records:</Heading>
          <FileUploader
            onUpload={file => {
              Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: res => {
                  if (res.errors.length > 0) this.setState({ error: res.errors[0] });
                  else this.processCsv(res);
                },
              });
            }}
          />
          {this.renderInvalidIds()}
        </SubContainer>
        <SubContainer>
          <Heading>Delete leave records beyond today:</Heading>
          <Button onClick={this.clearLeave}>X</Button>
        </SubContainer>
      </Container>
    );
  }
}

export default LeaveManager;

const Container = styled.div`
  flex: 1;
  display: flex;
  justify-content: space-evenly;
  align-items: center;
`;

const SubContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Heading = styled.div`
  font-size: 18px;
  margin: 20px 0;
`;

const IdContainer = styled.div`
  display: flex;
  flex-direction: column;
`;
