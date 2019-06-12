import React, { useState } from "react";
import fileDownload from "js-file-download";
import { styled, View, Modal, Button, Text, Separator } from "bappo-components";
import moment from "moment";

const _table_ = document.createElement("table"),
  _tr_ = document.createElement("tr"),
  _th_ = document.createElement("th"),
  _td_ = document.createElement("td");

// Builds the HTML Table out of myList json data
function buildHtmlTable(header, data) {
  const table = _table_.cloneNode(false),
    columns = addAllColumnHeaders(header, table);

  for (let i = 0, maxi = data.length; i < maxi; ++i) {
    const tr = _tr_.cloneNode(false);
    for (let j = 0, maxj = columns.length; j < maxj; ++j) {
      const td = _td_.cloneNode(false);
      const entry = data[i][columns[j]];
      const date = header[j];

      td.style.padding = "8px";
      td.style.fontSize = "14px";

      if (j === 0) {
        // Consultant name cells
        td.style.minWidth = "160px";
      } else {
        // Roster entry cells - add border
        td.style.border = "1px solid #eee";
        td.style.minWidth = "40px";
      }

      if (entry) {
        td.style.backgroundColor = entry.backgroundColor;
      } else if (date.isWeekend) {
        td.style.backgroundColor = "white";
      }

      td.appendChild(document.createTextNode(entry ? entry.text : ""));
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  // Styles
  table.style.backgroundColor = "#f8f8f8";
  table.style.borderSpacing = 0;
  return table;
}

// Adds a header row to the table and returns the set of columns.
// Need to do union of keys from all records as some records may not contain
// all keys
function addAllColumnHeaders(header, table) {
  const columnSet = [],
    tr = _tr_.cloneNode(false);
  const monthAppeared = {};

  for (let i = 0, l = header.length; i < l; i++) {
    const { text, isWeekend } = header[i];

    columnSet.push(text);

    let headerText = "";
    const [month, day] = text.split(" ");
    if (!monthAppeared[month]) {
      headerText = text;
      monthAppeared[month] = true;
    } else {
      headerText = day;
    }

    const th = _th_.cloneNode(false);
    if (i === 0) th.style.minWidth = "160px";
    th.style.padding = "8px";
    th.style.fontSize = "14px";
    th.style.fontWeight = "normal";
    th.style.color = isWeekend ? "lightgrey" : "black";
    th.appendChild(document.createTextNode(headerText));
    tr.appendChild(th);
  }
  table.appendChild(tr);
  return columnSet;
}

function JsonToHtml({
  entryList,
  onRequestClose,
  getProjectLabelById,
  probabilityMap,
  showBackgroundColor = true
}) {
  if (!entryList) return "EntryList is required.";

  const [copyStatus, setCopyStatus] = useState(false);

  const header = [
    {
      text: ""
    }
  ];

  entryList[0].forEach(({ date, isWeekend }) => {
    if (!date) return;

    const formattedDate = date.format("MMM D");
    header.push({
      text: formattedDate,
      isWeekend
    });
  });

  const data = entryList.slice(1).map(row => {
    const result = {
      "": {
        text: row[0].name
      }
    };
    row.slice(1).forEach(entry => {
      const date = moment(entry.date);
      const formattedDate = date.format("MMM D");

      result[formattedDate] = {
        text: getProjectLabelById(entry.project_id)
      };

      if (showBackgroundColor) {
        // Get cell background color based on probability
        const probability = probabilityMap[entry.probability_id];
        const backgroundColor = probability
          ? probability.backgroundColor
          : "#f8f8f8";
        result[formattedDate].backgroundColor = backgroundColor;
      }
    });

    return result;
  });

  const __html = buildHtmlTable(header, data).outerHTML;

  return (
    <Modal visible onRequestClose={onRequestClose}>
      <Container>
        <Title>Share Roster Data as HTML</Title>
        <Separator style={{ marginBottom: 0 }} />
        <div
          dangerouslySetInnerHTML={{ __html }}
          style={{
            overflow: "auto",
            flex: 1,
            width: "100%",
            alignSelf: "flex-start"
          }}
        />
        <Separator style={{ marginTop: 0 }} />
        <ButtonGroup>
          {copyStatus && <Text>Copied!</Text>}
          <StyledButton
            style={{ marginLeft: 16 }}
            text="Copy to Clipboard"
            type="secondary"
            onPress={() => {
              function listener(e) {
                e.clipboardData.setData("text/html", __html);
                e.clipboardData.setData("text/plain", __html);
                e.preventDefault();
              }
              document.addEventListener("copy", listener);
              document.execCommand("copy");
              document.removeEventListener("copy", listener);
              setCopyStatus(true);
            }}
          />
          <StyledButton
            text="Download"
            type="secondary"
            onPress={() => fileDownload(__html, "table.html")}
          />
        </ButtonGroup>
      </Container>
    </Modal>
  );
}

export default JsonToHtml;

const Container = styled(View)`
  justify-content: center;
`;

const Title = styled(Text)`
  font-size: 16px;
  margin: 16px;
  align-self: center;
`;

const StyledButton = styled(Button)`
  margin-right: 16px;
`;

const ButtonGroup = styled(View)`
  margin: 16px;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
`;
