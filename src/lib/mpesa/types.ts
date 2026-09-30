export type StkPushInput = {
  phone: string;
  amountKes: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
};

export type StkPushResult = {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
};

export type StkQueryResult = {
  resultCode: string;
  resultDesc: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
};

export type StkCallbackItem = {
  Name: string;
  Value?: string | number;
};

export type StkCallback = {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: { Item: StkCallbackItem[] };
    };
  };
};

export type C2bConfirmation = {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber?: string;
  OrgAccountBalance?: string;
  ThirdPartyTransID?: string;
  MSISDN: string;
  FirstName?: string;
};

export interface MpesaProvider {
  name: "mock" | "daraja";
  stkPush(input: StkPushInput): Promise<StkPushResult>;
  queryStk(checkoutRequestId: string): Promise<StkQueryResult>;
}

export function metadataValue(items: StkCallbackItem[] | undefined, name: string): string | number | undefined {
  return items?.find((i) => i.Name === name)?.Value;
}
