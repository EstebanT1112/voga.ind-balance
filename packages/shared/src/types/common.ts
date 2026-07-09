export type UUID = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type MoneyAmount = number;

export interface TimestampFields {
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
