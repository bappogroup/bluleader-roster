import React, { useState } from "react";
import fileDownload from "js-file-download";
import { styled, View, Modal, Button, Text, Separator } from "bappo-components";
import moment from "moment";

const _table_ = document.createElement("table"),
  _tr_ = document.createElement("tr"),
  _th_ = document.createElement("th"),
  _td_ = document.createElement("td");

// Builds the HTML Table out of myList json data
function buildHtmlTable(header, arr) {
  const table = _table_.cloneNode(false),
    columns = addAllColumnHeaders(header, table);

  for (let i = 0, maxi = arr.length; i < maxi; ++i) {
    const tr = _tr_.cloneNode(false);
    for (let j = 0, maxj = columns.length; j < maxj; ++j) {
      const td = _td_.cloneNode(false);
      td.style.padding = "8px";
      td.appendChild(document.createTextNode(arr[i][columns[j]] || ""));
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  // Add style
  table.style.textAlign = "left";
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
    columnSet.push(header[i]);

    let headerText = "";
    const [month, day] = header[i].split(" ");
    if (!monthAppeared[month]) {
      headerText = header[i];
      monthAppeared[month] = true;
    } else {
      headerText = day;
    }

    const th = _th_.cloneNode(false);
    th.style.padding = "8px";
    th.appendChild(document.createTextNode(headerText));
    tr.appendChild(th);
  }
  table.appendChild(tr);
  return columnSet;
}

function JsonToHtml({ entryList, onRequestClose, getProjectLabelById }) {
  if (!entryList) return "EntryList is required.";

  const [copyStatus, setCopyStatus] = useState(false);

  const header = ["Consultant"];

  entryList[0].forEach(({ date }) => {
    if (!date) return;

    const formattedDate = date.format("MMM D");
    header.push(formattedDate);
  });

  const data = entryList.slice(1).map(row => {
    const result = {
      Consultant: row[0].name
    };
    row.slice(1).forEach(entry => {
      const date = moment(entry.date);
      const formattedDate = date.format("MMM D");

      result[formattedDate] = getProjectLabelById(entry.project_id);
    });

    return result;
  });

  const __html = buildHtmlTable(header, data).outerHTML;

  return (
    <Modal visible onRequestClose={onRequestClose}>
      <Container>
        <Title>Share Roster Data as HTML</Title>
        <Separator />
        <div
          dangerouslySetInnerHTML={{ __html }}
          style={{
            overflow: "auto",
            flex: 1,
            width: "100%",
            alignSelf: "flex-start"
          }}
        />
        <Separator />
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
