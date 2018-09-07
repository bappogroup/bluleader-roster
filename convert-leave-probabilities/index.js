import React from "react";
import { View, TouchableView, Text } from "bappo-components";

const ConvertLeaves = ({ $models }) => {
  const convertLeaves = async () => {
    const naProjects = await $models.Project.findAll({
      where: {
        projectType: {
          $in: ["4", "5", "6", "7"]
        }
      }
    });

    const naProjectIds = naProjects.map(p => p.id);
    const leaveEntries = await $models.RosterEntry.findAll({
      where: {
        project_id: {
          $in: naProjectIds
        }
      }
    });

    console.log(leaveEntries);
    // NA id: 26 for bluleader, 6 for dev
    const convertedEntries = leaveEntries.map(e => ({
      id: e.id,
      probability_id: 26
    }));
    await $models.RosterEntry.bulkUpdate(convertedEntries);

    alert("Finished");
  };

  return (
    <View>
      <TouchableView onPress={convertLeaves}>
        <Text>Convert Leaves</Text>
      </TouchableView>
    </View>
  );
};

export default ConvertLeaves;
