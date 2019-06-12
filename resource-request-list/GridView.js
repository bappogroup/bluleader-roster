import React, { useState, useMemo } from "react";
import moment from "moment";
import { AutoSizer, MultiGrid } from "react-virtualized";
import {
  styled,
  View,
  TouchableView,
  Text,
  Dropdown,
  Icon
} from "bappo-components";

const DATE_FORMAT = "YYYY-MM-DD";

/**
 * Return a list of appended date object, to be used as the first row
 * @param {momentObj} startDate
 * @param {momentObj} endDate
 */
function getDateRow(startDate, endDate) {
  const datesToArray = (from, to) => {
    const list = [];
    let day = moment(from).clone();

    do {
      list.push(day);
      day = day.clone().add(1, "d");
    } while (day <= moment(to));
    return list;
  };
  const dateRow = datesToArray(startDate, endDate).map((date, index) => {
    let labelFormat = "DD";
    if (date.day() === 1 || index === 0) labelFormat = "MMM DD";

    return {
      formattedDate: date.format(labelFormat),
      dbDate: date.format(DATE_FORMAT),
      weekday: date.format("ddd"),
      isWeekend: date.day() === 6 || date.day() === 0
    };
  });
  dateRow.unshift("");
  return dateRow;
}

function GridView({
  $global,
  $popup,
  $models,
  requests,
  durationInWeeks = 52,
  openChat,
  canManageResourceRequests,
  showMenuButton,
  handleSetRequestStatus,
  showRosterForm,
  probabilityMap
}) {
  const [expandedRequestIds, setExpandedRequestIds] = useState([]);
  const currentUser = $global.currentUser;

  /**
   * Handle when the admin clicks on "Approve and Update Roster"
   */
  const handleApproveAndUpdateRoster = async (request, version) => {
    const existingAssignment = await $models.ProjectAssignment.findOne({
      where: {
        project_id: version.project_id,
        consultant_id: version.consultant_id
      }
    });

    // Show preview and allow submission
    const showPreview = () =>
      showRosterForm({
        title: "Review",
        step: 2,
        afterSubmit: () => handleSetRequestStatus("2", request.id),
        request
      });

    if (!existingAssignment) {
      // If the Project Assignment doesn't exist, prompt for creation first
      $popup.form({
        title: "New Assignment",
        formKey: "ProjectAssignmentForm",
        initialValues: {
          project_id: version.project_id,
          consultant_id: version.consultant_id
        },
        onSubmit: async assignment => {
          await $models.ProjectAssignment.create(assignment);
          showPreview();
        }
      });
    } else {
      // Assignment exists - go to preview screen
      showPreview();
    }
  };

  // Process passed requests when mounted
  const dict = useMemo(() => {
    const _dict = {};
    requests.forEach(request => {
      request.versions.forEach(version => {
        const dateArr = version.includedDates.split(", ");
        dateArr.forEach(date => {
          const key = `${version.id}.${date}`; // Key example: 123123.2019-03-03
          _dict[key] = version.project
            ? version.project.name.slice(0, 3)
            : "Deleted Project";
        });
      });
    });
    return _dict;
  }, [requests]);

  // Calculate displayed versions
  let versions = [];
  requests.forEach(request => {
    if (expandedRequestIds.includes(request.id)) {
      // Sort versions: in each request, the current version is at first, then the other versions
      const sortedVersions = [];
      const currentVersion = request.versions.find(v => v.isCurrentVersion);
      sortedVersions.push(currentVersion);
      request.versions.forEach(
        v => !v.isCurrentVersion && sortedVersions.push(v)
      );

      versions = versions.concat(sortedVersions);
    } else {
      const currentVersion = request.versions.find(v => v.isCurrentVersion);
      versions.push(currentVersion);
    }
  });

  // Dimensions
  const CELL_DIMENSION = 45;
  const FIRST_COLUMN_WIDTH = 200;

  let gridRef;
  const dateRow = getDateRow(moment(), moment().add(durationInWeeks, "weeks"));

  const cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
    let backgroundColor = "#f8f8f8";
    const date = dateRow[columnIndex];

    if (rowIndex === 0) {
      // Date row
      let color = "black";
      if (date.isWeekend) color = "lightgrey";
      return (
        <DateCell key={key} style={style} color={color}>
          <SmallText>{date.weekday}</SmallText>
          <SmallText>{date.formattedDate}</SmallText>
        </DateCell>
      );
    }

    const version = versions[rowIndex - 1];

    if (columnIndex === 0) {
      // Request name column
      const versionProps = {
        key,
        style
      };

      let projectLabel = "";
      if (version.project) {
        const { name } = version.project;
        projectLabel = name.length > 10 ? `${name.slice(0, 10)}...` : name;
      }

      const cellText = `${version.requestedBy.name} requested ${
        version.consultant.name
      } on ${projectLabel}`;

      // Current Version
      if (version.isCurrentVersion) {
        const request = requests.find(r => r.id === version.request_id);
        const { _conversations } = request;
        const iconColor =
          _conversations && _conversations.length > 0 ? "dodgerblue" : "gray";

        // Actions on dropdown button
        const normalActions = [
          {
            label: "New Version",
            onPress: () =>
              showRosterForm({
                title: "New Version",
                preventDefaultSubmit: true,
                request
              })
          },
          {
            label: "Show Previous Versions",
            onPress: () => {
              // Expand or collapse a request
              if (expandedRequestIds.includes(version.request_id)) {
                const newIds = expandedRequestIds.filter(
                  id => id !== version.request_id
                );
                setExpandedRequestIds(newIds);
              } else {
                setExpandedRequestIds([
                  ...expandedRequestIds,
                  version.request_id
                ]);
              }
            }
          }
        ];

        const ownActions = [
          {
            label: "Cancel",
            onPress: () => handleSetRequestStatus("4", request.id)
          }
        ];

        const managerActions = [
          {
            label: "Approve and Update Roster",
            onPress: () => handleApproveAndUpdateRoster(request, version)
          },
          {
            label: "Approve",
            onPress: () => handleSetRequestStatus("2", request.id)
          },
          {
            label: "Reject",
            onPress: () => handleSetRequestStatus("3", request.id)
          }
        ];

        // Determine allowed actions
        let actions = normalActions;
        if (canManageResourceRequests) actions = actions.concat(managerActions);
        if (version.requestedBy_id === currentUser.id)
          actions = actions.concat(ownActions);

        return (
          <CurrentVersionCell {...versionProps}>
            <TouchableView
              style={{ flexShrink: 1 }}
              onPress={() => {
                // display a read-only miniview of current version
                showRosterForm({
                  title:
                    "Current Version and the Consultant's Existing Schedule",
                  step: 2,
                  afterSubmit: () => handleSetRequestStatus("2", request.id),
                  request,
                  readOnly: true
                });
              }}
            >
              <FittedText>{cellText}</FittedText>
            </TouchableView>
            <FunctionButtonsContainer>
              {showMenuButton && (
                <Dropdown actions={actions} icon="more-horiz" />
              )}
              <TouchableView onPress={() => openChat(request.id)}>
                <Icon name="chat" color={iconColor} />
              </TouchableView>
            </FunctionButtonsContainer>
          </CurrentVersionCell>
        );
      }

      // Previous Version
      return (
        <PreviousVersionCell {...versionProps}>
          <FittedText style={{ fontSize: 12 }}>{cellText}</FittedText>
          <SmallText>(Version {version.versionNumber})</SmallText>
        </PreviousVersionCell>
      );
    }

    // Entry cells
    const dictKey = `${version.id}.${date.dbDate}`;
    const entryLabel = dict[dictKey];
    const probability = probabilityMap.get(version.probability_id);
    if (entryLabel && probability.backgroundColor) {
      backgroundColor = probability.backgroundColor;
    } else if (date.isWeekend) {
      backgroundColor = "white";
    }

    return (
      <EntryCell key={key} style={style} backgroundColor={backgroundColor}>
        <FittedText>{entryLabel}</FittedText>
      </EntryCell>
    );
  };

  const columnWidthGetter = ({ index }) =>
    index === 0 ? FIRST_COLUMN_WIDTH : CELL_DIMENSION;

  return (
    <Container>
      <AutoSizer>
        {({ height, width }) => (
          <MultiGrid
            width={width}
            height={height}
            fixedColumnCount={1}
            fixedRowCount={1}
            cellRenderer={cellRenderer}
            columnCount={dateRow.length}
            columnWidth={columnWidthGetter}
            rowCount={versions.length + 1}
            rowHeight={CELL_DIMENSION}
            ref={ref => (gridRef = ref)}
          />
        )}
      </AutoSizer>
    </Container>
  );
}

export default GridView;

const Container = styled(View)`
  flex: 1;
`;

const baseStyle = `
  margin-left: 2px;
  margin-right: 2px;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  font-size: 12px;
`;

const DateCell = styled(View)`
  ${baseStyle}
`;

const SmallText = styled(Text)`
  font-size: 12px;
  color: gray;
`;

const CurrentVersionCell = styled(View)`
  ${baseStyle}
  flex-direction: row;
  border-bottom: 1px solid #eee;
`;

const FunctionButtonsContainer = styled(View)`
  flex-direction: row;
`;

const PreviousVersionCell = styled(View)`
  ${baseStyle}
  align-items: flex-start;
  padding-left: 16px;
`;

const EntryCell = styled(View)`
  ${baseStyle} background-color: ${props => props.backgroundColor};

  border: 1px solid #eee;

  ${props => (props.blur ? "filter: blur(3px); opacity: 0.5;" : "")};
`;

const FittedText = styled(Text)`
  font-size: 100%;
`;
