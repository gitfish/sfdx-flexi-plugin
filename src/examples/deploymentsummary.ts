/* eslint-disable @typescript-eslint/no-explicit-any */
import { SfdxRunContext } from '../types';

export interface DeploymentSummaryArgs {
  limit: number | string;
}

export default async (context: SfdxRunContext<DeploymentSummaryArgs>): Promise<void> => {
  const { ux, org, args } = context;
  const conn = org.getConnection();
  const r = await conn.tooling.query(
    `select Id, CreatedDate, CreatedBy.Name, StartDate, CompletedDate, Status, StateDetail, CheckOnly, NumberComponentsTotal, NumberComponentErrors, NumberComponentsDeployed, NumberTestsTotal, NumberTestsCompleted, NumberTestErrors, ErrorMessage from DeployRequest ORDER BY CreatedDate desc NULLS LAST limit ${
      args.limit || 10
    }`
  );
  
  ux.table(r.records, {
    columns: [
      { key: 'Id', label: 'ID' },
      {
        key: 'Created',
        label: 'Created',
        get(row: any) {
          return `${new Date(Date.parse(row.CreatedDate)).toLocaleString()} by ${
            row.CreatedBy.Name
          }`;
        },
      },
      {
        key: 'StartDate',
        label: 'Start Date',
        get(row: any) {
          if (row.StartDate) {
            return new Date(Date.parse(row.StartDate)).toLocaleString();
          }
          return '';
        },
      },
      {
        key: 'CompletedDate',
        label: 'Completed Date',
        get(row: any) {
          if (row.CompletedDate) {
            return new Date(Date.parse(row.CompletedDate)).toLocaleString();
          }
          return '';
        },
      },
      { key: 'CheckOnly', label: 'Check Only' },
      { key: 'Status', label: 'Status' },
      {
        key: 'Components',
        label: 'Components',
        get(row: any) {
          if (row.NumberComponentsTotal) {
            if (row.NumberComponentsDeployed === row.NumberComponentsTotal) {
              return `${row.NumberComponentsTotal}`;
            }
            return `${row.NumberComponentsDeployed} / ${row.NumberComponentsTotal}`;
          }
          return '';
        },
      },
      {
        key: 'Tests',
        label: 'Tests',
        get(row: any) {
          if (row.NumberTestsTotal) {
            if (row.NumberTestsCompleted === row.NumberTestsTotal) {
              return `${row.NumberTestsTotal}`;
            }
            return `${row.NumberTestsCompleted} / ${row.NumberTestsTotal}`;
          }
          return '';
        },
      },
      { key: 'ErrorMessage', label: 'Error Message' },
    ],
  });
};
