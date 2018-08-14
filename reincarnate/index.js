import React from "react";
import { View, TouchableView, Text } from "bappo-components";

const Reincarnate = ({ $models }) => {
  const cleanTransactionData = () => {
    const promises = [
      $models.ForecastEntry.destroy({ where: {} }),
      $models.Company.destroy({ where: {} }),
      $models.CostCenter.destroy({ where: {} }),
      $models.ProfitCentre.destroy({ where: {} }),
      $models.Customer.destroy({ where: {} }),
      $models.ProjectForecastEntry.destroy({ where: {} }),
      $models.RosterEntry.destroy({ where: {} }),
      $models.UserPreference.destroy({ where: {} }),
      $models.Consultant.destroy({ where: {} }),
      $models.ProjectAssignment.destroy({ where: {} }),
      $models.RosterChange.destroy({ where: {} }),
      $models.Project.destroy({ where: {} }),
      $models.Skill.destroy({ where: {} }),
      $models.Manager.destroy({ where: {} }),
      $models.ManagerAssignment.destroy({ where: {} })
    ];

    return Promise.all(promises).then(() => alert && alert("Finished"));
  };

  return (
    <View>
      <TouchableView onPress={cleanTransactionData}>
        <Text>Reincarnate</Text>
      </TouchableView>
    </View>
  );
};

export default Reincarnate;
