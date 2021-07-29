/* eslint-disable @typescript-eslint/no-explicit-any */
import { SfdxContext } from "../types";

export default async (context: SfdxContext): Promise<void> => {
  const { ux, org, varargs } = context;
  const conn = org.getConnection();
  const r = await conn.tooling.query(
    `select Id, CreatedDate, CreatedBy.Name, StartDate, CompletedDate, Status, StateDetail, CheckOnly, NumberComponentsTotal, NumberComponentErrors, NumberComponentsDeployed, NumberTestsTotal, NumberTestsCompleted, NumberTestErrors, ErrorMessage from DeployRequest ORDER BY CreatedDate desc NULLS LAST limit ${varargs.limit || 10
    }`
  );
  /**
   * NOTE: At the time of writing: the get implementation on column has to cast any due
   * to type definition issue in cli-ux 4.9.3. Hopefully sf command
   * can update the dependency soon-ish
   */
  ux.table(r.records, {
    columns: [
      { key: "Id", label: "ID" },
      {
        key: "Created",
        label: "Created",
        get(row) {
          const r = <any>row;
          return `${new Date(
            Date.parse(r.CreatedDate)
          ).toLocaleString()} by ${r.CreatedBy.Name}`;
        },
      },
      {
        key: "StartDate",
        label: "Start Date",
        get(row) {
          const r = <any>row;
          if (r.StartDate) {
            return new Date(Date.parse(r.StartDate)).toLocaleString();
          }
          return "";
        },
      },
      {
        key: "CompletedDate",
        label: "Completed Date",
        get(row) {
          const r = <any>row;
          if (r.CompletedDate) {
            return new Date(Date.parse(r.CompletedDate)).toLocaleString();
          }
          return "";
        },
      },
      { key: "CheckOnly", label: "Check Only" },
      { key: "Status", label: "Status" },
      {
        key: "Components",
        label: "Components",
        get(row) {
          const r = <any>row;
          if (r.NumberComponentsTotal) {
            if (r.NumberComponentsDeployed === r.NumberComponentsTotal) {
              return `${r.NumberComponentsTotal}`;
            }
            return `${r.NumberComponentsDeployed} / ${r.NumberComponentsTotal}`;
          }
          return "";
        },
      },
      {
        key: "Tests",
        label: "Tests",
        get(row) {
          const r = <any>row;
          if (r.NumberTestsTotal) {
            if (r.NumberTestsCompleted === r.NumberTestsTotal) {
              return `${r.NumberTestsTotal}`;
            }
            return `${r.NumberTestsCompleted} / ${r.NumberTestsTotal}`;
          }
          return "";
        },
      },
      { key: "ErrorMessage", label: "Error Message" },
    ],
  });
};
