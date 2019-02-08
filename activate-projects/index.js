import React from "react";
import { Button } from "bappo-components";

const Activate = ({ $models }) => {
  const activate = async () => {
    const projects = await $models.Project.findAll({
      where: {
        active: {
          $ne: "true"
        }
      }
    });
  };
  return <Button onPress={activate} text="Activate all" />;
};

export default Activate;
