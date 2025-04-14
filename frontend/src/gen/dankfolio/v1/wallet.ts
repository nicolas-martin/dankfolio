/* eslint-disable */
import type { CallContext, CallOptions } from "nice-grpc-common";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "dankfolio.v1";

/** Balance represents information about a token balance */
export interface Balance {
  /** Token mint address or identifier */
  id: string;
  /** Token amount */
  amount: number;
}

/** WalletBalance represents a wallet's complete balance */
export interface WalletBalance {
  /** List of token balances */
  balances: Balance[];
}

/** GetWalletBalancesRequest is the request for GetWalletBalances */
export interface GetWalletBalancesRequest {
  /** Solana wallet address */
  address: string;
}

/** GetWalletBalancesResponse is the response for GetWalletBalances */
export interface GetWalletBalancesResponse {
  walletBalance: WalletBalance | undefined;
}

/** CreateWalletRequest is the request for CreateWallet */
export interface CreateWalletRequest {
}

/** CreateWalletResponse is the response for CreateWallet */
export interface CreateWalletResponse {
  /** Wallet's public key */
  publicKey: string;
  /** Wallet's private key (handle with care) */
  secretKey: string;
}

function createBaseBalance(): Balance {
  return { id: "", amount: 0 };
}

export const Balance = {
  encode(message: Balance, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.amount !== 0) {
      writer.uint32(17).double(message.amount);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Balance {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBalance();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
        case 2:
          if (tag !== 17) {
            break;
          }

          message.amount = reader.double();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Balance {
    return { id: isSet(object.id) ? String(object.id) : "", amount: isSet(object.amount) ? Number(object.amount) : 0 };
  },

  toJSON(message: Balance): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    if (message.amount !== 0) {
      obj.amount = message.amount;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Balance>, I>>(base?: I): Balance {
    return Balance.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Balance>, I>>(object: I): Balance {
    const message = createBaseBalance();
    message.id = object.id ?? "";
    message.amount = object.amount ?? 0;
    return message;
  },
};

function createBaseWalletBalance(): WalletBalance {
  return { balances: [] };
}

export const WalletBalance = {
  encode(message: WalletBalance, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.balances) {
      Balance.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): WalletBalance {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseWalletBalance();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.balances.push(Balance.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): WalletBalance {
    return { balances: Array.isArray(object?.balances) ? object.balances.map((e: any) => Balance.fromJSON(e)) : [] };
  },

  toJSON(message: WalletBalance): unknown {
    const obj: any = {};
    if (message.balances?.length) {
      obj.balances = message.balances.map((e) => Balance.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<WalletBalance>, I>>(base?: I): WalletBalance {
    return WalletBalance.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<WalletBalance>, I>>(object: I): WalletBalance {
    const message = createBaseWalletBalance();
    message.balances = object.balances?.map((e) => Balance.fromPartial(e)) || [];
    return message;
  },
};

function createBaseGetWalletBalancesRequest(): GetWalletBalancesRequest {
  return { address: "" };
}

export const GetWalletBalancesRequest = {
  encode(message: GetWalletBalancesRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.address !== "") {
      writer.uint32(10).string(message.address);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetWalletBalancesRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetWalletBalancesRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.address = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetWalletBalancesRequest {
    return { address: isSet(object.address) ? String(object.address) : "" };
  },

  toJSON(message: GetWalletBalancesRequest): unknown {
    const obj: any = {};
    if (message.address !== "") {
      obj.address = message.address;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetWalletBalancesRequest>, I>>(base?: I): GetWalletBalancesRequest {
    return GetWalletBalancesRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetWalletBalancesRequest>, I>>(object: I): GetWalletBalancesRequest {
    const message = createBaseGetWalletBalancesRequest();
    message.address = object.address ?? "";
    return message;
  },
};

function createBaseGetWalletBalancesResponse(): GetWalletBalancesResponse {
  return { walletBalance: undefined };
}

export const GetWalletBalancesResponse = {
  encode(message: GetWalletBalancesResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.walletBalance !== undefined) {
      WalletBalance.encode(message.walletBalance, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetWalletBalancesResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetWalletBalancesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.walletBalance = WalletBalance.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetWalletBalancesResponse {
    return { walletBalance: isSet(object.walletBalance) ? WalletBalance.fromJSON(object.walletBalance) : undefined };
  },

  toJSON(message: GetWalletBalancesResponse): unknown {
    const obj: any = {};
    if (message.walletBalance !== undefined) {
      obj.walletBalance = WalletBalance.toJSON(message.walletBalance);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetWalletBalancesResponse>, I>>(base?: I): GetWalletBalancesResponse {
    return GetWalletBalancesResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetWalletBalancesResponse>, I>>(object: I): GetWalletBalancesResponse {
    const message = createBaseGetWalletBalancesResponse();
    message.walletBalance = (object.walletBalance !== undefined && object.walletBalance !== null)
      ? WalletBalance.fromPartial(object.walletBalance)
      : undefined;
    return message;
  },
};

function createBaseCreateWalletRequest(): CreateWalletRequest {
  return {};
}

export const CreateWalletRequest = {
  encode(_: CreateWalletRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CreateWalletRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCreateWalletRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(_: any): CreateWalletRequest {
    return {};
  },

  toJSON(_: CreateWalletRequest): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<CreateWalletRequest>, I>>(base?: I): CreateWalletRequest {
    return CreateWalletRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<CreateWalletRequest>, I>>(_: I): CreateWalletRequest {
    const message = createBaseCreateWalletRequest();
    return message;
  },
};

function createBaseCreateWalletResponse(): CreateWalletResponse {
  return { publicKey: "", secretKey: "" };
}

export const CreateWalletResponse = {
  encode(message: CreateWalletResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.publicKey !== "") {
      writer.uint32(10).string(message.publicKey);
    }
    if (message.secretKey !== "") {
      writer.uint32(18).string(message.secretKey);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CreateWalletResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCreateWalletResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.publicKey = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.secretKey = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): CreateWalletResponse {
    return {
      publicKey: isSet(object.publicKey) ? String(object.publicKey) : "",
      secretKey: isSet(object.secretKey) ? String(object.secretKey) : "",
    };
  },

  toJSON(message: CreateWalletResponse): unknown {
    const obj: any = {};
    if (message.publicKey !== "") {
      obj.publicKey = message.publicKey;
    }
    if (message.secretKey !== "") {
      obj.secretKey = message.secretKey;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<CreateWalletResponse>, I>>(base?: I): CreateWalletResponse {
    return CreateWalletResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<CreateWalletResponse>, I>>(object: I): CreateWalletResponse {
    const message = createBaseCreateWalletResponse();
    message.publicKey = object.publicKey ?? "";
    message.secretKey = object.secretKey ?? "";
    return message;
  },
};

export interface WalletServiceImplementation<CallContextExt = {}> {
  /** GetWalletBalances returns the balances for all tokens in a wallet */
  getWalletBalances(
    request: GetWalletBalancesRequest,
    context: CallContext & CallContextExt,
  ): Promise<DeepPartial<GetWalletBalancesResponse>>;
  /** CreateWallet generates a new Solana wallet */
  createWallet(
    request: CreateWalletRequest,
    context: CallContext & CallContextExt,
  ): Promise<DeepPartial<CreateWalletResponse>>;
}

export interface WalletServiceClient<CallOptionsExt = {}> {
  /** GetWalletBalances returns the balances for all tokens in a wallet */
  getWalletBalances(
    request: DeepPartial<GetWalletBalancesRequest>,
    options?: CallOptions & CallOptionsExt,
  ): Promise<GetWalletBalancesResponse>;
  /** CreateWallet generates a new Solana wallet */
  createWallet(
    request: DeepPartial<CreateWalletRequest>,
    options?: CallOptions & CallOptionsExt,
  ): Promise<CreateWalletResponse>;
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
